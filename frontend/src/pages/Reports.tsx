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
} from 'lucide-react';
import { reportsAPI, eventsAPI, inviterGroupsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Event, InviterGroup, EventInvitee } from '../types';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportHelpers';
import toast from 'react-hot-toast';

type ReportType = 'summary-group' | 'summary-inviter' | 'detail-event' | 'detail-approved';

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

  // Filters
  const [eventFilter, setEventFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Grouped data for summary reports
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const canViewReports = user?.role === 'admin';

  useEffect(() => {
    if (canViewReports) {
      loadFilters();
    }
  }, [canViewReports]);

  const loadFilters = async () => {
    try {
      const [eventsRes, groupsRes] = await Promise.all([
        eventsAPI.getAll(),
        inviterGroupsAPI.getAll(),
      ]);
      setEvents(eventsRes.data);
      setInviterGroups(groupsRes.data);
    } catch (error: any) {
      toast.error('Failed to load filter options');
    }
  };

  const generateReport = async () => {
    setLoading(true);
    setDataLoaded(false);

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
      }
      setDataLoaded(true);
      toast.success('Report generated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get formatted export data
  const getFormattedExportData = () => {
    const isSummary = activeReport.startsWith('summary');
    const rawData = isSummary ? summaryData : detailData;

    if (rawData.length === 0) return [];

    // Transform data based on report type with clean headers and proper column ordering
    if (activeReport === 'detail-approved') {
      // Full Approved Details: Event, Name, Phone, Email, Inviter, Category, Status, etc.
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
        'Status Date': item.status_date ? new Date(item.status_date).toLocaleDateString() : '—',
        'Attending': item.is_going === 'yes' ? 'Yes' : item.is_going === 'no' ? 'No' : 'Pending',
        'Guests': item.plus_one || 0,
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
        exportToExcel(exportData, filename, reportName);
      } else if (format === 'pdf') {
        exportToPDF(exportData, filename, reportName, 'landscape');
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
  ];

  if (!canViewReports) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          Only Admins can access reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-600 mt-1">
          Generate and export event and invitee reports
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((report) => (
          <button
            key={report.id}
            onClick={() => {
              setActiveReport(report.id);
              setDataLoaded(false);
              setSummaryData([]);
              setDetailData([]);
            }}
            className={`p-4 rounded-lg border-2 text-left transition-colors ${
              activeReport === report.id
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <report.icon
              className={`w-6 h-6 mb-2 ${
                activeReport === report.id ? 'text-primary' : 'text-gray-400'
              }`}
            />
            <h3 className="font-medium text-gray-900">{report.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{report.description}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="font-medium text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
          >
            <option value="">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>

          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
          >
            <option value="">All Groups</option>
            {inviterGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
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
      </div>

      {/* Export Buttons */}
      {dataLoaded && (summaryData.length > 0 || detailData.length > 0) && (
        <div className="flex justify-end gap-2 flex-wrap">
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      )}

      {/* Report Content */}
      {!dataLoaded ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Report Generated</h3>
          <p className="mt-2 text-sm text-gray-500">
            Select filters and click "Generate Report" to view data.
          </p>
        </div>
      ) : activeReport.startsWith('summary') ? (
        // Summary Reports
        <div className="space-y-4">
          {Object.keys(groupedSummaryData).length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Data Found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your filters.
              </p>
            </div>
          ) : (
            Object.entries(groupedSummaryData).map(([eventId, group]) => (
              <div key={eventId} className="bg-white rounded-lg shadow overflow-hidden">
                <button
                  onClick={() => toggleEventExpand(Number(eventId))}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span className="font-medium text-gray-900">{group.event_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                        {group.totals.approved} Approved
                      </span>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                        {group.totals.waiting} Pending
                      </span>
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                        {group.totals.rejected} Rejected
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
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
                  <div className="p-4">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            {activeReport === 'summary-inviter' ? 'Inviter' : 'Group'}
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Count
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {group.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {activeReport === 'summary-inviter' ? (
                                  <>
                                    <User className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{item.inviter_name}</span>
                                    {item.inviter_group_name && (
                                      <span className="text-xs text-gray-500">({item.inviter_group_name})</span>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <Building className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900">{item.inviter_group_name}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                                  item.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : item.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {item.status === 'approved' && <Check className="w-3 h-3" />}
                                {item.status === 'rejected' && <X className="w-3 h-3" />}
                                {item.status === 'waiting_for_approval' && <Clock className="w-3 h-3" />}
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-right">
                              <span className="text-sm font-medium text-gray-900">
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {detailData.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Data Found</h3>
              <p className="mt-2 text-sm text-gray-500">
                Try adjusting your filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Invitee
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Invited By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    {activeReport === 'detail-approved' && (
                      <>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Attending
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Plus One
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {detailData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.invitee_name}</div>
                          <div className="text-xs text-gray-500">{item.invitee_email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {item.event_name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.inviter_name}</div>
                        {item.inviter_group_name && (
                          <div className="text-xs text-gray-500">{item.inviter_group_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.category || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            item.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'rejected'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      {activeReport === 'detail-approved' && (
                        <>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {item.is_going === 'yes' ? (
                              <span className="text-green-600">Yes</span>
                            ) : item.is_going === 'no' ? (
                              <span className="text-red-600">No</span>
                            ) : (
                              <span className="text-gray-400">Pending</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            {item.plus_one ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {detailData.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t text-sm text-gray-600">
              Total: {detailData.length} record(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
