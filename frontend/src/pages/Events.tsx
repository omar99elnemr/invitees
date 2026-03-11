import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getHour12 } from '../utils/formatters';
import EventCalendar from '../components/EventCalendar';
import { CardGridSkeleton, InlineListSkeleton } from '../components/common/LoadingSkeleton';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Clock,
  Search,
  Filter,
  X,
  Key,
  Copy,
  ExternalLink,
  BarChart3,
  CheckCircle,
  XCircle,
  Gauge,
  List,
  CalendarDays,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { eventsAPI, inviterGroupsAPI, CheckinPinInfo, GroupQuotaInfo } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Event, InviterGroup } from '../types';
import toast from 'react-hot-toast';

// Status badge colors
const statusColors: Record<Event['status'], string> = {
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ongoing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ended: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const statusLabels: Record<Event['status'], string> = {
  upcoming: 'Upcoming',
  ongoing: 'Live',
  ended: 'Ended',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [inviterGroups, setInviterGroups] = useState<InviterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [pinInfo, setPinInfo] = useState<CheckinPinInfo | null>(null);
  const [loadingPin, setLoadingPin] = useState(false);
  const [autoDeactivateHours, setAutoDeactivateHours] = useState<number | null>(24);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [groupsModalEvent, setGroupsModalEvent] = useState<Event | null>(null);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [quotaEvent, setQuotaEvent] = useState<Event | null>(null);
  const [quotaData, setQuotaData] = useState<GroupQuotaInfo[]>([]);
  const [quotaEdits, setQuotaEdits] = useState<Record<number, string>>({});
  const [loadingQuotas, setLoadingQuotas] = useState(false);
  const [savingQuotas, setSavingQuotas] = useState(false);

  // View mode & sorting state
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [sortField, setSortField] = useState<'name' | 'start_date' | 'status' | 'invitee_count'>('start_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCalDay, setSelectedCalDay] = useState<Date | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    start_date: '',
    end_date: '',
    venue: '',
    description: '',
    is_all_groups: false,
    inviter_group_ids: [] as number[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Server time offset (server_egypt_ms - local_ms) to sync client-side status computation
  const serverOffsetRef = useRef(0);

  // Compute event status client-side from dates for instant visual feedback.
  // Backend dates are Egypt time with 'Z' suffix; strip 'Z' so JS parses as local time.
  const computeClientStatus = useCallback((event: Event): Event['status'] => {
    if (event.status === 'cancelled' || event.status === 'on_hold') return event.status;
    const nowMs = Date.now() + serverOffsetRef.current;
    const startMs = new Date(event.start_date.replace('Z', '')).getTime();
    const endMs = new Date(event.end_date.replace('Z', '')).getTime();
    if (nowMs < startMs) return 'upcoming';
    if (nowMs < endMs) return 'ongoing';
    return 'ended';
  }, []);

  // Fetch events, inviter groups and refresh statuses
  useEffect(() => {
    fetchEvents();
    fetchInviterGroups();
    
    // Set up auto-refresh every 30 seconds to sync with backend
    const refreshInterval = setInterval(() => {
      refreshEventStatuses();
    }, 30000);
    
    // Client-side status ticker — updates every second for instant transitions
    const statusTicker = setInterval(() => {
      setEvents(prev => {
        let changed = false;
        const updated = prev.map(ev => {
          const computed = computeClientStatus(ev);
          if (computed !== ev.status) {
            changed = true;
            return { ...ev, status: computed };
          }
          return ev;
        });
        return changed ? updated : prev;
      });
    }, 1000);
    
    // Cleanup intervals on unmount
    return () => {
      clearInterval(refreshInterval);
      clearInterval(statusTicker);
    };
  }, [computeClientStatus]);

  const fetchInviterGroups = async () => {
    try {
      const response = await inviterGroupsAPI.getAll();
      setInviterGroups(response.data);
    } catch (error: any) {
      console.error('Failed to load inviter groups:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Use refresh endpoint to update statuses and get events
      const response = await eventsAPI.refreshStatuses();
      setEvents(response.data.events);
      
      // Sync server time offset for client-side status computation
      if (response.data.server_time) {
        const serverMs = new Date(response.data.server_time.replace('Z', '')).getTime();
        serverOffsetRef.current = serverMs - Date.now();
      }
      
      // Log if any events were updated (for debugging)
      const { updated } = response.data;
      if (updated.ongoing > 0 || updated.ended > 0) {
        console.log(`Events updated: ${updated.ongoing} live, ${updated.ended} ended`);
        toast.success(`Updated: ${updated.ongoing} live, ${updated.ended} ended`);
      }
    } catch (error: any) {
      console.error('Failed to refresh events:', error);
      // Fallback to regular getAll if refresh fails
      try {
        const response = await eventsAPI.getAll();
        setEvents(response.data);
      } catch (fallbackError) {
        console.error('Failed to fetch events:', fallbackError);
        toast.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Silently refresh event statuses (called every minute)
  const refreshEventStatuses = async () => {
    try {
      const response = await eventsAPI.refreshStatuses();
      setEvents(response.data.events);
      
      // Sync server time offset
      if (response.data.server_time) {
        const serverMs = new Date(response.data.server_time.replace('Z', '')).getTime();
        serverOffsetRef.current = serverMs - Date.now();
      }
      
      // Show toast only if events were updated
      const { updated } = response.data;
      if (updated.ongoing > 0) {
        toast.success(`${updated.ongoing} event(s) are now live`, { duration: 3000 });
      }
      if (updated.ended > 0) {
        toast.success(`${updated.ended} event(s) have ended`, { duration: 3000 });
      }
    } catch (error) {
      // Silent fail for background refresh - don't disturb user
      console.error('Background status refresh failed:', error);
    }
  };

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.venue?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    // Date range filter
    let matchesDate = true;
    if (dateFrom) {
      const from = new Date(dateFrom);
      const evStart = new Date(event.start_date.replace('Z', ''));
      if (evStart < from) matchesDate = false;
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59');
      const evStart = new Date(event.start_date.replace('Z', ''));
      if (evStart > to) matchesDate = false;
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Sort events for list view
  const sortedEvents = useMemo(() => {
    const statusOrder: Record<string, number> = { ongoing: 0, upcoming: 1, on_hold: 2, ended: 3, cancelled: 4 };
    return [...filteredEvents].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'start_date':
          cmp = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          break;
        case 'status':
          cmp = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
          break;
        case 'invitee_count':
          cmp = (a.invitee_count || 0) - (b.invitee_count || 0);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [filteredEvents, sortField, sortDir]);

  // Toggle sort
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-500" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-500" />;
  };

  // Calendar: create event on the selected day
  const handleCreateOnSelectedDay = () => {
    if (!isAdmin || !selectedCalDay) return;
    const yyyy = selectedCalDay.getFullYear();
    const mm = String(selectedCalDay.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedCalDay.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}T10:00`;
    const endStr = `${yyyy}-${mm}-${dd}T18:00`;
    setFormData({
      name: '',
      start_date: dateStr,
      end_date: endStr,
      venue: '',
      description: '',
      is_all_groups: false,
      inviter_group_ids: [],
    });
    setFormErrors({});
    setSelectedEvent(null);
    setShowCreateModal(true);
  };

  // Format date for display — backend stores Egypt local time but appends 'Z'.
  // Using 'UTC' displays the raw stored value, which IS correct Egypt time.
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-EG', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: getHour12(),
    });
  };

  // Format date for input
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Event name is required';
    }
    
    if (!formData.start_date) {
      errors.start_date = 'Start date is required';
    }
    
    if (!formData.end_date) {
      errors.end_date = 'End date is required';
    }
    
    if (formData.start_date && formData.end_date) {
      if (new Date(formData.start_date) >= new Date(formData.end_date)) {
        errors.end_date = 'End date must be after start date';
      }
    }
    
    // Either is_all_groups must be true OR at least one group must be selected
    if (!formData.is_all_groups && (!formData.inviter_group_ids || formData.inviter_group_ids.length === 0)) {
      errors.inviter_group_ids = 'Select "All Groups" or choose specific inviter groups';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle create event
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      await eventsAPI.create(formData);
      toast.success('Event created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit event
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedEvent) return;
    
    setSubmitting(true);
    try {
      await eventsAPI.update(selectedEvent.id, formData);
      toast.success('Event updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete event
  const handleDelete = async () => {
    if (!selectedEvent) return;
    
    setSubmitting(true);
    try {
      await eventsAPI.delete(selectedEvent.id);
      toast.success('Event deleted successfully');
      setShowDeleteModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete event');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (status: Event['status']) => {
    if (!selectedEvent) return;
    
    setSubmitting(true);
    try {
      await eventsAPI.updateStatus(selectedEvent.id, status);
      toast.success('Event status updated');
      setShowStatusModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update status');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      venue: '',
      description: '',
      is_all_groups: false,
      inviter_group_ids: [],
    });
    setFormErrors({});
    setSelectedEvent(null);
  };

  // Open edit modal
  const openEditModal = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      name: event.name,
      start_date: formatDateForInput(event.start_date),
      end_date: formatDateForInput(event.end_date),
      venue: event.venue || '',
      description: event.description || '',
      is_all_groups: event.is_all_groups || false,
      inviter_group_ids: event.inviter_group_ids || [],
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (event: Event) => {
    setSelectedEvent(event);
    setShowDeleteModal(true);
  };

  // Open status modal
  const openStatusModal = (event: Event) => {
    setSelectedEvent(event);
    setShowStatusModal(true);
  };

  // Open PIN modal
  const openPinModal = async (event: Event) => {
    setSelectedEvent(event);
    setShowPinModal(true);
    setPinInfo(null);
    setLoadingPin(true);
    try {
      const response = await eventsAPI.getCheckinPin(event.id);
      if (response.data.has_pin === false) {
        setPinInfo(null);
      } else {
        setPinInfo(response.data);
        setAutoDeactivateHours(response.data.auto_deactivate_hours);
      }
    } catch (error: any) {
      toast.error('Failed to load PIN info');
    } finally {
      setLoadingPin(false);
    }
  };

  // Generate new PIN
  const handleGeneratePin = async () => {
    if (!selectedEvent) return;
    setLoadingPin(true);
    try {
      const response = await eventsAPI.generateCheckinPin(selectedEvent.id, autoDeactivateHours || undefined);
      setPinInfo(response.data);
      toast.success('Check-in PIN generated!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate PIN');
    } finally {
      setLoadingPin(false);
    }
  };

  // Toggle PIN active status
  const handleTogglePin = async () => {
    if (!selectedEvent || !pinInfo) return;
    try {
      const response = await eventsAPI.toggleCheckinPin(selectedEvent.id, !pinInfo.active);
      setPinInfo({ ...pinInfo, active: response.data.checkin_pin_active });
      toast.success(response.data.checkin_pin_active ? 'PIN activated' : 'PIN deactivated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle PIN');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  // Open Quota modal
  const openQuotaModal = async (event: Event) => {
    setQuotaEvent(event);
    setShowQuotaModal(true);
    setLoadingQuotas(true);
    setQuotaEdits({});
    try {
      const response = await eventsAPI.getQuotas(event.id);
      setQuotaData(response.data);
      // Pre-populate edit fields
      const edits: Record<number, string> = {};
      response.data.forEach((q) => {
        edits[q.inviter_group_id] = q.quota !== null ? String(q.quota) : '';
      });
      setQuotaEdits(edits);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load quotas');
    } finally {
      setLoadingQuotas(false);
    }
  };

  // Save quotas
  const handleSaveQuotas = async () => {
    if (!quotaEvent) return;
    setSavingQuotas(true);
    try {
      const quotas = Object.entries(quotaEdits).map(([groupId, val]) => ({
        inviter_group_id: Number(groupId),
        quota: val.trim() === '' ? null : Number(val),
      }));
      await eventsAPI.setQuotas(quotaEvent.id, quotas);
      toast.success('Quotas saved successfully');
      // Close modal on success
      setShowQuotaModal(false);
      setQuotaEvent(null);
      setQuotaData([]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save quotas');
    } finally {
      setSavingQuotas(false);
    }
  };

  if (loading) {
    return <CardGridSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Events</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your events and track invitees
          </p>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium"
          >
            <Plus className="w-5 h-5" />
            Create Event
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Events</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.filter(e => e.status === 'upcoming').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.filter(e => e.status === 'ongoing').length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Live</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{events.reduce((sum, e) => sum + (e.invitee_count || 0), 0)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Invitees</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle + Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white dark:bg-gray-800 dark:text-white shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Live</option>
              <option value="ended">Ended</option>
              <option value="on_hold">On Hold</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* View Toggle */}
          {isAdmin && (
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <List className="w-4 h-4" />
                List
              </button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Calendar
              </button>
            </div>
          )}
        </div>

        {/* Date Range Filters (list view only) */}
        {viewMode === 'list' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Date range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
              placeholder="From"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="px-2 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
          {/* Create Event button — visible when a day is selected */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedCalDay
                ? selectedCalDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : 'Click a day to select it'}
            </p>
            <button
              onClick={handleCreateOnSelectedDay}
              disabled={!selectedCalDay}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                selectedCalDay
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              Create Event{selectedCalDay ? ` on ${selectedCalDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
            </button>
          </div>
          <EventCalendar
            events={filteredEvents}
            onDaySelect={setSelectedCalDay}
            onEventClick={(ev) => openEditModal(ev)}
          />
        </div>
      )}

      {/* List View */}
      {(viewMode === 'list' || !isAdmin) && (
        <>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No events found</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || dateFrom || dateTo
                  ? 'Try adjusting your filters'
                  : 'Get started by creating a new event'}
              </p>
              {isAdmin && !searchQuery && statusFilter === 'all' && !dateFrom && !dateTo && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Create Event
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Compact Table Header */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <button onClick={() => handleSort('name')} className="col-span-3 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Event <SortIcon field="name" />
                </button>
                <button onClick={() => handleSort('status')} className="col-span-1 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Status <SortIcon field="status" />
                </button>
                <button onClick={() => handleSort('start_date')} className="col-span-3 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Date <SortIcon field="start_date" />
                </button>
                <div className="col-span-2">Location</div>
                <button onClick={() => handleSort('invitee_count')} className="col-span-1 flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  Invitees <SortIcon field="invitee_count" />
                </button>
                {isAdmin && <div className="col-span-2 text-right">Actions</div>}
              </div>

              {/* Event Rows */}
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {sortedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="group sm:grid sm:grid-cols-12 gap-2 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center"
                  >
                    {/* Name + Groups */}
                    <div className="col-span-3 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {event.name}
                      </p>
                      {isAdmin && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {event.is_all_groups ? (
                            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">All Groups</span>
                          ) : event.inviter_group_names && event.inviter_group_names.length > 0 ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setGroupsModalEvent(event); setShowGroupsModal(true); }}
                              className="text-[10px] text-purple-600 dark:text-purple-400 font-medium hover:underline"
                            >
                              {event.inviter_group_names.length} Group{event.inviter_group_names.length !== 1 ? 's' : ''}
                            </button>
                          ) : null}
                        </div>
                      )}
                      <span className="text-xs text-gray-400 dark:text-gray-500 sm:hidden">
                        by {event.creator_name || 'Unknown'}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 mt-1 sm:mt-0">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColors[event.status]}`}>
                        {statusLabels[event.status]}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="col-span-3 text-xs text-gray-600 dark:text-gray-400 mt-1 sm:mt-0">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{formatDate(event.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">to {formatDate(event.end_date)}</span>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="col-span-2 text-xs text-gray-500 dark:text-gray-400 truncate mt-1 sm:mt-0">
                      {event.venue ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{event.venue}</span>
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </div>

                    {/* Invitee Count */}
                    <div className="col-span-1 mt-1 sm:mt-0">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {event.invitee_count || 0}
                      </span>
                    </div>

                    {/* Actions */}
                    {isAdmin && (
                      <div className="col-span-2 flex items-center justify-end gap-0.5 mt-2 sm:mt-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(event)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors" title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openQuotaModal(event)} className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-400 dark:hover:bg-purple-900/30 transition-colors" title="Quotas">
                          <Gauge className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openPinModal(event)} className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-900/30 transition-colors" title="Check-in">
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openStatusModal(event)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors" title="Status">
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openDeleteModal(event)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Non-admin footer on mobile */}
                    {!isAdmin && (
                      <div className="col-span-2 text-right mt-1 sm:mt-0">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          by {event.creator_name || 'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Result count footer */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                Showing {sortedEvents.length} of {events.length} events
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {showCreateModal ? 'Create Event' : 'Edit Event'}
                </h2>
                <button
                  onClick={() => {
                    showCreateModal ? setShowCreateModal(false) : setShowEditModal(false);
                    resetForm();
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={showCreateModal ? handleCreate : handleEdit}>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Event Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Enter event name"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white ${
                        formErrors.start_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {formErrors.start_date && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.start_date}</p>
                    )}
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white ${
                        formErrors.end_date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {formErrors.end_date && (
                      <p className="mt-1 text-sm text-red-500">{formErrors.end_date}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="Enter location"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white"
                      placeholder="Enter event description"
                    />
                  </div>

                  {/* Inviter Groups - Admin only */}
                  {isAdmin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Inviter Groups
                      </label>
                      
                      {/* All Groups Option */}
                      <div className="mb-3">
                        <label 
                          className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 transition-all ${
                            formData.is_all_groups 
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-600 shadow-sm' 
                              : 'border-dashed border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.is_all_groups}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                is_all_groups: e.target.checked,
                                inviter_group_ids: e.target.checked ? inviterGroups.map(g => g.id) : [],
                              });
                            }}
                            className="h-5 w-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                          />
                          <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-800/50">
                            <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              All Groups
                            </span>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Event accessible by all inviter groups
                            </p>
                          </div>
                          {formData.is_all_groups && (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          )}
                        </label>
                      </div>

                      {/* Divider */}
                      <div className="relative mb-3">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200 dark:border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            or select specific groups
                          </span>
                        </div>
                      </div>

                      {/* Specific Groups Selection */}
                      <div className={`rounded-xl border overflow-hidden transition-all ${
                        formErrors.inviter_group_ids 
                          ? 'border-red-300 dark:border-red-700' 
                          : 'border-gray-200 dark:border-gray-600'
                      } ${formData.is_all_groups ? 'opacity-40 pointer-events-none' : ''}`}>
                        {inviterGroups.length === 0 ? (
                          <div className="p-4 text-center">
                            <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No inviter groups available</p>
                          </div>
                        ) : (
                          <>
                          {/* Select All / Deselect All toolbar */}
                          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formData.inviter_group_ids.length} of {inviterGroups.length} selected
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData,
                                  inviter_group_ids: inviterGroups.map(g => g.id),
                                })}
                                disabled={formData.inviter_group_ids.length === inviterGroups.length}
                                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-40 disabled:cursor-default transition-colors"
                              >
                                Select All
                              </button>
                              <span className="text-gray-300 dark:text-gray-600">|</span>
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData,
                                  inviter_group_ids: [],
                                })}
                                disabled={formData.inviter_group_ids.length === 0}
                                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40 disabled:cursor-default transition-colors"
                              >
                                Deselect All
                              </button>
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {inviterGroups.map((group, index) => (
                              <label 
                                key={group.id} 
                                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                  formData.inviter_group_ids.includes(group.id)
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                } ${index !== inviterGroups.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.inviter_group_ids.includes(group.id)}
                                  disabled={formData.is_all_groups}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({
                                        ...formData,
                                        inviter_group_ids: [...formData.inviter_group_ids, group.id],
                                      });
                                    } else {
                                      setFormData({
                                        ...formData,
                                        inviter_group_ids: formData.inviter_group_ids.filter(id => id !== group.id),
                                      });
                                    }
                                  }}
                                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                />
                                <div className={`w-2 h-2 rounded-full ${
                                  formData.inviter_group_ids.includes(group.id) 
                                    ? 'bg-indigo-500' 
                                    : 'bg-gray-300 dark:bg-gray-500'
                                }`}></div>
                                <span className={`text-sm flex-1 ${
                                  formData.inviter_group_ids.includes(group.id)
                                    ? 'font-medium text-indigo-700 dark:text-indigo-300'
                                    : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {group.name}
                                </span>
                                {formData.inviter_group_ids.includes(group.id) && (
                                  <CheckCircle className="w-4 h-4 text-indigo-500" />
                                )}
                              </label>
                            ))}
                          </div>
                          </>
                        )}
                      </div>

                      {/* Selection Summary */}
                      {!formData.is_all_groups && formData.inviter_group_ids.length > 0 && (
                        <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          {formData.inviter_group_ids.length} group{formData.inviter_group_ids.length !== 1 ? 's' : ''} selected
                        </p>
                      )}
                      
                      {formErrors.inviter_group_ids && (
                        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          {formErrors.inviter_group_ids}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      showCreateModal ? setShowCreateModal(false) : setShowEditModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : showCreateModal ? 'Create Event' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 text-gray-900 dark:text-white">Delete Event</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                Are you sure you want to delete "<strong className="text-gray-900 dark:text-white">{selectedEvent.name}</strong>"? This action cannot be undone.
              </p>
              {(selectedEvent.invitee_count || 0) > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-amber-800 dark:text-amber-300 text-center">
                    <strong>{selectedEvent.invitee_count}</strong> invitee(s) and all related data (codes, invitations, etc.) will be permanently removed.
                  </p>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Change Event Status</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Current status: <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedEvent.status]}`}>
                  {statusLabels[selectedEvent.status]}
                </span>
              </p>
              <div className="space-y-2">
                {(['upcoming', 'ongoing', 'ended', 'on_hold', 'cancelled'] as Event['status'][]).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={submitting || selectedEvent.status === status}
                    className={`w-full px-4 py-2 text-left rounded-lg border transition-colors ${
                      selectedEvent.status === status
                        ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}>
                      {statusLabels[status]}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedEvent(null);
                  }}
                  className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Check-in PIN Modal */}
      {showPinModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <Key className="w-5 h-5 text-primary" />
                  Check-in Settings
                </h2>
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setSelectedEvent(null);
                    setPinInfo(null);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="font-medium text-gray-900 dark:text-white">{selectedEvent.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedEvent.venue}</p>
              </div>

              {loadingPin ? (
                <InlineListSkeleton rows={3} />
              ) : pinInfo ? (
                <div className="space-y-4">
                  {/* PIN Status */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-2">
                      {pinInfo.active ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className={pinInfo.active ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                        {pinInfo.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <button
                      onClick={handleTogglePin}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        pinInfo.active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50'
                      }`}
                    >
                      {pinInfo.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  {/* PIN and Code */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Event Code</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded font-mono text-lg">
                          {pinInfo.code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(pinInfo.code, 'Event code')}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PIN</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded font-mono text-lg tracking-widest">
                          {pinInfo.pin}
                        </code>
                        <button
                          onClick={() => copyToClipboard(pinInfo.pin, 'PIN')}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* URLs */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Check-in Console URL
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/checkin/${pinInfo.code}`}
                          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm dark:text-white"
                        />
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/checkin/${pinInfo.code}`, 'Check-in URL')}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        <a
                          href={`/checkin/${pinInfo.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </a>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <BarChart3 className="w-4 h-4 inline mr-1" />
                        Live Dashboard URL (Public)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/live/${pinInfo.code}`}
                          className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-sm dark:text-white"
                        />
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/live/${pinInfo.code}`, 'Live Dashboard URL')}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        <a
                          href={`/live/${pinInfo.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        >
                          <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Auto-deactivation info */}
                  {pinInfo.auto_deactivate_hours && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      PIN will auto-deactivate {pinInfo.auto_deactivate_hours} hours after event ends.
                    </p>
                  )}

                  {/* Regenerate button */}
                  <button
                    onClick={handleGeneratePin}
                    disabled={loadingPin}
                    className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Regenerate PIN
                  </button>
                </div>
              ) : (
                /* No PIN exists yet */
                <div className="text-center py-6">
                  <Key className="w-12 h-12 text-gray-300 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No check-in PIN has been generated for this event yet.
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Auto-deactivate after event ends
                    </label>
                    <select
                      value={autoDeactivateHours || ''}
                      onChange={(e) => setAutoDeactivateHours(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Never (manual only)</option>
                      <option value="1">1 hour</option>
                      <option value="2">2 hours</option>
                      <option value="6">6 hours</option>
                      <option value="12">12 hours</option>
                      <option value="24">24 hours</option>
                      <option value="48">48 hours</option>
                    </select>
                  </div>

                  <button
                    onClick={handleGeneratePin}
                    disabled={loadingPin}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  >
                    Generate Check-in PIN
                  </button>
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setSelectedEvent(null);
                    setPinInfo(null);
                  }}
                  className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Assigned Groups Modal */}
      {showGroupsModal && groupsModalEvent && groupsModalEvent.inviter_group_names && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => { setShowGroupsModal(false); setGroupsModalEvent(null); }}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Assigned Groups</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{groupsModalEvent.name}</p>
                </div>
              </div>
              <button onClick={() => { setShowGroupsModal(false); setGroupsModalEvent(null); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto max-h-[calc(70vh-130px)]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {groupsModalEvent.inviter_group_names.length} {groupsModalEvent.inviter_group_names.length === 1 ? 'group' : 'groups'} assigned to this event
              </p>
              <div className="space-y-2">
                {groupsModalEvent.inviter_group_names.map((groupName, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600/50">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-semibold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{groupName}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
              <button onClick={() => { setShowGroupsModal(false); setGroupsModalEvent(null); }} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quota Management Modal */}
      {showQuotaModal && quotaEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg">
                  <Gauge className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Group Quotas</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{quotaEvent.name}</p>
                </div>
              </div>
              <button
                onClick={() => { setShowQuotaModal(false); setQuotaEvent(null); setQuotaData([]); }}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 overflow-y-auto max-h-[calc(85vh-180px)]">
              {loadingQuotas ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : quotaData.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No groups assigned to this event</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Set the maximum number of invitees each group can submit. Leave blank for unlimited.
                  </p>
                  <div className="space-y-3">
                    {quotaData.map((q) => {
                      const editVal = quotaEdits[q.inviter_group_id] ?? '';
                      const quotaNum = editVal.trim() === '' ? null : Number(editVal);
                      const pct = quotaNum && quotaNum > 0 ? Math.min((q.used / quotaNum) * 100, 100) : 0;
                      const isOver = quotaNum !== null && q.used > quotaNum;

                      return (
                        <div
                          key={q.inviter_group_id}
                          className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{q.inviter_group_name}</span>
                            <span className={`text-xs font-medium ${isOver ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                              {q.used} used{quotaNum !== null ? ` / ${quotaNum}` : ''}
                            </span>
                          </div>

                          {/* Progress bar */}
                          {quotaNum !== null && quotaNum > 0 && (
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-2">
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Quota:</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="Unlimited"
                              value={editVal}
                              onChange={(e) =>
                                setQuotaEdits((prev) => ({ ...prev, [q.inviter_group_id]: e.target.value }))
                              }
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            {quotaNum !== null && (
                              <span className={`text-xs whitespace-nowrap font-medium ${
                                isOver ? 'text-red-600 dark:text-red-400' : q.remaining === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'
                              }`}>
                                {isOver ? `Over by ${q.used - quotaNum}` : `${Math.max((quotaNum || 0) - q.used, 0)} left`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
              <button
                onClick={() => { setShowQuotaModal(false); setQuotaEvent(null); setQuotaData([]); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500"
              >
                Close
              </button>
              <button
                onClick={handleSaveQuotas}
                disabled={savingQuotas || loadingQuotas || quotaData.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingQuotas ? 'Saving...' : 'Save Quotas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
