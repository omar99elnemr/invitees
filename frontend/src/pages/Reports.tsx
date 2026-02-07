import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Filter,
  BarChart3,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock,
  Building,
  User,
  Search,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Activity,
} from 'lucide-react';
import { reportsAPI, eventsAPI, inviterGroupsAPI, settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Event, InviterGroup, EventInvitee } from '../types';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportHelpers';
import TablePagination from '../components/common/TablePagination';
import { formatDateTimeEgypt, formatDateEgypt } from '../utils/formatters';
import toast from 'react-hot-toast';

type ReportType = 'summary-group' | 'summary-inviter' | 'detail-event' | 'detail-approved' | 'activity-log' | 'historical-data';

interface HistoricalInvitee {
  id: number;
  event_name: string;
  invitee_name: string;
  position: string;
  inviter_name: string;
  inviter_group_name: string;
  status: string;
  status_date: string;
}

interface ActivityLogEntry {
  id: number;
  user_id: number | null;
  username: string;
  user_role: string | null;
  inviter_group_name: string | null;
  action: string;
  table_name: string;
  record_id: number | null;
  old_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  timestamp: string;
}

interface ActivityUser {
  id: number;
  username: string;
  name: string;
  role: string;
  inviter_group: string | null;
}

interface SummaryData {
  event_id: number;
  event_name: string;
  inviter_group_id?: number;
  inviter_group_name?: string;
  inviter_id?: number;
  inviter_name?: string;
  status: string;
  total_invitees: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType>('summary-group');
  const [events, setEvents] = useState<Event[]>([]);
  const [inviterGroups, setInviterGroups] = useState<InviterGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Summary data
  const [summaryData, setSummaryData] = useState<SummaryData[]>([]);
  // Detail data
  const [detailData, setDetailData] = useState<EventInvitee[]>([]);
  // Activity log data
  const [activityData, setActivityData] = useState<ActivityLogEntry[]>([]);
  const [activityActions, setActivityActions] = useState<string[]>([]);
  const [activityUsers, setActivityUsers] = useState<ActivityUser[]>([]);
  // Historical data
  const [historicalData, setHistoricalData] = useState<HistoricalInvitee[]>([]);

  // Filters
  const [eventFilter, setEventFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  // Activity log filters
  const [actionFilter, setActionFilter] = useState<string>('');
  const [userFilter, setUserFilter] = useState<string>('');
  // Historical data filters
  const [inviterFilter, setInviterFilter] = useState<string>('');
  const [historicalInviters, setHistoricalInviters] = useState<string[]>([]);
  const [historicalEvents, setHistoricalEvents] = useState<string[]>([]);
  const [historicalGroups, setHistoricalGroups] = useState<string[]>([]);
  
  // Pagination and sorting for historical data
  const [historicalPage, setHistoricalPage] = useState(1);
  const [historicalPageSize, setHistoricalPageSize] = useState(50);
  const [historicalSortColumn, setHistoricalSortColumn] = useState<string>('');
  const [historicalSortDirection, setHistoricalSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination and sorting for detail reports
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(50);
  const [detailSortColumn, setDetailSortColumn] = useState<string>('');
  const [detailSortDirection, setDetailSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Pagination and sorting for activity log
  const [activityPage, setActivityPage] = useState(1);
  const [activityPageSize, setActivityPageSize] = useState(50);
  const [activitySortColumn, setActivitySortColumn] = useState<string>('');
  const [activitySortDirection, setActivitySortDirection] = useState<'asc' | 'desc'>('asc');

  // Grouped data for summary reports
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  
  // Logo data for Excel exports
  const [logoImageData, setLogoImageData] = useState<string>('');
  // Dynamic logos from admin settings for PDF exports
  const [exportLogoLeft, setExportLogoLeft] = useState<string | null>(null);
  const [exportLogoRight, setExportLogoRight] = useState<string | null>(null);
  const [exportLogosLoaded, setExportLogosLoaded] = useState(false);

  const canViewReports = user?.role === 'admin';

  useEffect(() => {
    if (canViewReports) {
      loadFilters();
    }
  }, [canViewReports]);

  const loadFilters = async () => {
    try {
      // Load basic filters first
      const [eventsRes, groupsRes] = await Promise.all([
        eventsAPI.getAll(),
        inviterGroupsAPI.getAll(),
      ]);
      setEvents(eventsRes.data);
      setInviterGroups(groupsRes.data);
      
      // Load activity log filters separately (they might fail if no logs exist yet)
      try {
        const [actionsRes, usersRes] = await Promise.all([
          reportsAPI.activityLogActions(),
          reportsAPI.activityLogUsers(),
        ]);
        setActivityActions(actionsRes.data);
        setActivityUsers(usersRes.data as ActivityUser[]);
      } catch {
        // Activity log filters are optional, don't show error
        console.log('Activity log filters not loaded');
      }
      
      // Load historical data filters
      try {
        const historicalFiltersRes = await reportsAPI.historicalFilters();
        setHistoricalInviters(historicalFiltersRes.data.inviters || []);
        setHistoricalEvents(historicalFiltersRes.data.events || []);
        setHistoricalGroups(historicalFiltersRes.data.groups || []);
      } catch {
        console.log('Historical filters not loaded');
      }
    } catch (error: any) {
      toast.error('Failed to load filter options');
    }
  };

  const loadLogoData = async () => {
    try {
      // Import logo data dynamically
      const { logoBase64 } = await import('../utils/logoData');
      setLogoImageData(logoBase64);
      console.log('✅ Logo data loaded for Excel export');
    } catch (error) {
      console.warn('⚠️ Could not load logo data:', error);
      setLogoImageData('');
    }
  };

  const loadExportLogos = async () => {
    if (exportLogosLoaded) return;
    try {
      const res = await settingsAPI.getExportSettings();
      const settings = res.data.settings || {};
      setExportLogoLeft(settings.logo_left?.value || null);
      setExportLogoRight(settings.logo_right?.value || null);
      setExportLogosLoaded(true);
    } catch {
      // If settings API fails, export will fall back to hardcoded logo
      setExportLogosLoaded(true);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setDataLoaded(false);
    
    // Reset pagination to page 1 when generating new report
    setDetailPage(1);
    setActivityPage(1);
    setHistoricalPage(1);
    
    // Load logo data for Excel exports + dynamic export logos
    await Promise.all([loadLogoData(), loadExportLogos()]);

    const filters: any = {};
    if (eventFilter) filters.event_id = eventFilter;
    if (groupFilter) filters.inviter_group_id = groupFilter;
    if (statusFilter) filters.status = statusFilter;
    if (searchQuery) filters.search = searchQuery;

    try {
      let response;
      switch (activeReport) {
        case 'summary-group':
          response = await reportsAPI.summaryPerEvent(filters);
          setSummaryData(response.data);
          break;
        case 'summary-inviter':
          response = await reportsAPI.summaryPerInviter(filters);
          setSummaryData(response.data);
          break;
        case 'detail-event':
          response = await reportsAPI.detailPerEvent(filters);
          setDetailData(response.data);
          break;
        case 'detail-approved':
          response = await reportsAPI.detailGoing(filters);
          setDetailData(response.data);
          break;
        case 'activity-log':
          const activityFilters: any = {};
          if (actionFilter) activityFilters.action = actionFilter;
          if (userFilter) activityFilters.user_id = userFilter;
          response = await reportsAPI.activityLog(activityFilters);
          setActivityData(response.data);
          break;
        case 'historical-data':
          // Historical data uses different filter param names
          const historicalFilters: any = {};
          if (eventFilter) historicalFilters.event = eventFilter;
          if (inviterFilter) historicalFilters.inviter = inviterFilter;
          if (groupFilter) historicalFilters.group = groupFilter;
          if (statusFilter) historicalFilters.status = statusFilter;
          if (searchQuery) historicalFilters.search = searchQuery;
          response = await reportsAPI.historicalData(historicalFilters);
          setHistoricalData(response.data);
          break;
      }
      setDataLoaded(true);
      toast.success('Report generated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format action names for display
  const formatActionName = (action: string) => {
    const actionLabels: Record<string, string> = {
      'login': 'User Login',
      'logout': 'User Logout',
      'change_password': 'Password Changed',
      'reset_password': 'Password Reset',
      'create_user': 'User Created',
      'update_user': 'User Updated',
      'activate_user': 'User Activated',
      'deactivate_user': 'User Deactivated',
      'create_event': 'Event Created',
      'update_event': 'Event Updated',
      'update_event_status': 'Event Status Changed',
      'delete_event': 'Event Deleted',
      'create_contact': 'Contact Created',
      'add_invitee_to_event': 'Submitted for Approval',
      'update_invitee': 'Contact Updated',
      'update_event_invitee': 'Invitation Updated',
      'delete_invitee': 'Contact Deleted',
      'delete_invitee_bulk': 'Contacts Bulk Deleted',
      'remove_invitee_from_event': 'Removed from Event',
      'resubmit_invitation': 'Invitation Resubmitted',
      'bulk_invite_to_event': 'Bulk Invitation',
      'bulk_import_contacts': 'Contacts Imported',
      'approve_invitation': 'Invitation Approved',
      'reject_invitation': 'Invitation Rejected',
      'cancel_approval': 'Approval Cancelled',
      // Attendance & Check-in operations
      'generate_attendance_codes': 'Attendance Codes Generated',
      'mark_invitations_sent': 'Invitations Marked Sent',
      'check_in_attendee': 'Attendee Checked In',
      'undo_check_in': 'Check-in Undone',
      'generate_checkin_pin': 'Check-in PIN Generated',
      'toggle_checkin_pin': 'Check-in PIN Toggled',
      'update_checkin_settings': 'Check-in Settings Updated',
      'portal_confirm_attendance': 'Attendance Confirmed (Portal)',
      'checkin_portal_login': 'Check-in Portal Login',
      'checkin_portal_login_failed': 'Check-in Portal Login Failed',
      'checkin_portal_logout': 'Check-in Portal Logout',
    };
    return actionLabels[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Helper function to get formatted export data
  const getFormattedExportData = () => {
    if (activeReport === 'activity-log') {
      return activityData.map(item => ({
        'Timestamp': item.timestamp ? formatDateTimeEgypt(item.timestamp) : '—',
        'Action': formatActionName(item.action),
        'Performed By': item.username || 'System',
        'Role': item.user_role || '—',
        'Group': item.inviter_group_name || '—',
        'Table': item.table_name,
        'Record ID': item.record_id || '—',
        'Details': item.new_value || '—',
      }));
    }

    if (activeReport === 'historical-data') {
      return historicalData.map(item => ({
        'Event': item.event_name || '—',
        'Invitee Name': item.invitee_name || '—',
        'Position': item.position || '—',
        'Inviter': item.inviter_name || '—',
        'Group': item.inviter_group_name || '—',
        'Status': item.status || '—',
        'Date': item.status_date || '—',
      }));
    }

    const isSummary = activeReport.startsWith('summary');
    const rawData = isSummary ? summaryData : detailData;

    if (rawData.length === 0) return [];

    // Transform data based on report type with clean headers and proper column ordering
    if (activeReport === 'detail-approved') {
      // Full Approved Details: Event, Name, Phone, Email, Inviter, Category, Status, Attendance tracking
      return (rawData as EventInvitee[]).map(item => ({
        'Event': item.event_name || '—',
        'Invitee Name': item.invitee_name || '—',
        'Phone': item.invitee_phone || '—',
        'Email': item.invitee_email || '—',
        'Inviter': item.inviter_name || '—',
        'Category': item.category || '—',
        'Inviter Group': item.inviter_group_name || '—',
        'Status': item.status === 'waiting_for_approval' ? 'Pending' : 
                  item.status === 'approved' ? 'Approved' : 'Rejected',
        'Attendance Code': item.attendance_code || '—',
        'Invitation Sent': item.invitation_sent ? 'Yes' : 'No',
        'Sent Via': item.invitation_method || '—',
        'Confirmed': item.attendance_confirmed === true ? 'Yes' : 
                     item.attendance_confirmed === false ? 'No' : 'Pending',
        'Confirmed Guests': item.confirmed_guests ?? '—',
        'Checked In': item.checked_in ? 'Yes' : 'No',
        'Actual Guests': item.actual_guests ?? 0,
        'Plus One Allowed': item.plus_one || 0,
      }));
    } else if (activeReport === 'detail-event') {
      // Detailed Invitees: Event, Name, Phone, Email, Position, Inviter, Category, Group, Status
      return (rawData as EventInvitee[]).map(item => ({
        'Event': item.event_name || '—',
        'Invitee Name': item.invitee_name || '—',
        'Phone': item.invitee_phone || '—',
        'Email': item.invitee_email || '—',
        'Position': item.invitee_position || '—',
        'Inviter': item.inviter_name || '—',
        'Category': item.category || '—',
        'Inviter Group': item.inviter_group_name || '—',
        'Status': item.status === 'waiting_for_approval' ? 'Pending' : 
                  item.status === 'approved' ? 'Approved' : 'Rejected',
      }));
    } else if (activeReport === 'summary-group') {
      // Summary by Group: Event, Inviter Group, Status, Total
      return (rawData as SummaryData[]).map(item => ({
        'Event': item.event_name || '—',
        'Inviter Group': item.inviter_group_name || '—',
        'Status': item.status === 'waiting_for_approval' ? 'Pending' : 
                  item.status === 'approved' ? 'Approved' : 'Rejected',
        'Total Invitees': item.total_invitees || 0,
      }));
    } else if (activeReport === 'summary-inviter') {
      // Summary by Inviter: Event, Inviter, Group, Status, Total
      return (rawData as SummaryData[]).map(item => ({
        'Event': item.event_name || '—',
        'Inviter': item.inviter_name || '—',
        'Inviter Group': item.inviter_group_name || '—',
        'Status': item.status === 'waiting_for_approval' ? 'Pending' : 
                  item.status === 'approved' ? 'Approved' : 'Rejected',
        'Total Invitees': item.total_invitees || 0,
      }));
    }
    
    return rawData as any[];
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = getFormattedExportData();

    if (exportData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const reportName = reportTypes.find(r => r.id === activeReport)?.name || 'Report';
    const filename = `${reportName.replace(/\s+/g, '_')}`;

    try {
      if (format === 'csv') {
        exportToCSV(exportData, filename);
      } else if (format === 'excel') {
        exportToExcel(exportData, filename, reportName, logoImageData);
      } else if (format === 'pdf') {
        // Pass dynamic logos if loaded from admin settings; undefined = use hardcoded fallback
        const logoOptions = exportLogosLoaded
          ? { logoLeft: exportLogoLeft, logoRight: exportLogoRight }
          : undefined;
        exportToPDF(exportData, filename, reportName, 'landscape', logoOptions);
      }
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const toggleEventExpand = (eventId: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  // Group summary data by event
  const groupedSummaryData = summaryData.reduce((acc, item) => {
    if (!acc[item.event_id]) {
      acc[item.event_id] = {
        event_name: item.event_name,
        items: [],
        totals: { approved: 0, rejected: 0, waiting: 0, total: 0 },
      };
    }
    acc[item.event_id].items.push(item);
    acc[item.event_id].totals.total += item.total_invitees;
    if (item.status === 'approved') {
      acc[item.event_id].totals.approved += item.total_invitees;
    } else if (item.status === 'rejected') {
      acc[item.event_id].totals.rejected += item.total_invitees;
    } else {
      acc[item.event_id].totals.waiting += item.total_invitees;
    }
    return acc;
  }, {} as Record<number, { event_name: string; items: SummaryData[]; totals: { approved: number; rejected: number; waiting: number; total: number } }>);

  const reportTypes = [
    {
      id: 'summary-group' as ReportType,
      name: 'Invitees by Group',
      description: 'Number of invitees per inviter group for each event',
      icon: Building,
    },
    {
      id: 'summary-inviter' as ReportType,
      name: 'Invitees by Inviter',
      description: 'Number of invitees per inviter for each event',
      icon: Users,
    },
    {
      id: 'detail-event' as ReportType,
      name: 'Detailed Invitees',
      description: 'Detailed invitee list with name, position, inviter, group, status',
      icon: FileText,
    },
    {
      id: 'detail-approved' as ReportType,
      name: 'Full Approved Details',
      description: 'Approved invitees with phone, email, category, attendance status',
      icon: Check,
    },
    {
      id: 'activity-log' as ReportType,
      name: 'Activity Log',
      description: 'System activity log showing all actions performed',
      icon: Activity,
    },
    {
      id: 'historical-data' as ReportType,
      name: 'Historical Data',
      description: 'Historical invitee data from previous records',
      icon: FileText,
    },
  ];

  if (!canViewReports) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Only Admins can access reports.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Generate and export event and invitee reports
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => {
              setActiveReport(report.id);
              setDataLoaded(false);
              setSummaryData([]);
              setDetailData([]);
            }}
            className={`group p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 ${
              activeReport === report.id
                ? 'border-indigo-300 dark:border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 shadow-md'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
              activeReport === report.id 
                ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
            }`}>
              <report.icon className="w-5 h-5" />
            </div>
            <h3 className={`font-medium ${activeReport === report.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>
              {report.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h2 className="font-medium text-gray-900 dark:text-white">Filters</h2>
        </div>

        {activeReport === 'activity-log' ? (
          // Activity Log Filters
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Actions</option>
              {activityActions.map((action) => (
                <option key={action} value={action}>
                  {formatActionName(action)}
                </option>
              ))}
            </select>

            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Users</option>
              {activityUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.charAt(0).toUpperCase() + u.role.slice(1)}{u.inviter_group ? ` - ${u.inviter_group}` : ''})
                </option>
              ))}
            </select>

            <button
              onClick={generateReport}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        ) : (
          // Other Report Filters
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Events</option>
              {activeReport === 'historical-data' ? (
                historicalEvents.map((eventName) => (
                  <option key={eventName} value={eventName}>
                    {eventName}
                  </option>
                ))
              ) : (
                events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))
              )}
            </select>

            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Groups</option>
              {activeReport === 'historical-data' ? (
                historicalGroups.map((groupName) => (
                  <option key={groupName} value={groupName}>
                    {groupName}
                  </option>
                ))
              ) : (
                inviterGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))
              )}
            </select>

            {activeReport === 'historical-data' && (
              <select
                value={inviterFilter}
                onChange={(e) => setInviterFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
              >
                <option value="">All Inviters</option>
                {historicalInviters.map((inviter) => (
                  <option key={inviter} value={inviter}>
                    {inviter}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="waiting_for_approval">Pending</option>
            </select>

            {activeReport.startsWith('detail') && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search invitees..."
                  value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4" />
                Generate Report
              </>
            )}
          </button>
          </div>
        )}
      </div>

      {/* Export Buttons */}
      {dataLoaded && (summaryData.length > 0 || detailData.length > 0 || activityData.length > 0 || historicalData.length > 0) && (
        <div className="flex justify-end gap-2 flex-wrap">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={() => {
              const exportData = getFormattedExportData();
              if (exportData.length === 0) {
                toast.error('No data to print');
                return;
              }
              const reportName = reportTypes.find(r => r.id === activeReport)?.name || 'Report';
              const headers = Object.keys(exportData[0]);
              
              // Build HTML table from formatted data
              const tableRows = exportData.map((row, idx) => 
                `<tr style="${idx % 2 === 0 ? '' : 'background-color: #f9fafb;'}">
                  ${headers.map(h => `<td>${row[h] ?? '—'}</td>`).join('')}
                </tr>`
              ).join('');
              
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>${reportName}</title>
                      <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; margin: 0; }
                        h1 { font-size: 22px; margin-bottom: 5px; color: #1f2937; }
                        .meta { color: #6b7280; font-size: 11px; margin-bottom: 25px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; }
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
                      <h1>${reportName}</h1>
                      <div class="meta">Generated: ${new Date().toLocaleString()}</div>
                      <table>
                        <thead>
                          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                          ${tableRows}
                        </tbody>
                      </table>
                      <div class="footer">Total Records: ${exportData.length}</div>
                    </body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.print();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      )}

      {/* Report Content */}
      {!dataLoaded ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Report Generated</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Select filters and click "Generate Report" to view data.
          </p>
        </div>
      ) : activeReport === 'activity-log' || activeReport === 'historical-data' ? (
        // Activity Log and Historical Data Reports - handled separately below
        null
      ) : activeReport.startsWith('summary') ? (
        // Summary Reports
        <div className="space-y-4">
          {Object.keys(groupedSummaryData).length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Data Found</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your filters.
              </p>
            </div>
          ) : (
            Object.entries(groupedSummaryData).map(([eventId, group]) => (
              <div key={eventId} className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => toggleEventExpand(Number(eventId))}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="font-medium text-gray-900 dark:text-white">{group.event_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
                        {group.totals.approved} Approved
                      </span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">
                        {group.totals.waiting} Pending
                      </span>
                      <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">
                        {group.totals.rejected} Rejected
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded text-xs font-medium">
                        {group.totals.total} Total
                      </span>
                    </div>
                    {expandedEvents.has(Number(eventId)) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {expandedEvents.has(Number(eventId)) && (
                  <div className="p-4 bg-white dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {activeReport === 'summary-inviter' ? 'Inviter' : 'Group'}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {group.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {activeReport === 'summary-inviter' ? (
                                  <>
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900 dark:text-white">{item.inviter_name}</span>
                                    {item.inviter_group_name && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">({item.inviter_group_name})</span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <Building className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900 dark:text-white">{item.inviter_group_name}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                  item.status === 'approved'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : item.status === 'rejected'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}
                              >
                                {item.status === 'approved' && <Check className="w-3 h-3" />}
                                {item.status === 'rejected' && <X className="w-3 h-3" />}
                                {item.status === 'waiting_for_approval' && <Clock className="w-3 h-3" />}
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.total_invitees}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        // Detail Reports
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {detailData.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Data Found</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your filters.
              </p>
            </div>
          ) : (
            <>
              {/* Result count */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">{detailData.length} record{detailData.length !== 1 ? 's' : ''} found</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {[
                        { key: 'invitee_name', label: 'Invitee' },
                        { key: 'event_name', label: 'Event' },
                        { key: 'inviter_name', label: 'Inviter' },
                        { key: 'category', label: 'Category' },
                        { key: 'status', label: 'Status' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (detailSortColumn === col.key) {
                              setDetailSortDirection(detailSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setDetailSortColumn(col.key);
                              setDetailSortDirection('asc');
                            }
                          }}
                          className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {detailSortColumn === col.key && (
                              detailSortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                      ))}
                      {activeReport === 'detail-approved' && (
                        <>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sent</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Confirmed</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">In</th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Guests</th>
                        </>
                      )}
                      <th
                        onClick={() => {
                          if (detailSortColumn === 'created_at') {
                            setDetailSortDirection(detailSortDirection === 'asc' ? 'desc' : 'asc');
                          } else {
                            setDetailSortColumn('created_at');
                            setDetailSortDirection('asc');
                          }
                        }}
                        className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {detailSortColumn === 'created_at' && (
                            detailSortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      // Sort data only if a column is selected
                      let dataToDisplay = [...detailData];
                      if (detailSortColumn) {
                        dataToDisplay.sort((a, b) => {
                          const aVal = (a[detailSortColumn as keyof typeof a] || '').toString().toLowerCase();
                          const bVal = (b[detailSortColumn as keyof typeof b] || '').toString().toLowerCase();
                          if (detailSortDirection === 'asc') {
                            return aVal.localeCompare(bVal);
                          } else {
                            return bVal.localeCompare(aVal);
                          }
                        });
                      }
                      // Paginate
                      const startIndex = (detailPage - 1) * detailPageSize;
                      const paginated = dataToDisplay.slice(startIndex, startIndex + detailPageSize);
                      return paginated.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-2 py-2 max-w-[140px]">
                            <div className="truncate text-sm font-medium text-gray-900 dark:text-white" title={item.invitee_name}>{item.invitee_name}</div>
                            <div className="truncate text-xs text-gray-500 dark:text-gray-400" title={item.invitee_email}>{item.invitee_email}</div>
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-900 dark:text-white max-w-[100px] truncate" title={item.event_name}>
                            {item.event_name}
                          </td>
                          <td className="px-2 py-2 max-w-[120px]">
                            <div className="truncate text-sm text-gray-900 dark:text-white" title={item.inviter_name}>{item.inviter_name}</div>
                            {item.inviter_group_name && (
                              <div className="truncate text-xs text-gray-500 dark:text-gray-400" title={item.inviter_group_name}>{item.inviter_group_name}</div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 max-w-[80px] truncate" title={item.category || ''}>
                            {item.category || '—'}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                item.status === 'approved'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : item.status === 'rejected'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          {activeReport === 'detail-approved' && (
                            <>
                              <td className="px-2 py-2 text-sm">
                                {item.attendance_code ? (
                                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono dark:text-gray-300">
                                    {item.attendance_code}
                                  </code>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">—</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-sm">
                                {item.invitation_sent ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-sm">
                                {item.attendance_confirmed === true ? (
                                  <span className="text-green-600">✓ ({item.confirmed_guests || 0})</span>
                                ) : item.attendance_confirmed === false ? (
                                  <span className="text-red-600">✗</span>
                                ) : (
                                  <span className="text-gray-400">Pending</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-sm">
                                {item.checked_in ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">—</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-sm">
                                <span className="text-gray-700 dark:text-gray-300">
                                  {item.checked_in ? item.actual_guests : item.plus_one || 0}
                                </span>
                              </td>
                            </>
                          )}
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {item.created_at ? formatDateEgypt(item.created_at) : '—'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={detailPage}
                totalItems={detailData.length}
                itemsPerPage={detailPageSize}
                onPageChange={setDetailPage}
                onItemsPerPageChange={(size) => { setDetailPageSize(size); setDetailPage(1); }}
              />
            </>
          )}
        </div>
      )}

      {/* Activity Log Report */}
      {dataLoaded && activeReport === 'activity-log' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {activityData.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Activity Found</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <>
              {/* Result count */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">{activityData.length} record{activityData.length !== 1 ? 's' : ''} found</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {[
                        { key: 'timestamp', label: 'Time' },
                        { key: 'action', label: 'Action' },
                        { key: 'username', label: 'User' },
                        { key: 'user_role', label: 'Role' },
                        { key: 'inviter_group_name', label: 'Group' },
                        { key: 'table_name', label: 'Table' },
                        { key: 'record_id', label: 'ID' },
                        { key: 'new_value', label: 'Details' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (activitySortColumn === col.key) {
                              setActivitySortDirection(activitySortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setActivitySortColumn(col.key);
                              setActivitySortDirection('asc');
                            }
                          }}
                          className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {activitySortColumn === col.key && (
                              activitySortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      // Sort data only if a column is selected
                      let dataToDisplay = [...activityData];
                      if (activitySortColumn) {
                        dataToDisplay.sort((a, b) => {
                          const aVal = (a[activitySortColumn as keyof typeof a] || '').toString().toLowerCase();
                          const bVal = (b[activitySortColumn as keyof typeof b] || '').toString().toLowerCase();
                          if (activitySortDirection === 'asc') {
                            return aVal.localeCompare(bVal);
                          } else {
                            return bVal.localeCompare(aVal);
                          }
                        });
                      }
                      // Paginate
                      const startIndex = (activityPage - 1) * activityPageSize;
                      const paginated = dataToDisplay.slice(startIndex, startIndex + activityPageSize);
                      return paginated.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 truncate" title={item.timestamp ? formatDateTimeEgypt(item.timestamp) : ''}>
                            {item.timestamp ? formatDateTimeEgypt(item.timestamp) : '—'}
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium truncate max-w-full ${
                              item.action.includes('approve') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              item.action.includes('reject') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              item.action.includes('delete') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              item.action.includes('create') || item.action.includes('add') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              item.action.includes('update') ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              item.action.includes('login') || item.action.includes('logout') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`} title={formatActionName(item.action)}>
                              {formatActionName(item.action)}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-900 dark:text-white truncate" title={item.username || 'System'}>
                            {item.username || 'System'}
                          </td>
                          <td className="px-2 py-2">
                            {item.user_role ? (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                item.user_role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                                item.user_role === 'director' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}>
                                {item.user_role.charAt(0).toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 truncate" title={item.inviter_group_name || ''}>
                            {item.inviter_group_name || '—'}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 truncate" title={item.table_name}>
                            {item.table_name}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                            {item.record_id || '—'}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 truncate" title={item.new_value || ''}>
                            {item.new_value ? (item.new_value.length > 30 ? item.new_value.substring(0, 30) + '...' : item.new_value) : '—'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={activityPage}
                totalItems={activityData.length}
                itemsPerPage={activityPageSize}
                onPageChange={setActivityPage}
                onItemsPerPageChange={(size) => { setActivityPageSize(size); setActivityPage(1); }}
              />
            </>
          )}
        </div>
      )}

      {/* Historical Data Report */}
      {dataLoaded && activeReport === 'historical-data' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {historicalData.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No Historical Data Found</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your filters or check back later.
              </p>
            </div>
          ) : (
            <>
              {/* Result count */}
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                <p className="text-sm text-gray-600 dark:text-gray-400">{historicalData.length} record{historicalData.length !== 1 ? 's' : ''} found</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {[
                        { key: 'event_name', label: 'Event' },
                        { key: 'invitee_name', label: 'Invitee' },
                        { key: 'position', label: 'Position' },
                        { key: 'inviter_name', label: 'Inviter' },
                        { key: 'inviter_group_name', label: 'Group' },
                        { key: 'status', label: 'Status' },
                        { key: 'status_date', label: 'Date' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => {
                            if (historicalSortColumn === col.key) {
                              setHistoricalSortDirection(historicalSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setHistoricalSortColumn(col.key);
                              setHistoricalSortDirection('asc');
                            }
                          }}
                          className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {historicalSortColumn === col.key && (
                              historicalSortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(() => {
                      // Sort data only if a column is selected
                      let dataToDisplay = [...historicalData];
                      if (historicalSortColumn) {
                        dataToDisplay.sort((a, b) => {
                          const aVal = (a[historicalSortColumn as keyof HistoricalInvitee] || '').toString().toLowerCase();
                          const bVal = (b[historicalSortColumn as keyof HistoricalInvitee] || '').toString().toLowerCase();
                          if (historicalSortDirection === 'asc') {
                            return aVal.localeCompare(bVal);
                          } else {
                            return bVal.localeCompare(aVal);
                          }
                        });
                      }
                      // Paginate
                      const startIndex = (historicalPage - 1) * historicalPageSize;
                      const paginated = dataToDisplay.slice(startIndex, startIndex + historicalPageSize);
                      return paginated.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-2 py-2 text-sm text-gray-900 dark:text-white max-w-[120px] truncate" title={item.event_name}>
                            {item.event_name}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-900 dark:text-white max-w-[150px] truncate" title={item.invitee_name}>
                            {item.invitee_name}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 max-w-[120px] truncate" title={item.position || ''}>
                            {item.position || '—'}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-900 dark:text-white max-w-[120px] truncate" title={item.inviter_name}>
                            {item.inviter_name}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 max-w-[100px] truncate" title={item.inviter_group_name || ''}>
                            {item.inviter_group_name || '—'}
                          </td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              item.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {item.status_date || '—'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={historicalPage}
                totalItems={historicalData.length}
                itemsPerPage={historicalPageSize}
                onPageChange={setHistoricalPage}
                onItemsPerPageChange={(size) => { setHistoricalPageSize(size); setHistoricalPage(1); }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
