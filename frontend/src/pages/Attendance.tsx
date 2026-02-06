import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  QrCode,
  Send,
  CheckCircle,
  Search,
  RefreshCw,
  Download,
  UserCheck,
  Mail,
  MessageSquare,
  FileText,
  Ticket,
  Calendar,
  MapPin,
  Undo2,
} from 'lucide-react';
import { attendanceAPI, AttendanceStats, AttendanceFilters } from '../services/api';
import type { Event, EventInvitee } from '../types';
import toast from 'react-hot-toast';
import { exportToExcel, exportToPDF, exportToCSV } from '../utils/exportHelpers';
import TablePagination from '../components/common/TablePagination';
import SortableColumnHeader, { applySorting, type SortDirection } from '../components/common/SortableColumnHeader';
import { formatDateEgypt, formatTimeEgypt } from '../utils/formatters';

export default function Attendance() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [attendees, setAttendees] = useState<EventInvitee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [activeTab, setActiveTab] = useState<'manage' | 'checkin'>('manage');
  
  // Filters
  const [filters, setFilters] = useState<AttendanceFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Modals
  const [showGenerateCodesModal, setShowGenerateCodesModal] = useState(false);
  const [showMarkSentModal, setShowMarkSentModal] = useState(false);
  const [codePrefix, setCodePrefix] = useState('');
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp' | 'physical' | 'sms'>('physical');
  
  // Check-in
  const [checkInCode, setCheckInCode] = useState('');
  const [checkInGuests, setCheckInGuests] = useState(0);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInResult, setCheckInResult] = useState<EventInvitee | null>(null);
  const [checkInError, setCheckInError] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const handleSort = (field: string) => {
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, []);

  // Load stats and attendees when event changes
  useEffect(() => {
    if (selectedEventId) {
      loadEventData();
    }
  }, [selectedEventId]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getEvents();
      setEvents(response.data.events || []);
      
      // Auto-select first event if available
      if (response.data.events?.length > 0 && !selectedEventId) {
        setSelectedEventId(response.data.events[0].id);
      }
    } catch (error) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadEventData = useCallback(async () => {
    if (!selectedEventId) return;
    
    try {
      setLoadingAttendees(true);
      const [statsRes, attendeesRes] = await Promise.all([
        attendanceAPI.getEventStats(selectedEventId),
        attendanceAPI.getEventAttendees(selectedEventId, filters),
      ]);
      
      setSelectedEvent(statsRes.data.event);
      setStats(statsRes.data.stats);
      setAttendees(attendeesRes.data.attendees || []);
    } catch (error) {
      toast.error('Failed to load event data');
    } finally {
      setLoadingAttendees(false);
    }
  }, [selectedEventId, filters]);

  // Apply filters with debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        setFilters(prev => ({ ...prev, search: searchQuery }));
      } else {
        setFilters(prev => {
          const { search, ...rest } = prev;
          return rest;
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reload when filters change
  useEffect(() => {
    if (selectedEventId) {
      loadEventData();
    }
  }, [filters, loadEventData]);

  const handleGenerateCodes = async () => {
    if (!selectedEventId) return;
    
    try {
      const response = await attendanceAPI.generateCodes(selectedEventId, codePrefix || undefined);
      if (response.data.success) {
        toast.success(`Generated ${response.data.generated} attendance codes`);
        setShowGenerateCodesModal(false);
        setCodePrefix('');
        loadEventData();
      }
    } catch (error) {
      toast.error('Failed to generate codes');
    }
  };

  const handleMarkSent = async () => {
    if (selectedIds.size === 0) {
      toast.error('No attendees selected');
      return;
    }
    
    try {
      const response = await attendanceAPI.markInvitationsSent(Array.from(selectedIds), sendMethod);
      if (response.data.success) {
        toast.success(`Marked ${response.data.updated} invitations as sent`);
        setShowMarkSentModal(false);
        setSelectedIds(new Set());
        loadEventData();
      }
    } catch (error) {
      toast.error('Failed to mark invitations as sent');
    }
  };

  const handleCheckIn = async () => {
    if (!checkInCode.trim()) {
      setCheckInError('Please enter an attendance code');
      return;
    }
    
    try {
      setCheckInError('');
      const response = await attendanceAPI.checkIn(checkInCode, checkInGuests, checkInNotes || undefined);
      
      if (response.data.success && response.data.attendee) {
        setCheckInResult(response.data.attendee);
        toast.success('Check-in successful!');
        setCheckInCode('');
        setCheckInGuests(0);
        setCheckInNotes('');
        loadEventData();
      } else {
        setCheckInError(response.data.error || 'Check-in failed');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setCheckInError(err.response?.data?.error || 'Check-in failed');
    }
  };

  const handleUndoCheckIn = async (inviteeId: number) => {
    try {
      await attendanceAPI.undoCheckIn(inviteeId);
      toast.success('Check-in undone');
      loadEventData();
    } catch (error) {
      toast.error('Failed to undo check-in');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedAttendees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedAttendees.map(a => a.id)));
    }
  };

  const handleSelectOne = (id: number) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  // Sort + Paginate
  const sortedAttendees = applySorting(attendees, sortField, sortDirection);
  const paginatedAttendees = sortedAttendees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Export functions
  const getExportData = () => {
    return attendees.map(a => ({
      'Name': a.invitee_name || '',
      'Code': a.attendance_code || '',
      'Category': a.category || '',
      'Inviter': a.inviter_name || '',
      'Group': a.inviter_group_name || '',
      'Phone': a.invitee_phone || '',
      'Email': a.invitee_email || '',
      'Invitation Sent': a.invitation_sent ? 'Yes' : 'No',
      'Sent Via': a.invitation_method || '',
      'Confirmed': a.attendance_confirmed === true ? 'Yes' : a.attendance_confirmed === false ? 'No' : 'Pending',
      'Confirmed Guests': a.confirmed_guests ?? '',
      'Checked In': a.checked_in ? 'Yes' : 'No',
      'Actual Guests': a.actual_guests || 0,
      'Plus One Allowed': a.plus_one || 0,
    }));
  };

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    const data = getExportData();
    const filename = `attendance_${selectedEvent?.name || 'export'}_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'excel') {
      exportToExcel(data, filename);
    } else if (format === 'pdf') {
      exportToPDF(data, filename, `Attendance - ${selectedEvent?.name || 'Event'}`);
    } else {
      exportToCSV(data, filename);
    }
  };

  const getStatusBadge = (attendee: EventInvitee) => {
    if (attendee.checked_in) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Checked In</span>;
    }
    if (attendee.attendance_confirmed === true) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Confirmed</span>;
    }
    if (attendee.attendance_confirmed === false) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Not Coming</span>;
    }
    if (attendee.invitation_sent) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Invited</span>;
    }
    if (attendee.attendance_code) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Code Ready</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Pending</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Attendance Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage invitations and check-ins for events</p>
        </div>
        
        {/* Event Selector */}
        <div className="flex items-center gap-3">
          <select
            value={selectedEventId || ''}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm"
          >
            <option value="">Select Event</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name} ({event.status})
              </option>
            ))}
          </select>
          <button
            onClick={loadEventData}
            className="p-2.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {selectedEventId && selectedEvent && (
        <>
          {/* Event Info Card */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">{selectedEvent.name}</h2>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/80">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDateEgypt(selectedEvent.start_date)}
                  </span>
                  {selectedEvent.venue && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {selectedEvent.venue}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGenerateCodesModal(true)}
                  className="px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl flex items-center gap-2 transition-all font-medium"
                >
                  <QrCode className="w-4 h-4" />
                  Generate Codes
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-md">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_approved}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Approved</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-md">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.codes_generated}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Codes Ready</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl text-white shadow-md">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.invitations_sent}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Invites Sent</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl text-white shadow-md">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.confirmed_coming}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Confirmed</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white shadow-md">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.checked_in}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Checked In</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white shadow-md">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.actual_total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Arrived</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manage'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Manage Invitations
              </button>
              <button
                onClick={() => setActiveTab('checkin')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'checkin'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <UserCheck className="w-4 h-4 inline mr-2" />
                Check-in Console
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by name, code, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 dark:text-white w-64"
                    />
                  </div>
                  
                  <select
                    value={filters.checked_in === undefined ? '' : filters.checked_in.toString()}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      checked_in: e.target.value === '' ? undefined : e.target.value === 'true'
                    }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">All Check-in Status</option>
                    <option value="true">Checked In</option>
                    <option value="false">Not Checked In</option>
                  </select>
                  
                  <select
                    value={filters.invitation_sent === undefined ? '' : filters.invitation_sent.toString()}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      invitation_sent: e.target.value === '' ? undefined : e.target.value === 'true'
                    }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">All Invitation Status</option>
                    <option value="true">Sent</option>
                    <option value="false">Not Sent</option>
                  </select>
                </div>
                
                <div className="flex gap-2">
                  {selectedIds.size > 0 && (
                    <button
                      onClick={() => setShowMarkSentModal(true)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Mark as Sent ({selectedIds.size})
                    </button>
                  )}
                  
                  <div className="relative group">
                    <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block z-10">
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Export to Excel
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Export to CSV
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Export to PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendees Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === paginatedAttendees.length && paginatedAttendees.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </th>
                        <SortableColumnHeader field="invitee_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Name</SortableColumnHeader>
                        <SortableColumnHeader field="attendance_code" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Code</SortableColumnHeader>
                        <SortableColumnHeader field="category" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Category</SortableColumnHeader>
                        <SortableColumnHeader field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Status</SortableColumnHeader>
                        <SortableColumnHeader field="plus_one" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Guests</SortableColumnHeader>
                        <SortableColumnHeader field="inviter_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Inviter</SortableColumnHeader>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {loadingAttendees ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center">
                            <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
                          </td>
                        </tr>
                      ) : paginatedAttendees.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            No attendees found
                          </td>
                        </tr>
                      ) : (
                        paginatedAttendees.map((attendee) => (
                          <tr key={attendee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(attendee.id)}
                                onChange={() => handleSelectOne(attendee.id)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{attendee.invitee_name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{attendee.invitee_phone}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {attendee.attendance_code ? (
                                <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono dark:text-gray-300">
                                  {attendee.attendance_code}
                                </code>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{attendee.category || '-'}</span>
                            </td>
                            <td className="px-4 py-3">
                              {getStatusBadge(attendee)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">
                                {attendee.checked_in ? attendee.actual_guests : attendee.confirmed_guests ?? attendee.plus_one}
                                {' / '}
                                {attendee.plus_one}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{attendee.inviter_name || '-'}</span>
                            </td>
                            <td className="px-4 py-3">
                              {attendee.checked_in && (
                                <button
                                  onClick={() => handleUndoCheckIn(attendee.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                                  title="Undo Check-in"
                                >
                                  <Undo2 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                <TablePagination
                  currentPage={currentPage}
                  totalItems={attendees.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                />
              </div>
            </div>
          )}

          {activeTab === 'checkin' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Check-in Form */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-primary" />
                  Check-in Attendee
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Attendance Code
                    </label>
                    <input
                      type="text"
                      value={checkInCode}
                      onChange={(e) => setCheckInCode(e.target.value.toUpperCase())}
                      placeholder="Enter code (e.g., EVT1-7X9K)"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 dark:text-white text-lg font-mono"
                      onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Guests Accompanying
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={checkInGuests}
                      onChange={(e) => setCheckInGuests(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={checkInNotes}
                      onChange={(e) => setCheckInNotes(e.target.value)}
                      placeholder="Any notes..."
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  
                  {checkInError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {checkInError}
                    </div>
                  )}
                  
                  <button
                    onClick={handleCheckIn}
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Check In
                  </button>
                </div>
              </div>
              
              {/* Recent Check-in Result */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  Last Check-in
                </h3>
                
                {checkInResult ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-800 font-semibold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Successfully Checked In!
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Name</span>
                        <span className="font-medium dark:text-white">{checkInResult.invitee_name}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Code</span>
                        <code className="font-mono bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">{checkInResult.attendance_code}</code>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Category</span>
                        <span className="font-medium dark:text-white">{checkInResult.category || '-'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500 dark:text-gray-400">Guests</span>
                        <span className="font-medium dark:text-white">{checkInResult.actual_guests}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-500 dark:text-gray-400">Checked In At</span>
                        <span className="font-medium dark:text-white">
                          {checkInResult.checked_in_at ? formatTimeEgypt(checkInResult.checked_in_at) : '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No recent check-ins</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!selectedEventId && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select an Event</h3>
          <p className="text-gray-500 dark:text-gray-400">Choose an event from the dropdown above to manage attendance</p>
        </div>
      )}

      {/* Generate Codes Modal */}
      {showGenerateCodesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Attendance Codes</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will generate unique codes for all approved invitees who don't have codes yet.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code Prefix (optional)
              </label>
              <input
                type="text"
                value={codePrefix}
                onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                placeholder="e.g., GALA24"
                maxLength={8}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Format: PREFIX-XXXX (e.g., GALA24-7X9K)
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowGenerateCodesModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateCodes}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Sent Modal */}
      {showMarkSentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mark Invitations as Sent</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Mark {selectedIds.size} invitation(s) as sent. Select the delivery method:
            </p>
            
            <div className="space-y-2 mb-4">
              {[
                { value: 'physical', label: 'Physical (Hand-delivered)', icon: FileText },
                { value: 'email', label: 'Email', icon: Mail },
                { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                { value: 'sms', label: 'SMS', icon: MessageSquare },
              ].map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${
                    sendMethod === value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="sendMethod"
                    value={value}
                    checked={sendMethod === value}
                    onChange={(e) => setSendMethod(e.target.value as typeof sendMethod)}
                    className="text-primary focus:ring-primary"
                  />
                  <Icon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowMarkSentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkSent}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
