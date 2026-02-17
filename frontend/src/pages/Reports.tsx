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
  Eye,
  Info,
} from 'lucide-react';
import { reportsAPI, eventsAPI, inviterGroupsAPI, invitersAPI, settingsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Event, InviterGroup, Inviter, EventInvitee } from '../types';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportHelpers';
import TablePagination from '../components/common/TablePagination';
import { formatDateTimeEgypt } from '../utils/formatters';
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
  formatted_details: string | null;
  detail_lines: string[];
  entity_name: string | null;
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
  quota?: number | null;
}

export default function Reports() {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState<ReportType>('summary-group');
  const [events, setEvents] = useState<Event[]>([]);
  const [inviterGroups, setInviterGroups] = useState<InviterGroup[]>([]);
  const [inviters, setInviters] = useState<Inviter[]>([]);
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
  
  // Activity detail modal
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogEntry | null>(null);

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
  const [logoScale, setLogoScale] = useState<number>(100);
  const [logoPaddingTop, setLogoPaddingTop] = useState<number>(0);
  const [logoPaddingBottom, setLogoPaddingBottom] = useState<number>(0);

  const isAdmin = user?.role === 'admin';
  const isDirector = user?.role === 'director';
  const canViewReports = isAdmin || isDirector;

  useEffect(() => {
    if (canViewReports) {
      loadFilters();
    }
  }, [canViewReports]);

  // For directors: auto-set group filter to their group and default to a relevant report
  useEffect(() => {
    if (isDirector && user?.inviter_group_id) {
      setGroupFilter(String(user.inviter_group_id));
    }
  }, [isDirector, user?.inviter_group_id]);

  const loadFilters = async () => {
    try {
      // Load basic filters first
      const [eventsRes, groupsRes, invitersRes] = await Promise.all([
        eventsAPI.getAll(),
        inviterGroupsAPI.getAll(),
        isAdmin ? invitersAPI.getAll(true) : invitersAPI.getMyGroupInviters(true),
      ]);
      setEvents(eventsRes.data);
      setInviterGroups(groupsRes.data);
      setInviters(invitersRes.data);
      
      // Load activity log filters separately (admin only)
      if (isAdmin) {
        try {
          const [actionsRes, usersRes] = await Promise.all([
            reportsAPI.activityLogActions(),
            reportsAPI.activityLogUsers(),
          ]);
          setActivityActions(actionsRes.data);
          setActivityUsers(usersRes.data as ActivityUser[]);
        } catch {
          console.log('Activity log filters not loaded');
        }
        
        // Load historical data filters (admin only)
        try {
          const historicalFiltersRes = await reportsAPI.historicalFilters();
          setHistoricalInviters(historicalFiltersRes.data.inviters || []);
          setHistoricalEvents(historicalFiltersRes.data.events || []);
          setHistoricalGroups(historicalFiltersRes.data.groups || []);
        } catch {
          console.log('Historical filters not loaded');
        }
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
      if (settings.logo_scale?.value) setLogoScale(Number(settings.logo_scale.value) || 100);
      if (settings.logo_padding_top?.value) setLogoPaddingTop(Number(settings.logo_padding_top.value) || 0);
      if (settings.logo_padding_bottom?.value) setLogoPaddingBottom(Number(settings.logo_padding_bottom.value) || 0);
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
    if (inviterFilter && activeReport !== 'historical-data') filters.inviter_id = inviterFilter;

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
      'undo_mark_invitations_sent': 'Invitation Sent Undone',
      'admin_confirm_attendance': 'Attendance Confirmed (Admin)',
      'reset_attendance_confirmation': 'Confirmation Reset',
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
        'Details': item.formatted_details || item.new_value || '—',
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
        'Date & Time': item.status_date ? formatDateTimeEgypt(item.status_date) : '—',
      }));
    }

    const isSummary = activeReport.startsWith('summary');
    const rawData = isSummary ? summaryData : detailData;

    if (rawData.length === 0) return [];

    // Transform data based on report type with clean headers and proper column ordering
    if (activeReport === 'detail-approved') {
      // Full Approved Details: columns vary by role
      return (rawData as EventInvitee[]).map(item => {
        const row: Record<string, any> = {
          'Event': item.event_name || '—',
          'Invitee Name': item.invitee_name || '—',
        };
        if (isAdmin) {
          row['Phone'] = item.invitee_phone || '—';
          row['Email'] = item.invitee_email || '—';
        }
        row['Inviter'] = item.inviter_name || '—';
        row['Category'] = item.category || '—';
        row['Inviter Group'] = item.inviter_group_name || '—';
        row['Submitted By'] = item.submitter_name || '—';
        row['Status'] = item.status === 'waiting_for_approval' ? 'Pending' : 
                  item.status === 'approved' ? 'Approved' : 'Rejected';
        row['Approved By'] = item.approved_by_name || '—';
        if (isAdmin) {
          row['Attendance Code'] = item.attendance_code || '—';
        }
        row['Invitation Sent'] = item.invitation_sent ? 'Yes' : 'No';
        row['Sent Via'] = item.invitation_method || '—';
        row['Confirmed'] = item.attendance_confirmed === true ? 'Yes' : 
                     item.attendance_confirmed === false ? 'No' : 'Pending';
        row['Confirmed Guests'] = item.confirmed_guests ?? '—';
        row['Checked In'] = item.checked_in ? 'Yes' : 'No';
        row['Actual Guests'] = item.actual_guests ?? 0;
        row['Plus One Allowed'] = item.plus_one || 0;
        row['Date & Time'] = item.created_at ? formatDateTimeEgypt(item.created_at) : '—';
        return row;
      });
    } else if (activeReport === 'detail-event') {
      // Detailed Invitees: columns vary by role
      return (rawData as EventInvitee[]).map(item => {
        const row: Record<string, any> = {
          'Event': item.event_name || '—',
          'Invitee Name': item.invitee_name || '—',
        };
        if (isAdmin) {
          row['Phone'] = item.invitee_phone || '—';
          row['Email'] = item.invitee_email || '—';
        }
        row['Position'] = item.invitee_position || '—';
        row['Inviter'] = item.inviter_name || '—';
        row['Category'] = item.category || '—';
        row['Inviter Group'] = item.inviter_group_name || '—';
        row['Submitted By'] = item.submitter_name || '—';
        row['Status'] = item.status === 'waiting_for_approval' ? 'Pending' : 
                  item.status === 'approved' ? 'Approved' : 'Rejected';
        row['Approved/Rejected By'] = item.approved_by_name || '—';
        row['Date & Time'] = item.created_at ? formatDateTimeEgypt(item.created_at) : '—';
        return row;
      });
    } else if (activeReport === 'summary-group') {
      // Summary by Group: Event, Inviter Group, Status, Total, Quota
      return (rawData as SummaryData[]).map(item => ({
        'Event': item.event_name || '—',
        'Inviter Group': item.inviter_group_name || '—',
        'Status': item.status === 'waiting_for_approval' ? 'Pending' : 
                  item.status === 'approved' ? 'Approved' : 'Rejected',
        'Total Invitees': item.total_invitees || 0,
        'Quota': item.quota != null ? item.quota : '∞',
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

    // Build logo options from admin settings (shared by PDF and Excel)
    const logoOptions = exportLogosLoaded
      ? { logoLeft: exportLogoLeft, logoRight: exportLogoRight, logoScale, logoPaddingTop, logoPaddingBottom }
      : undefined;

    try {
      if (format === 'csv') {
        exportToCSV(exportData, filename);
      } else if (format === 'excel') {
        exportToExcel(exportData, filename, reportName, logoImageData, logoOptions);
      } else if (format === 'pdf') {
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

  const allReportTypes = [
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
      description: 'Approved invitees with attendance status',
      icon: Check,
    },
    {
      id: 'activity-log' as ReportType,
      name: 'Activity Log',
      description: 'System activity log showing all actions performed',
      icon: Activity,
      adminOnly: true,
    },
    {
      id: 'historical-data' as ReportType,
      name: 'Historical Data',
      description: 'Historical invitee data from previous records',
      icon: FileText,
      adminOnly: true,
    },
  ] as const;

  const reportTypes = allReportTypes.filter(r => isAdmin || !(r as any).adminOnly);

  if (!canViewReports) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            You do not have permission to access reports.
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
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${reportTypes.length <= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-5'} gap-3`}>
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => {
              setActiveReport(report.id);
              setDataLoaded(false);
              setSummaryData([]);
              setDetailData([]);
              setInviterFilter('');
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

            {isAdmin && (
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
            )}

            {(activeReport === 'summary-inviter' || activeReport === 'detail-event' || activeReport === 'detail-approved') && (
              <select
                value={inviterFilter}
                onChange={(e) => setInviterFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
              >
                <option value="">All Inviters</option>
                {inviters
                  .filter(inv => !isDirector || !user?.inviter_group_id || inv.inviter_group_id === user.inviter_group_id)
                  .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name}{inv.inviter_group_name ? ` (${inv.inviter_group_name})` : ''}
                  </option>
                ))}
              </select>
            )}

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
              
              // Build print logo HTML from dynamic settings (with sizing)
              const sf = logoScale / 100;
              const pH = Math.round(45 * sf);
              const pW = Math.round(130 * sf);
              const pT = logoPaddingTop;
              const pB = logoPaddingBottom;
              const printLeftLogo = exportLogosLoaded && exportLogoLeft
                ? `<img src="${exportLogoLeft}" style="height:${pH}px;max-width:${pW}px;margin-top:-${pT}px;margin-bottom:-${pB}px;" />`
                : '';
              const printRightLogo = exportLogosLoaded && exportLogoRight
                ? `<img src="${exportLogoRight}" style="height:${pH}px;max-width:${pW}px;margin-top:-${pT}px;margin-bottom:-${pB}px;" />`
                : '';

              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <html>
                    <head>
                      <title>${reportName}</title>
                      <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; margin: 0; }
                        .print-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
                        .print-header-center { text-align: center; flex: 1; }
                        .print-header-center h1 { font-size: 22px; margin: 0 0 4px 0; color: #1f2937; }
                        .print-header-center .meta { color: #6b7280; font-size: 11px; }
                        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 15px; table-layout: auto; }
                        th { background-color: #2980b9; color: white; padding: 10px 8px; text-align: left; font-weight: 600; white-space: nowrap; }
                        td { border-bottom: 1px solid #e5e7eb; padding: 8px; word-wrap: break-word; max-width: 200px; }
                        tr:hover { background-color: #f3f4f6; }
                        .footer { margin-top: 20px; font-size: 10px; color: #9ca3af; text-align: center; }
                        @media print {
                          body { padding: 10px; }
                          @page { size: landscape; margin: 10mm; }
                          table { width: 100%; font-size: 9px; table-layout: auto; }
                          th { padding: 4px 6px; font-size: 9px; }
                          td { padding: 4px 6px; font-size: 9px; max-width: none; }
                        }
                      </style>
                    </head>
                    <body>
                      <div class="print-header">
                        <div>${printLeftLogo}</div>
                        <div class="print-header-center">
                          <h1>${reportName}</h1>
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
                  <div className="flex items-center gap-3 min-w-0">
                    <Calendar className="w-5 h-5 text-primary shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-white truncate">{group.event_name}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
                      <span className="hidden sm:inline-flex px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded text-xs font-medium">
                        {group.totals.approved} Approved
                      </span>
                      <span className="hidden sm:inline-flex px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded text-xs font-medium">
                        {group.totals.waiting} Pending
                      </span>
                      <span className="hidden sm:inline-flex px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">
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
                    <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            {activeReport === 'summary-inviter' ? 'Inviter' : 'Group'}
                          </th>
                          <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Status
                          </th>
                          <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Count
                          </th>
                          {activeReport === 'summary-group' && (
                            <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Quota
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {group.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-2 sm:px-4 py-2">
                              <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                {activeReport === 'summary-inviter' ? (
                                  <>
                                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{item.inviter_name}</span>
                                    {item.inviter_group_name && (
                                      <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">({item.inviter_group_name})</span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <Building className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                                    <span className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{item.inviter_group_name}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-2">
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
                            <td className="px-2 sm:px-4 py-2 text-right">
                              <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                                {item.total_invitees}
                              </span>
                            </td>
                            {activeReport === 'summary-group' && (
                              <td className="px-2 sm:px-4 py-2 text-right">
                                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                  {item.quota != null ? item.quota : '∞'}
                                </span>
                              </td>
                            )}
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
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {(activeReport === 'detail-approved'
                        ? [
                            { key: 'invitee_name', label: 'Invitee', hideClass: '' },
                            { key: 'event_name', label: 'Event', hideClass: '' },
                            { key: 'inviter_name', label: 'Inviter', hideClass: 'hidden lg:table-cell' },
                            { key: 'category', label: 'Category', hideClass: 'hidden xl:table-cell' },
                            { key: 'submitter_name', label: 'Submitted By', hideClass: 'hidden md:table-cell' },
                            { key: 'status', label: 'Status', hideClass: '' },
                            { key: 'approved_by_name', label: 'Approved By', hideClass: 'hidden md:table-cell' },
                          ]
                        : [
                            { key: 'invitee_name', label: 'Invitee', hideClass: '' },
                            { key: 'event_name', label: 'Event', hideClass: '' },
                            { key: 'inviter_name', label: 'Inviter', hideClass: 'hidden lg:table-cell' },
                            { key: 'category', label: 'Category', hideClass: 'hidden xl:table-cell' },
                            { key: 'submitter_name', label: 'Submitted By', hideClass: 'hidden md:table-cell' },
                            { key: 'status', label: 'Status', hideClass: '' },
                            { key: 'approved_by_name', label: 'Approved/Rejected By', hideClass: 'hidden lg:table-cell' },
                          ]
                      ).map(col => (
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
                          className={`px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${col.hideClass}`}
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
                          {isAdmin && <th className="hidden xl:table-cell px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Code</th>}
                          <th className="hidden lg:table-cell px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sent</th>
                          <th className="hidden lg:table-cell px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Confirmed</th>
                          <th className="hidden xl:table-cell px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">In</th>
                          <th className="hidden xl:table-cell px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Guests</th>
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
                        className="hidden lg:table-cell px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <div className="flex items-center gap-1">
                          Date & Time
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
                            {isAdmin && <div className="truncate text-xs text-gray-500 dark:text-gray-400" title={item.invitee_email}>{item.invitee_email}</div>}
                          </td>
                          <td className="px-2 py-2 text-sm text-gray-900 dark:text-white max-w-[100px] truncate" title={item.event_name}>
                            {item.event_name}
                          </td>
                          <td className="hidden lg:table-cell px-2 py-2 max-w-[120px]">
                            <div className="truncate text-sm text-gray-900 dark:text-white" title={item.inviter_name}>{item.inviter_name}</div>
                            {item.inviter_group_name && (
                              <div className="truncate text-xs text-gray-500 dark:text-gray-400" title={item.inviter_group_name}>{item.inviter_group_name}</div>
                            )}
                          </td>
                          <td className="hidden xl:table-cell px-2 py-2 text-sm text-gray-500 dark:text-gray-400 max-w-[80px] truncate" title={item.category || ''}>
                            {item.category || '—'}
                          </td>
                          <td className="hidden md:table-cell px-2 py-2 text-sm text-gray-900 dark:text-white max-w-[110px] truncate" title={item.submitter_name || ''}>
                            {item.submitter_name || '—'}
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
                          {activeReport === 'detail-event' && (
                            <td className="hidden lg:table-cell px-2 py-2 text-sm text-gray-900 dark:text-white max-w-[110px] truncate" title={item.approved_by_name || ''}>
                              {item.approved_by_name || '—'}
                            </td>
                          )}
                          {activeReport === 'detail-approved' && (
                            <>
                              <td className="hidden md:table-cell px-2 py-2 text-sm text-gray-900 dark:text-white max-w-[110px] truncate" title={item.approved_by_name || ''}>
                                {item.approved_by_name || '—'}
                              </td>
                              {isAdmin && (
                                <td className="hidden xl:table-cell px-2 py-2 text-sm">
                                  {item.attendance_code ? (
                                    <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono dark:text-gray-300">
                                      {item.attendance_code}
                                    </code>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-500">—</span>
                                  )}
                                </td>
                              )}
                              <td className="hidden lg:table-cell px-2 py-2 text-sm">
                                {item.invitation_sent ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="hidden lg:table-cell px-2 py-2 text-sm">
                                {item.attendance_confirmed === true ? (
                                  <span className="text-green-600">✓ ({item.confirmed_guests || 0})</span>
                                ) : item.attendance_confirmed === false ? (
                                  <span className="text-red-600">✗</span>
                                ) : (
                                  <span className="text-gray-400">Pending</span>
                                )}
                              </td>
                              <td className="hidden xl:table-cell px-2 py-2 text-sm">
                                {item.checked_in ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">—</span>
                                )}
                              </td>
                              <td className="hidden xl:table-cell px-2 py-2 text-sm">
                                <span className="text-gray-700 dark:text-gray-300">
                                  {item.checked_in ? item.actual_guests : item.plus_one || 0}
                                </span>
                              </td>
                            </>
                          )}
                          <td className="hidden lg:table-cell px-2 py-2 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {item.created_at ? formatDateTimeEgypt(item.created_at) : '—'}
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
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => setSelectedActivity(item)}>
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
                          <td className="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <div className="max-w-[260px] truncate">
                                {(() => {
                                  const details = item.formatted_details || item.new_value;
                                  if (!details) return '—';
                                  return details.length > 60 ? details.substring(0, 60) + '…' : details;
                                })()}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedActivity(item); }}
                                className="flex-shrink-0 p-0.5 text-gray-400 hover:text-primary dark:hover:text-blue-400 rounded"
                                title="View full details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

      {/* Activity Log Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedActivity(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-2.5">
                <Info className="w-5 h-5 text-primary" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">Activity Details</h3>
              </div>
              <button onClick={() => setSelectedActivity(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-5 py-4 overflow-y-auto max-h-[calc(85vh-130px)] space-y-4">
              {/* Action Badge + Timestamp */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium ${
                  selectedActivity.action.includes('approve') ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  selectedActivity.action.includes('reject') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  selectedActivity.action.includes('delete') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  selectedActivity.action.includes('create') || selectedActivity.action.includes('add') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  selectedActivity.action.includes('update') ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  selectedActivity.action.includes('login') || selectedActivity.action.includes('logout') ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {formatActionName(selectedActivity.action)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedActivity.timestamp ? formatDateTimeEgypt(selectedActivity.timestamp) : '—'}
                </span>
              </div>

              {/* Entity Name (who/what was affected) */}
              {selectedActivity.entity_name && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800/30">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-0.5">Target</p>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">{selectedActivity.entity_name}</p>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Performed By</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedActivity.username || 'System'}</p>
                  {selectedActivity.user_role && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{selectedActivity.user_role}</p>
                  )}
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Group</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedActivity.inviter_group_name || '—'}</p>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Table</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedActivity.table_name}</p>
                </div>
                <div className="p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Record ID</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedActivity.record_id || '—'}</p>
                </div>
              </div>

              {/* Details / Changes */}
              {selectedActivity.detail_lines && selectedActivity.detail_lines.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    {selectedActivity.action.includes('update') ? 'Changes' : 'Details'}
                  </p>
                  <div className="space-y-1.5">
                    {selectedActivity.detail_lines.map((line, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm">
                        {selectedActivity.action.includes('update') && line.includes('→') ? (
                          <>
                            <span className="text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{line.split(':')[0]}:</span>
                            <span className="text-gray-900 dark:text-white break-all">{line.substring(line.indexOf(':') + 1).trim()}</span>
                          </>
                        ) : (
                          <span className="text-gray-900 dark:text-white break-all">{line}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IP Address */}
              {selectedActivity.ip_address && (
                <div className="pt-2 border-t dark:border-gray-700">
                  <p className="text-xs text-gray-400 dark:text-gray-500">IP: {selectedActivity.ip_address}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
              <button onClick={() => setSelectedActivity(null)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500">
                Close
              </button>
            </div>
          </div>
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
                            {item.status_date ? formatDateTimeEgypt(item.status_date) : '—'}
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
