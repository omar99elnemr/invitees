import { useState, useEffect } from 'react';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Search,
  Building,
  User,
} from 'lucide-react';
import { approvalsAPI, eventsAPI, inviterGroupsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Event, EventInvitee, InviterGroup } from '../types';
import toast from 'react-hot-toast';
import TablePagination from '../components/common/TablePagination';
import SortableColumnHeader, { applySorting, type SortDirection } from '../components/common/SortableColumnHeader';
import { formatDateTimeEgypt } from '../utils/formatters';

export default function Approvals() {
  const { user } = useAuth();
  
  // Read tab from URL query params
  const getInitialTab = (): 'pending' | 'approved' => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return tab === 'approved' ? 'approved' : 'pending';
  };
  
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>(getInitialTab());
  const [pendingApprovals, setPendingApprovals] = useState<EventInvitee[]>([]);
  const [approvedInvitees, setApprovedInvitees] = useState<EventInvitee[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [inviterGroups, setInviterGroups] = useState<InviterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showQuickRejectModal, setShowQuickRejectModal] = useState(false);
  const [showCancelApprovalModal, setShowCancelApprovalModal] = useState(false);
  const [quickRejectInvitee, setQuickRejectInvitee] = useState<EventInvitee | null>(null);
  const [cancelApprovalInvitee, setCancelApprovalInvitee] = useState<EventInvitee | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [quickRejectNotes, setQuickRejectNotes] = useState('');
  const [cancelApprovalNotes, setCancelApprovalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort
  const handleSort = (field: string) => {
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  // Check permissions
  const canApprove = user?.role === 'admin' || user?.role === 'director';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (canApprove) {
      fetchData();
    }
  }, [canApprove]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [approvalsRes, approvedRes, eventsRes] = await Promise.all([
        approvalsAPI.getPending(),
        approvalsAPI.getApproved(),
        eventsAPI.getAll(),
      ]);
      setPendingApprovals(approvalsRes.data);
      setApprovedInvitees(approvedRes.data);
      setEvents(eventsRes.data);

      // Only fetch inviter groups for admins
      if (user?.role === 'admin') {
        const groupsRes = await inviterGroupsAPI.getAll();
        setInviterGroups(groupsRes.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories from approvals
  const uniqueCategories = [...new Set([
    ...pendingApprovals.map(a => a.category).filter(Boolean),
    ...approvedInvitees.map(a => a.category).filter(Boolean)
  ])];

  // Filter approvals
  const filteredApprovals = applySorting(pendingApprovals.filter(approval => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      approval.invitee_name?.toLowerCase().includes(q) ||
      approval.invitee_email?.toLowerCase().includes(q) ||
      approval.inviter_name?.toLowerCase().includes(q) ||
      approval.invitee_position?.toLowerCase().includes(q) ||
      approval.invitee_company?.toLowerCase().includes(q);
    const matchesEvent = eventFilter === 'all' || approval.event_id.toString() === eventFilter;
    const matchesGroup = groupFilter === 'all' || approval.inviter_group_name === groupFilter;
    const matchesCategory = categoryFilter === 'all' || approval.category === categoryFilter;
    return matchesSearch && matchesEvent && matchesGroup && matchesCategory;
  }), sortField, sortDirection);

  // Filter approved invitees
  const filteredApproved = applySorting(approvedInvitees.filter(invitee => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      invitee.invitee_name?.toLowerCase().includes(q) ||
      invitee.invitee_email?.toLowerCase().includes(q) ||
      invitee.inviter_name?.toLowerCase().includes(q) ||
      invitee.invitee_position?.toLowerCase().includes(q) ||
      invitee.invitee_company?.toLowerCase().includes(q);
    const matchesEvent = eventFilter === 'all' || invitee.event_id.toString() === eventFilter;
    const matchesGroup = groupFilter === 'all' || invitee.inviter_group_name === groupFilter;
    const matchesCategory = categoryFilter === 'all' || invitee.category === categoryFilter;
    return matchesSearch && matchesEvent && matchesGroup && matchesCategory;
  }), sortField, sortDirection);

  // Pagination
  const paginatedApprovals = filteredApprovals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Selection handlers
  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    const currentList = activeTab === 'pending' ? filteredApprovals : filteredApproved;

    if (selectedIds.size === currentList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentList.map(a => a.id)));
    }
  };

  // Approve handlers
  const handleApprove = async () => {
    if (selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      const result = await approvalsAPI.approve(
        Array.from(selectedIds),
        approvalNotes || undefined
      );
      toast.success(`Approved ${result.data.success_count} invitation(s)`);
      if (result.data.failed_count > 0) {
        toast.error(`${result.data.failed_count} failed`);
      }
      setShowApproveModal(false);
      setSelectedIds(new Set());
      setApprovalNotes('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  // Reject handlers
  const handleReject = async () => {
    if (selectedIds.size === 0) return;

    setSubmitting(true);
    try {
      const result = await approvalsAPI.reject(
        Array.from(selectedIds),
        approvalNotes || undefined
      );
      toast.success(`Rejected ${result.data.success_count} invitation(s)`);
      if (result.data.failed_count > 0) {
        toast.error(`${result.data.failed_count} failed`);
      }
      setShowRejectModal(false);
      setSelectedIds(new Set());
      setApprovalNotes('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick approve single
  const quickApprove = async (id: number) => {
    setSubmitting(true);
    try {
      await approvalsAPI.approve([id]);
      toast.success('Approved');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  // Open quick reject modal
  const openQuickRejectModal = (invitee: EventInvitee) => {
    setQuickRejectInvitee(invitee);
    setQuickRejectNotes('');
    setShowQuickRejectModal(true);
  };

  // Quick reject single with notes
  const handleQuickReject = async () => {
    if (!quickRejectInvitee) return;

    setSubmitting(true);
    try {
      await approvalsAPI.reject([quickRejectInvitee.id], quickRejectNotes || undefined);
      toast.success('Rejected');
      setShowQuickRejectModal(false);
      setQuickRejectInvitee(null);
      setQuickRejectNotes('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  // Open cancel approval modal
  const openCancelApprovalModal = (invitee: EventInvitee | null = null) => {
    setCancelApprovalInvitee(invitee); // null means bulk cancel
    setCancelApprovalNotes('');
    setShowCancelApprovalModal(true);
  };

  // Handle cancel approval (Single or Bulk)
  const handleCancelApproval = async () => {
    if (!cancelApprovalNotes.trim()) {
      toast.error('Reason for cancellation is required');
      return;
    }

    setSubmitting(true);
    try {
      const idsToCancel = cancelApprovalInvitee
        ? [cancelApprovalInvitee.id]
        : Array.from(selectedIds);

      await approvalsAPI.cancelApproval(idsToCancel, cancelApprovalNotes);

      const count = idsToCancel.length;
      toast.success(count > 1 ? `Cancelled ${count} approvals` : 'Approval cancelled');

      setShowCancelApprovalModal(false);
      setCancelApprovalInvitee(null);
      setCancelApprovalNotes('');
      setSelectedIds(new Set());
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel approval');
    } finally {
      setSubmitting(false);
    }
  };

  if (!canApprove) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Only Directors and Admins can access the approvals page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <TableSkeleton rows={6} cols={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Approvals</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and manage invitations
          </p>
        </div>

        {/* Stats Pills */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveTab('pending'); setSelectedIds(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'pending' 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md' 
                : 'bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:border-amber-700'
            }`}
          >
            <Clock className={`w-5 h-5 ${activeTab === 'pending' ? 'text-white' : 'text-amber-600 dark:text-amber-400'}`} />
            <span className={`text-lg font-bold ${activeTab === 'pending' ? 'text-white' : 'text-amber-700 dark:text-amber-400'}`}>
              {pendingApprovals.length}
            </span>
            <span className={`text-sm ${activeTab === 'pending' ? 'text-amber-100' : 'text-amber-600 dark:text-amber-400'}`}>Pending</span>
          </button>
          <button
            onClick={() => { setActiveTab('approved'); setSelectedIds(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'approved' 
                ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md' 
                : 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:border-emerald-700'
            }`}
          >
            <CheckCircle className={`w-5 h-5 ${activeTab === 'approved' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span className={`text-lg font-bold ${activeTab === 'approved' ? 'text-white' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {approvedInvitees.length}
            </span>
            <span className={`text-sm ${activeTab === 'approved' ? 'text-emerald-100' : 'text-emerald-600 dark:text-emerald-400'}`}>Approved</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex">
            <button
              onClick={() => { setActiveTab('pending'); setSelectedIds(new Set()); }}
              className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'pending'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Clock className="w-4 h-4 inline-block mr-2" />
              Pending
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'pending' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                {pendingApprovals.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('approved'); setSelectedIds(new Set()); }}
              className={`flex-1 sm:flex-none px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'approved'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <CheckCircle className="w-4 h-4 inline-block mr-2" />
              Approved
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${activeTab === 'approved' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                {approvedInvitees.length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Bulk Actions Bar - Hidden for admin users */}
      {activeTab === 'pending' && !isAdmin && (
        <div className={`rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
          selectedIds.size > 0 
            ? 'bg-primary/5 border border-primary/20' 
            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-2">
            <Users className={`w-5 h-5 ${selectedIds.size > 0 ? 'text-primary' : 'text-gray-400'}`} />
            <span className={`font-medium ${selectedIds.size > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select items to perform bulk actions'}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Clear Selection
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-4 h-4 inline mr-2" />
                Reject Selected
              </button>
              <button
                onClick={() => setShowApproveModal(true)}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Approve Selected
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'approved' && !isAdmin && (
        <div className={`rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
          selectedIds.size > 0 
            ? 'bg-primary/5 border border-primary/20' 
            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center gap-2">
            <Users className={`w-5 h-5 ${selectedIds.size > 0 ? 'text-primary' : 'text-gray-400'}`} />
            <span className={`font-medium ${selectedIds.size > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select items to perform bulk actions'}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Clear Selection
              </button>
              <button
                onClick={() => openCancelApprovalModal(null)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                <XCircle className="w-4 h-4 inline mr-2" />
                Cancel Approval ({selectedIds.size})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, email, or inviter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
          />
        </div>

        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Events</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>

        {isAdmin && (
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Groups</option>
            {inviterGroups.map((group) => (
              <option key={group.id} value={group.name}>
                {group.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All Categories</option>
          {uniqueCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

      </div>

      {/* Pending Tab Content */}
      {activeTab === 'pending' && (
        <>
          {/* Approvals Table */}
          {filteredApprovals.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                No pending approvals at the moment.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredApprovals.length && filteredApprovals.length > 0}
                          onChange={selectAll}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </th>
                      <SortableColumnHeader field="invitee_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Invitee</SortableColumnHeader>
                      <SortableColumnHeader field="event_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Event</SortableColumnHeader>
                      <SortableColumnHeader field="inviter_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden md:table-cell">Invited By</SortableColumnHeader>
                      <SortableColumnHeader field="invitee_position" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Position / Company</SortableColumnHeader>
                      <SortableColumnHeader field="submitter_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Submitted</SortableColumnHeader>
                      {!isAdmin && (
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedApprovals.map((approval) => (
                      <tr
                        key={approval.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedIds.has(approval.id) ? 'bg-primary/5' : ''}`}
                        onClick={() => toggleSelect(approval.id)}
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(approval.id)}
                            onChange={() => toggleSelect(approval.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="flex items-center">
                            <div className="hidden sm:flex flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full items-center justify-center">
                              <span className="text-primary font-medium">
                                {approval.invitee_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="sm:ml-4 min-w-0">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white whitespace-normal break-words">
                                {approval.invitee_name}
                              </div>
                              {/* Mobile-only summary tags for hidden columns */}
                              <div className="flex flex-wrap gap-1 mt-0.5 md:hidden">
                                {approval.inviter_name && <span className="text-[10px] px-1.5 py-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{approval.inviter_name}</span>}
                                {isAdmin && approval.inviter_group_name && <span className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">{approval.inviter_group_name}</span>}
                                {(approval.invitee_position || approval.invitee_company) && <span className="text-[10px] px-1.5 py-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{[approval.invitee_position, approval.invitee_company].filter(Boolean).join(' · ')}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white whitespace-normal break-words">{approval.event_name}</div>
                          {approval.category && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{approval.category}</div>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {approval.inviter_name || '-'}
                          </div>
                          {isAdmin && approval.inviter_group_name && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {approval.inviter_group_name}
                            </div>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-normal">
                          {approval.invitee_position && (
                            <div className="text-xs sm:text-sm text-gray-900 dark:text-white whitespace-normal break-words">{approval.invitee_position}</div>
                          )}
                          {approval.invitee_company && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-normal break-words">{approval.invitee_company}</div>
                          )}
                          {!approval.invitee_position && !approval.invitee_company && (
                            <div className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white">{approval.submitter_name || '-'}</div>
                          {approval.created_at && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTimeEgypt(approval.created_at)}
                            </div>
                          )}
                        </td>
                        {!isAdmin && (
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                            <div className="flex items-center justify-end gap-1 sm:gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openQuickRejectModal(approval)}
                                disabled={submitting}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button
                                onClick={() => quickApprove(approval.id)}
                                disabled={submitting}
                                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-full transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <TablePagination
                currentPage={currentPage}
                totalItems={filteredApprovals.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
              />
            </div>
          )}
        </>
      )}

      {/* Approved Tab Content */}
      {activeTab === 'approved' && (
        <>
          {filteredApproved.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No approved invitees</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Approved invitees will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredApproved.length && filteredApproved.length > 0}
                          onChange={selectAll}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </th>
                      <SortableColumnHeader field="invitee_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Invitee</SortableColumnHeader>
                      <SortableColumnHeader field="event_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Event</SortableColumnHeader>
                      <SortableColumnHeader field="inviter_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden md:table-cell">Invited By</SortableColumnHeader>
                      <SortableColumnHeader field="invitee_position" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Position / Company</SortableColumnHeader>
                      <SortableColumnHeader field="submitter_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Submitted</SortableColumnHeader>
                      <SortableColumnHeader field="approved_by_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden xl:table-cell">Approved By</SortableColumnHeader>
                      {!isAdmin && (
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredApproved.map((invitee) => (
                      <tr
                        key={invitee.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedIds.has(invitee.id) ? 'bg-primary/5' : ''}`}
                        onClick={() => toggleSelect(invitee.id)}
                      >
                        <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(invitee.id)}
                            onChange={() => toggleSelect(invitee.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="flex items-center">
                            <div className="hidden sm:flex flex-shrink-0 h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center">
                              <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div className="sm:ml-4 min-w-0">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white whitespace-normal break-words">{invitee.invitee_name}</div>
                              {/* Mobile-only summary tags for hidden columns */}
                              <div className="flex flex-wrap gap-1 mt-0.5 md:hidden">
                                {(invitee.inviter_name || invitee.submitter_name) && <span className="text-[10px] px-1.5 py-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{invitee.inviter_name || invitee.submitter_name}</span>}
                                {isAdmin && invitee.inviter_group_name && <span className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">{invitee.inviter_group_name}</span>}
                                {(invitee.invitee_position || invitee.invitee_company) && <span className="text-[10px] px-1.5 py-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{[invitee.invitee_position, invitee.invitee_company].filter(Boolean).join(' · ')}</span>}
                                {invitee.category && <span className="text-[10px] px-1.5 py-0 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded">{invitee.category}</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white whitespace-normal break-words">{invitee.event_name}</div>
                          {invitee.category && (
                            <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-medium mt-0.5 ${invitee.category === 'Gold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {invitee.category}
                            </span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {invitee.inviter_name || invitee.submitter_name || '-'}
                          </div>
                          {isAdmin && invitee.inviter_group_name && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {invitee.inviter_group_name}
                            </div>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-normal">
                          {invitee.invitee_position && (
                            <div className="text-xs sm:text-sm text-gray-900 dark:text-white whitespace-normal break-words">{invitee.invitee_position}</div>
                          )}
                          {invitee.invitee_company && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-normal break-words">{invitee.invitee_company}</div>
                          )}
                          {!invitee.invitee_position && !invitee.invitee_company && (
                            <div className="text-xs sm:text-sm text-gray-400 dark:text-gray-500">-</div>
                          )}
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white">{invitee.submitter_name || '-'}</div>
                          {invitee.created_at && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTimeEgypt(invitee.created_at)}
                            </div>
                          )}
                        </td>
                        <td className="hidden xl:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 dark:text-white">{invitee.approved_by_name || '-'}</div>
                          {invitee.status_date && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDateTimeEgypt(invitee.status_date)}
                            </div>
                          )}
                        </td>
                        {!isAdmin && (
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); openCancelApprovalModal(invitee); }}
                              disabled={submitting}
                              className="text-red-600 hover:text-red-800 text-xs sm:text-sm font-medium disabled:opacity-50"
                            >
                              Cancel Approval
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredApproved.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
              />
            </div>
          )}
        </>
      )}

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 text-gray-900 dark:text-white">Approve Invitations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                You are about to approve {selectedIds.size} invitation(s).
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Add any notes..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowApproveModal(false); setApprovalNotes(''); }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 text-gray-900 dark:text-white">Reject Invitations</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                You are about to reject {selectedIds.size} invitation(s).
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Add rejection reason..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowRejectModal(false); setApprovalNotes(''); }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Reject Modal - Single Invitee */}
      {showQuickRejectModal && quickRejectInvitee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 text-gray-900 dark:text-white">Reject Invitation</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                Reject <span className="font-medium">{quickRejectInvitee.invitee_name}</span> from{' '}
                <span className="font-medium">{quickRejectInvitee.event_name}</span>?
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rejection Note (optional)
                </label>
                <textarea
                  value={quickRejectNotes}
                  onChange={(e) => setQuickRejectNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Add a reason for rejection..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowQuickRejectModal(false); setQuickRejectInvitee(null); setQuickRejectNotes(''); }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickReject}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Approval Modal */}
      {showCancelApprovalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-orange-100 dark:bg-orange-900/30 rounded-full mb-4">
                <XCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 text-gray-900 dark:text-white">Cancel Approval</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                {cancelApprovalInvitee ? (
                  <>You are about to cancel the approval for <strong>{cancelApprovalInvitee.invitee_name}</strong>.</>
                ) : (
                  <>You are about to cancel the approval for <strong>{selectedIds.size} selected invitees</strong>.</>
                )}
                {' '}This will change their status back to Rejected.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelApprovalNotes}
                  onChange={(e) => setCancelApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white"
                  placeholder="Please provide a reason for cancelling the approval..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCancelApprovalModal(false); setCancelApprovalInvitee(null); setCancelApprovalNotes(''); }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelApproval}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  disabled={submitting || !cancelApprovalNotes.trim()}
                >
                  {submitting ? 'Processing...' : 'Cancel Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
