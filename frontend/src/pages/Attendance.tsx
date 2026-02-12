import { useState, useEffect, useCallback, useRef } from 'react';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
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
  ExternalLink,
  Copy,
  Key,
  Printer,
  FileSpreadsheet,
  ChevronDown,
  XCircle,
  RotateCcw,
  MoreHorizontal,
  UserX,
  Eye,
  EyeOff,
} from 'lucide-react';
import { attendanceAPI, AttendanceStats, AttendanceFilters, settingsAPI, eventsAPI, CheckinPinInfo } from '../services/api';
import type { Event, EventInvitee } from '../types';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { exportToExcel, exportToPDF, exportToCSV } from '../utils/exportHelpers';
import TablePagination from '../components/common/TablePagination';
import SortableColumnHeader, { applySorting, type SortDirection } from '../components/common/SortableColumnHeader';
import { formatDateEgypt } from '../utils/formatters';

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [attendees, setAttendees] = useState<EventInvitee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  
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
  
  // Check-in PIN status bar
  const [checkinPinInfo, setCheckinPinInfo] = useState<CheckinPinInfo | null>(null);
  const [_loadingCheckinPin, setLoadingCheckinPin] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Dynamic logos from admin settings for exports
  const [exportLogoLeft, setExportLogoLeft] = useState<string | null>(null);
  const [exportLogoRight, setExportLogoRight] = useState<string | null>(null);
  const [exportLogosLoaded, setExportLogosLoaded] = useState(false);

  // Logo data for Excel exports
  const [logoImageData, setLogoImageData] = useState<string>('');

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Bulk actions dropdown
  const [showBulkActions, setShowBulkActions] = useState(false);
  const bulkActionsRef = useRef<HTMLDivElement>(null);


  // Show all events toggle (only active events shown by default)
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Row action menu
  const [activeRowMenu, setActiveRowMenu] = useState<number | null>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);
  const handleSort = (field: string) => {
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  // Load events on mount
  useEffect(() => {
    loadEvents();
    loadExportLogos();
    loadLogoData();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(e.target as Node)) {
        setShowBulkActions(false);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
        setActiveRowMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadLogoData = async () => {
    try {
      const { logoBase64 } = await import('../utils/logoData');
      setLogoImageData(logoBase64);
    } catch {
      setLogoImageData('');
    }
  };

  const loadExportLogos = async () => {
    try {
      const res = await settingsAPI.getExportSettings();
      const settings = res.data.settings || {};
      setExportLogoLeft(settings.logo_left?.value || null);
      setExportLogoRight(settings.logo_right?.value || null);
      setExportLogosLoaded(true);
    } catch {
      setExportLogosLoaded(true);
    }
  };

  // Load stats, attendees, and check-in PIN info when event changes
  useEffect(() => {
    if (selectedEventId) {
      loadEventData();
      loadCheckinPinInfo(selectedEventId);
    }
  }, [selectedEventId]);

  // Derived: split events into active (upcoming/ongoing) and inactive
  const activeStatuses = new Set(['upcoming', 'ongoing']);
  const activeEvents = events.filter(e => activeStatuses.has(e.status));
  const inactiveEvents = events.filter(e => !activeStatuses.has(e.status));

  // When toggling back to active-only, if the selected event is inactive, switch to first active
  useEffect(() => {
    if (!showAllEvents && selectedEventId) {
      const sel = events.find(e => e.id === selectedEventId);
      if (sel && !activeStatuses.has(sel.status)) {
        const firstActive = activeEvents[0];
        setSelectedEventId(firstActive ? firstActive.id : null);
      }
    }
  }, [showAllEvents]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getEvents();
      const allEvents: Event[] = response.data.events || [];
      setEvents(allEvents);
      
      // Auto-select first active event if available
      if (allEvents.length > 0 && !selectedEventId) {
        const firstActive = allEvents.find(e => e.status === 'upcoming' || e.status === 'ongoing');
        setSelectedEventId(firstActive ? firstActive.id : allEvents[0].id);
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

  const handleUndoCheckIn = async (inviteeId: number) => {
    try {
      await attendanceAPI.undoCheckIn(inviteeId);
      toast.success('Check-in undone');
      loadEventData();
    } catch (error) {
      toast.error('Failed to undo check-in');
    }
  };

  const showWarnings = (warnings?: string[] | null) => {
    if (warnings) {
      warnings.forEach(w => toast(w, { icon: '⚠️' }));
    }
  };

  const handleUndoMarkSent = async () => {
    if (selectedIds.size === 0) {
      toast.error('No attendees selected');
      return;
    }
    try {
      const response = await attendanceAPI.undoMarkSent(Array.from(selectedIds));
      if (response.data.success) {
        toast.success(`Undid "invitation sent" for ${response.data.updated} invitee(s)`);
        showWarnings(response.data.warnings);
        setSelectedIds(new Set());
        loadEventData();
      }
    } catch (error) {
      toast.error('Failed to undo invitation sent');
    }
    setShowBulkActions(false);
  };

  const handleConfirmAttendance = async (isComing: boolean) => {
    if (selectedIds.size === 0) {
      toast.error('No attendees selected');
      return;
    }
    try {
      const response = await attendanceAPI.confirmAttendance(Array.from(selectedIds), isComing);
      if (response.data.success) {
        toast.success(`Marked ${response.data.updated} as ${isComing ? 'confirmed coming' : 'not coming'}`);
        showWarnings(response.data.warnings);
        setSelectedIds(new Set());
        loadEventData();
      }
    } catch (error) {
      toast.error('Failed to confirm attendance');
    }
    setShowBulkActions(false);
  };

  const handleResetConfirmation = async () => {
    if (selectedIds.size === 0) {
      toast.error('No attendees selected');
      return;
    }
    try {
      const response = await attendanceAPI.resetConfirmation(Array.from(selectedIds));
      if (response.data.success) {
        toast.success(`Reset confirmation for ${response.data.updated} invitee(s)`);
        showWarnings(response.data.warnings);
        setSelectedIds(new Set());
        loadEventData();
      }
    } catch (error) {
      toast.error('Failed to reset confirmation');
    }
    setShowBulkActions(false);
  };

  // Single-row actions
  const handleSingleUndoMarkSent = async (id: number) => {
    try {
      const response = await attendanceAPI.undoMarkSent([id]);
      if (response.data.success) {
        toast.success('Invitation sent status undone');
        showWarnings(response.data.warnings);
        loadEventData();
      }
    } catch (error) {
      toast.error('Failed to undo');
    }
    setActiveRowMenu(null);
  };

  const handleSingleConfirmAttendance = async (id: number, isComing: boolean) => {
    try {
      const response = await attendanceAPI.confirmAttendance([id], isComing);
      if (response.data.success) {
        toast.success(isComing ? 'Marked as confirmed coming' : 'Marked as not coming');
        showWarnings(response.data.warnings);
        loadEventData();
      }
    } catch (error) {
      toast.error('Failed to update');
    }
    setActiveRowMenu(null);
  };

  const handleSingleResetConfirmation = async (id: number) => {
    try {
      const response = await attendanceAPI.resetConfirmation([id]);
      if (response.data.success) {
        toast.success('Confirmation reset to pending');
        showWarnings(response.data.warnings);
        loadEventData();
      }
    } catch (error) {
      toast.error('Failed to reset');
    }
    setActiveRowMenu(null);
  };

  // Check-in PIN status bar
  const loadCheckinPinInfo = async (eventId: number) => {
    setLoadingCheckinPin(true);
    setCheckinPinInfo(null);
    try {
      const response = await eventsAPI.getCheckinPin(eventId);
      setCheckinPinInfo(response.data);
    } catch {
      // No PIN exists or failed to load — that's ok
      setCheckinPinInfo(null);
    } finally {
      setLoadingCheckinPin(false);
    }
  };

  const handleToggleCheckinPin = async () => {
    if (!selectedEventId || !checkinPinInfo) return;
    try {
      const response = await eventsAPI.toggleCheckinPin(selectedEventId, !checkinPinInfo.active);
      setCheckinPinInfo({ ...checkinPinInfo, active: response.data.checkin_pin_active });
      toast.success(response.data.checkin_pin_active ? 'Check-in PIN activated' : 'Check-in PIN deactivated');
    } catch {
      toast.error('Failed to toggle check-in PIN');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
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
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }
    const filename = `attendance_${selectedEvent?.name || 'export'}_${new Date().toISOString().split('T')[0]}`;
    const title = `Attendance - ${selectedEvent?.name || 'Event'}`;
    
    const logoOptions = exportLogosLoaded
      ? { logoLeft: exportLogoLeft, logoRight: exportLogoRight }
      : undefined;

    try {
      if (format === 'excel') {
        exportToExcel(data, filename, title, logoImageData, logoOptions);
      } else if (format === 'pdf') {
        exportToPDF(data, filename, title, 'landscape', logoOptions);
      } else {
        exportToCSV(data, filename);
      }
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to export');
    }
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    const data = getExportData();
    if (data.length === 0) {
      toast.error('No data to print');
      return;
    }
    const title = `Attendance - ${selectedEvent?.name || 'Event'}`;
    const headers = Object.keys(data[0]);
    const tableRows = data.map((row, idx) =>
      `<tr style="${idx % 2 === 0 ? '' : 'background-color: #f9fafb;'}">
        ${headers.map(h => `<td>${(row as any)[h] ?? '—'}</td>`).join('')}
      </tr>`
    ).join('');

    const printLeftLogo = exportLogosLoaded && exportLogoLeft
      ? `<img src="${exportLogoLeft}" style="height:45px;max-width:130px;" />`
      : '';
    const printRightLogo = exportLogosLoaded && exportLogoRight
      ? `<img src="${exportLogoRight}" style="height:45px;max-width:130px;" />`
      : '';

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; margin: 0; }
              .print-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
              .print-header-center { text-align: center; flex: 1; }
              .print-header-center h1 { font-size: 22px; margin: 0 0 4px 0; color: #1f2937; }
              .print-header-center .meta { color: #6b7280; font-size: 11px; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; }
              th { background-color: #2980b9; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
              td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
              tr:hover { background-color: #f3f4f6; }
              .footer { margin-top: 20px; font-size: 10px; color: #9ca3af; text-align: center; }
              @media print {
                body { padding: 15px; }
                table { font-size: 10px; }
                th, td { padding: 6px; }
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              <div>${printLeftLogo}</div>
              <div class="print-header-center">
                <h1>${title}</h1>
                <div class="meta">Generated: ${new Date().toLocaleString()}</div>
              </div>
              <div>${printRightLogo}</div>
            </div>
            <table>
              <thead>
                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
            <div class="footer">Total Records: ${data.length}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
    setShowExportMenu(false);
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
    return <TableSkeleton rows={8} cols={6} />;
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
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <select
            value={selectedEventId || ''}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm min-w-[180px]"
          >
            <option value="">Select Event</option>
            {activeEvents.length > 0 && (
              <optgroup label="Active Events">
                {activeEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} — {event.status === 'ongoing' ? '● Live' : '◦ Upcoming'}
                  </option>
                ))}
              </optgroup>
            )}
            {showAllEvents && inactiveEvents.length > 0 && (
              <optgroup label="Past / Inactive">
                {inactiveEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} — {event.status}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            onClick={() => setShowAllEvents(prev => !prev)}
            className={`p-2.5 rounded-xl transition-colors border ${
              showAllEvents
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            title={showAllEvents ? 'Showing all events — click to show active only' : 'Show ended / inactive events'}
          >
            {showAllEvents ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
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
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
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
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
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
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
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
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
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
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
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
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
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

          {/* Check-in Status Bar */}
          {checkinPinInfo && (
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border ${
              checkinPinInfo.active
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center gap-3">
                <Key className={`w-5 h-5 ${checkinPinInfo.active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
                <div>
                  <span className={`text-sm font-medium ${checkinPinInfo.active ? 'text-green-700 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'}`}>
                    Check-in: {checkinPinInfo.active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    PIN: <code className="font-mono bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">{checkinPinInfo.pin}</code>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/checkin/${checkinPinInfo.code}`, 'Console URL')}
                  className="px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center gap-1.5"
                  title="Copy check-in console URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy URL
                </button>
                <a
                  href={`/checkin/${checkinPinInfo.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Console
                </a>
                <button
                  onClick={handleToggleCheckinPin}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 ${
                    checkinPinInfo.active
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                  }`}
                >
                  {checkinPinInfo.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          )}

          {/* Manage Invitations */}
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
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-800 dark:text-white w-full sm:w-64"
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
                  
                  <select
                    value={(filters as any).attendance_confirmed === undefined ? '' : (filters as any).attendance_confirmed}
                    onChange={(e) => setFilters(prev => {
                      const val = e.target.value;
                      if (val === '') {
                        const { attendance_confirmed, ...rest } = prev as any;
                        return rest;
                      }
                      return { ...prev, attendance_confirmed: val };
                    })}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">All Confirmation</option>
                    <option value="yes">Confirmed Coming</option>
                    <option value="no">Not Coming</option>
                    <option value="pending">Not Responded</option>
                  </select>
                </div>
                
                <div className="flex gap-2">
                  {selectedIds.size > 0 && (
                    <div className="relative" ref={bulkActionsRef}>
                      <button
                        onClick={() => setShowBulkActions(prev => !prev)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
                      >
                        Actions ({selectedIds.size})
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      {showBulkActions && (
                        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 py-1">
                          <button
                            onClick={() => { setShowMarkSentModal(true); setShowBulkActions(false); }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                          >
                            <Send className="w-4 h-4 text-blue-500" />
                            Mark as Sent
                          </button>
                          <button
                            onClick={handleUndoMarkSent}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                          >
                            <Undo2 className="w-4 h-4 text-orange-500" />
                            Undo Invitation Sent
                          </button>
                          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                          <button
                            onClick={() => handleConfirmAttendance(true)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                          >
                            <UserCheck className="w-4 h-4 text-green-500" />
                            Confirm Coming
                          </button>
                          <button
                            onClick={() => handleConfirmAttendance(false)}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                          >
                            <UserX className="w-4 h-4 text-red-500" />
                            Mark Not Coming
                          </button>
                          <button
                            onClick={handleResetConfirmation}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-500" />
                            Reset Confirmation
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="relative" ref={exportMenuRef}>
                    <button
                      onClick={() => setShowExportMenu(prev => !prev)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 py-1">
                        <button
                          onClick={() => handleExport('csv')}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                        <button
                          onClick={() => handleExport('excel')}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Excel
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                        >
                          <FileText className="w-4 h-4" />
                          PDF
                        </button>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                        <button
                          onClick={handlePrint}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendees Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === paginatedAttendees.length && paginatedAttendees.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </th>
                        <SortableColumnHeader field="invitee_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Name</SortableColumnHeader>
                        <SortableColumnHeader field="attendance_code" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden sm:table-cell">Code</SortableColumnHeader>
                        <SortableColumnHeader field="category" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden md:table-cell">Category</SortableColumnHeader>
                        <SortableColumnHeader field="status" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Status</SortableColumnHeader>
                        <SortableColumnHeader field="plus_one" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden md:table-cell">Guests</SortableColumnHeader>
                        <SortableColumnHeader field="inviter_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Inviter</SortableColumnHeader>
                        {isAdmin && (
                          <SortableColumnHeader field="inviter_group_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Group</SortableColumnHeader>
                        )}
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {loadingAttendees ? (
                        <tr>
                          <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center">
                            <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
                          </td>
                        </tr>
                      ) : paginatedAttendees.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 9 : 8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            No attendees found
                          </td>
                        </tr>
                      ) : (
                        paginatedAttendees.map((attendee) => (
                          <tr key={attendee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(attendee.id)}
                                onChange={() => handleSelectOne(attendee.id)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                              <div>
                                <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{attendee.invitee_name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{attendee.invitee_phone}</p>
                                {/* Mobile-only summary tags for hidden columns */}
                                <div className="flex flex-wrap gap-1 mt-0.5 sm:hidden">
                                  {attendee.category && <span className="text-[10px] px-1.5 py-0 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded">{attendee.category}</span>}
                                  {attendee.inviter_name && <span className="text-[10px] px-1.5 py-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{attendee.inviter_name}</span>}
                                  {isAdmin && attendee.inviter_group_name && <span className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">{attendee.inviter_group_name}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3">
                              {attendee.attendance_code ? (
                                <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs sm:text-sm font-mono dark:text-gray-300">
                                  {attendee.attendance_code}
                                </code>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{attendee.category || '-'}</span>
                            </td>
                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                              {getStatusBadge(attendee)}
                            </td>
                            <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3">
                              <span className="text-xs sm:text-sm">
                                {attendee.checked_in ? attendee.actual_guests : attendee.confirmed_guests ?? attendee.plus_one}
                                {' / '}
                                {attendee.plus_one}
                              </span>
                            </td>
                            <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3">
                              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{attendee.inviter_name || '-'}</span>
                            </td>
                            {isAdmin && (
                              <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3">
                                {attendee.inviter_group_name ? (
                                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">{attendee.inviter_group_name}</span>
                                ) : <span className="text-xs text-gray-400">-</span>}
                              </td>
                            )}
                            <td className="px-2 sm:px-4 py-2 sm:py-3">
                              <div className="relative" ref={activeRowMenu === attendee.id ? rowMenuRef : undefined}>
                                <button
                                  onClick={() => setActiveRowMenu(activeRowMenu === attendee.id ? null : attendee.id)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  title="Actions"
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {activeRowMenu === attendee.id && (
                                  <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-30 py-1">
                                    {/* Invitation actions */}
                                    {!attendee.invitation_sent && attendee.attendance_code && (
                                      <button
                                        onClick={() => { setSelectedIds(new Set([attendee.id])); setShowMarkSentModal(true); setActiveRowMenu(null); }}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                                      >
                                        <Send className="w-4 h-4 text-blue-500" />
                                        Mark as Sent
                                      </button>
                                    )}
                                    {attendee.invitation_sent && !attendee.attendance_confirmed && !attendee.checked_in && (
                                      <button
                                        onClick={() => handleSingleUndoMarkSent(attendee.id)}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                                      >
                                        <Undo2 className="w-4 h-4 text-orange-500" />
                                        Undo Invitation Sent
                                      </button>
                                    )}
                                    {/* Attendance confirmation actions */}
                                    {!attendee.checked_in && attendee.attendance_confirmed !== true && (
                                      <button
                                        onClick={() => handleSingleConfirmAttendance(attendee.id, true)}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                                      >
                                        <UserCheck className="w-4 h-4 text-green-500" />
                                        Confirm Coming
                                      </button>
                                    )}
                                    {!attendee.checked_in && attendee.attendance_confirmed !== false && (
                                      <button
                                        onClick={() => handleSingleConfirmAttendance(attendee.id, false)}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                                      >
                                        <XCircle className="w-4 h-4 text-red-500" />
                                        Mark Not Coming
                                      </button>
                                    )}
                                    {attendee.attendance_confirmed !== null && attendee.attendance_confirmed !== undefined && !attendee.checked_in && (
                                      <button
                                        onClick={() => handleSingleResetConfirmation(attendee.id)}
                                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                                      >
                                        <RotateCcw className="w-4 h-4 text-amber-500" />
                                        Reset Confirmation
                                      </button>
                                    )}
                                    {/* Check-in undo */}
                                    {attendee.checked_in && (
                                      <>
                                        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                                        <button
                                          onClick={() => { handleUndoCheckIn(attendee.id); setActiveRowMenu(null); }}
                                          className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2.5"
                                        >
                                          <Undo2 className="w-4 h-4" />
                                          Undo Check-in
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
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
        </>
      )}

      {!selectedEventId && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Calendar className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {activeEvents.length === 0 && inactiveEvents.length > 0
              ? 'No Active Events'
              : 'Select an Event'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {activeEvents.length === 0 && inactiveEvents.length > 0
              ? <>No upcoming or ongoing events found. Click the <EyeOff className="w-4 h-4 inline -mt-0.5" /> button above to view past events.</>
              : 'Choose an event from the dropdown above to manage attendance'}
          </p>
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
