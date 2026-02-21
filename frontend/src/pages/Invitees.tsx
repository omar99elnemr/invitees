/**
 * Invitees Page - Two Tab Design
 * Tab 1 (Events): View assigned events and submit contacts for approval
 * Tab 2 (Contacts): Manage the inviter group's contact list
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { InlineTableSkeleton, InlineListSkeleton } from '../components/common/LoadingSkeleton';
import Select from 'react-select';
import {
  Users,
  Calendar,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  Download,
  X,
  UserCheck,
  XCircle,
  History,
  FileUp,
  FileSpreadsheet,
  FileText,
  Trash,
  Printer,
  Gauge,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, inviteesAPI, invitersAPI, importAPI, categoriesAPI, inviterGroupsAPI, settingsAPI, GroupQuotaInfo } from '../services/api';
import type { Event, EventInvitee, Inviter, InviteeWithStats, InviteeFormData, Category, InviterGroup } from '../types';
import CategoryManager from '../components/categories/CategoryManager';
import TablePagination from '../components/common/TablePagination';
import SortableColumnHeader, { applySorting, type SortDirection } from '../components/common/SortableColumnHeader';
import { formatDateEgypt } from '../utils/formatters';
import { exportToExcel, exportToPDF, exportToCSV } from '../utils/exportHelpers';

// Status display helpers
const statusColors: Record<string, string> = {
  waiting_for_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  resubmitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
};

const statusLabels: Record<string, string> = {
  waiting_for_approval: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  resubmitted: 'Resubmitted',
};

const eventStatusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ongoing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ended: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

// Determine display status (shows resubmitted if notes exist and status is pending)
const getDisplayStatus = (invitee: EventInvitee): string => {
  if (invitee.status === 'waiting_for_approval' && invitee.notes) {
    return 'resubmitted';
  }
  return invitee.status;
};

// Initial form data
const initialFormData: InviteeFormData = {
  name: '',
  email: '',
  phone: '',
  position: '',
  company: '',
  category: undefined,
  notes: '',
};

export default function Invitees() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const location = useLocation();

  // Read URL params for deep-linking from dashboard
  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlTab = urlParams.get('tab');
  const urlEvent = urlParams.get('event');

  // Active tab state - URL param > sessionStorage > default
  const [activeTab, setActiveTab] = useState<'events' | 'contacts'>(() => {
    if (urlTab === 'events' || urlTab === 'contacts') return urlTab;
    const savedTab = sessionStorage.getItem('invitees_activeTab');
    return (savedTab === 'events' || savedTab === 'contacts') ? savedTab : 'events';
  });

  // Events tab state
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(
    urlEvent ? parseInt(urlEvent, 10) : null
  );
  const [eventInvitees, setEventInvitees] = useState<EventInvitee[]>([]);
  const [inviters, setInviters] = useState<Inviter[]>([]);
  const [editModalInviters, setEditModalInviters] = useState<Inviter[]>([]); // Inviters for edit modal (group-specific for admin)
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingEventInvitees, setLoadingEventInvitees] = useState(false);
  const [quotaInfo, setQuotaInfo] = useState<GroupQuotaInfo | null>(null);

  // Contacts tab state
  const [contacts, setContacts] = useState<InviteeWithStats[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inviterGroups, setInviterGroups] = useState<InviterGroup[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showGroupsModal, setShowGroupsModal] = useState(false);

  // Shared state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);

  // Events tab - submission state
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  
  // Events tab - filters for available contacts
  const [eventInviterFilter, setEventInviterFilter] = useState<string>('all');
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('all');

  // Contacts tab - selection state
  const [selectedContactListIds, setSelectedContactListIds] = useState<number[]>([]);

  // Events tab - resubmit state
  // const [showResubmitModal, setShowResubmitModal] = useState(false); // Removed unused state
  const [resubmitInvitee, setResubmitInvitee] = useState<EventInvitee | null>(null);
  // Removed unused resubmitNotes and setResubmitNotes state

  // Contacts tab - modals
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showDeleteContactModal, setShowDeleteContactModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAdminImportModal, setShowAdminImportModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<InviteeWithStats | null>(null);
  const [contactHistory, setContactHistory] = useState<EventInvitee[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adminImportFile, setAdminImportFile] = useState<File | null>(null);
  const [adminImporting, setAdminImporting] = useState(false);
  const [adminIsDragOver, setAdminIsDragOver] = useState(false);
  const adminFileInputRef = useRef<HTMLInputElement>(null);

  // Export state (admin contacts export)
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [exportLogoLeft, setExportLogoLeft] = useState<string | null>(null);
  const [exportLogoRight, setExportLogoRight] = useState<string | null>(null);
  const [exportLogosLoaded, setExportLogosLoaded] = useState(false);
  const [logoImageData, setLogoImageData] = useState<string>('');
  const [logoScale, setLogoScale] = useState<number>(100);
  const [logoPaddingTop, setLogoPaddingTop] = useState<number>(0);
  const [logoPaddingBottom, setLogoPaddingBottom] = useState<number>(0);

  // Form data
  const [formData, setFormData] = useState<InviteeFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Contacts tab filters
  const [inviterFilter, setInviterFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Handle sort
  const handleSort = (field: string) => {
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };

  // Fetch events (assigned to user's inviter group)
  const fetchEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const response = await eventsAPI.getAll();
      // Filter to active events only
      const activeEvents = response.data.filter(e =>
        e.status === 'upcoming' || e.status === 'ongoing'
      );
      setEvents(activeEvents);
    } catch (error: any) {
      toast.error('Failed to load events');
      console.error(error);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  // Fetch inviters for filter dropdowns
  // Admin: fetch ALL inviters (for filtering across all groups)
  // Non-admin: fetch only their group's inviters
  const fetchInviters = useCallback(async () => {
    try {
      if (isAdmin) {
        const response = await invitersAPI.getAll(true); // active only
        setInviters(response.data);
      } else {
        const response = await invitersAPI.getMyGroupInviters();
        setInviters(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load inviters:', error);
    }
  }, [isAdmin]);

  // Fetch invitees for selected event
  const fetchEventInvitees = useCallback(async (eventId: number) => {
    try {
      setLoadingEventInvitees(true);
      const response = await inviteesAPI.getForEvent(eventId);
      setEventInvitees(response.data);
    } catch (error: any) {
      toast.error('Failed to load event invitees');
      console.error(error);
    } finally {
      setLoadingEventInvitees(false);
    }
  }, []);

  // Fetch contacts (global invitee pool for the group)
  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const response = await inviteesAPI.getAll();
      setContacts(response.data);
    } catch (error: any) {
      toast.error('Failed to load contacts');
      console.error(error);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await categoriesAPI.getAll(true);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories', error);
    }
  }, []);

  // Fetch inviter groups (for admin filtering)
  const fetchInviterGroups = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await inviterGroupsAPI.getAll();
      setInviterGroups(response.data);
    } catch (error) {
      console.error('Failed to load inviter groups', error);
    }
  }, [isAdmin]);

  // Load export logos (for admin export)
  const loadExportLogos = useCallback(async () => {
    if (!isAdmin) return;
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
      setExportLogosLoaded(true);
    }
  }, [isAdmin]);

  const loadLogoData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { logoBase64 } = await import('../utils/logoData');
      setLogoImageData(logoBase64);
    } catch {
      setLogoImageData('');
    }
  }, [isAdmin]);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Export contacts data builder
  const getContactsExportData = () => {
    return filteredContacts.map(c => ({
      'Name': c.name || '',
      'Phone': c.phone || '',
      '2nd Phone': c.secondary_phone || '',
      'Email': c.email || '',
      'Inviter': c.inviter_name || '',
      'Group': c.inviter_group_name || '',
      'Category': c.category || '',
      'Position': c.position || '',
      'Company': c.company || '',
      'Guests': c.plus_one ?? 0,
      'A': c.approved_count ?? 0,
      'P': c.pending_count ?? 0,
      'R': c.rejected_count ?? 0,
      'Total': c.total_events ?? 0,
    }));
  };

  const handleContactsExport = (format: 'excel' | 'pdf' | 'csv') => {
    const data = getContactsExportData();
    if (data.length === 0) {
      toast.error('No contacts to export');
      return;
    }
    const filename = `contacts_export_${new Date().toISOString().split('T')[0]}`;
    const title = 'Contacts Export';
    const logoOptions = exportLogosLoaded
      ? { logoLeft: exportLogoLeft, logoRight: exportLogoRight, logoScale, logoPaddingTop, logoPaddingBottom }
      : undefined;

    try {
      if (format === 'excel') {
        exportToExcel(data, filename, title, logoImageData, logoOptions);
      } else if (format === 'pdf') {
        // PDF-specific column order: hide Company, move Guests after Category before Position
        const pdfData = data.map(row => ({
          'Name': row['Name'],
          'Phone': row['Phone'],
          '2nd Phone': row['2nd Phone'],
          'Email': row['Email'],
          'Inviter': row['Inviter'],
          'Group': row['Group'],
          'Category': row['Category'],
          'Guests': row['Guests'],
          'Position': row['Position'],
          'A': row['A'],
          'P': row['P'],
          'R': row['R'],
          'Total': row['Total'],
        }));
        exportToPDF(pdfData, filename, title, 'landscape', logoOptions);
      } else {
        exportToCSV(data, filename);
      }
      toast.success(`Exported ${data.length} contacts as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to export contacts');
    }
    setShowExportMenu(false);
  };

  // React to URL param changes (deep-linking from dashboard)
  useEffect(() => {
    if (urlTab === 'events' || urlTab === 'contacts') {
      setActiveTab(urlTab);
    }
    if (urlEvent) {
      const eid = parseInt(urlEvent, 10);
      if (!isNaN(eid)) setSelectedEventId(eid);
    }
  }, [urlTab, urlEvent]);

  // Initial load
  useEffect(() => {
    fetchEvents();
    fetchInviters();
    fetchContacts();
    fetchCategories();
    fetchInviterGroups();
    loadExportLogos();
    loadLogoData();
  }, [fetchEvents, fetchInviters, fetchContacts, fetchCategories, fetchInviterGroups, loadExportLogos, loadLogoData]);

  // Load event invitees and quota when event is selected
  useEffect(() => {
    if (selectedEventId) {
      fetchEventInvitees(selectedEventId);
      setSelectedContactIds([]);
      // Fetch quota info for current user's group
      eventsAPI.getQuotas(selectedEventId).then(res => {
        // Non-admins get only their own group's quota
        setQuotaInfo(res.data.length > 0 ? res.data[0] : null);
      }).catch(() => setQuotaInfo(null));
    }
  }, [selectedEventId, fetchEventInvitees]);

  // Get contacts available for submission (not approved for selected event)
  const availableContacts = useMemo(() => {
    if (!selectedEventId) return [];
    // Exclude contacts who are already approved or pending (waiting_for_approval) for this event
    const excludedIds = new Set(
      eventInvitees
        .filter(ei => ei.status === 'approved' || ei.status === 'waiting_for_approval')
        .map(ei => ei.invitee_id)
    );
    return contacts.filter(c => !excludedIds.has(c.id));
  }, [contacts, eventInvitees, selectedEventId]);

  // Get rejected invitees for the selected event (can be resubmitted)
  const rejectedInvitees = useMemo(() => {
    return eventInvitees.filter(ei => ei.status === 'rejected');
  }, [eventInvitees]);

  // Get pending invitees for the selected event
  const pendingInvitees = useMemo(() => {
    return eventInvitees.filter(ei => ei.status === 'waiting_for_approval');
  }, [eventInvitees]);

  // Filter and sort contacts by search
  const filteredContacts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    let result = contacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.company?.toLowerCase().includes(query));
      const matchesInviter = inviterFilter === 'all' || c.inviter_name === inviterFilter;
      const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
      const matchesGroup = groupFilter === 'all' || c.inviter_group_name === groupFilter;
      return matchesSearch && matchesInviter && matchesCategory && matchesGroup;
    });

    return applySorting(result, sortField, sortDirection);
  }, [contacts, searchQuery, sortField, sortDirection, inviterFilter, categoryFilter, groupFilter]);

  // Filter available contacts by search, status, inviter, and category
  const filteredAvailableContacts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    
    let result: InviteeWithStats[];
    
    // If status filter is 'rejected', show rejected contacts from event
    if (statusFilter === 'rejected') {
      result = rejectedInvitees.map(ei => {
        const contact = contacts.find(c => c.id === ei.invitee_id);
        return contact;
      }).filter((c): c is InviteeWithStats => {
        if (c === undefined) return false;
        const matchesSearch = (
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          Boolean(c.company?.toLowerCase().includes(query))
        );
        const matchesInviter = eventInviterFilter === 'all' || c.inviter_name === eventInviterFilter;
        const matchesCategory = eventCategoryFilter === 'all' || c.category === eventCategoryFilter;
        return matchesSearch && matchesInviter && matchesCategory;
      });
    } else {
      result = availableContacts.filter(c => {
        const matchesSearch = (
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          (c.company?.toLowerCase().includes(query))
        );
        const matchesInviter = eventInviterFilter === 'all' || c.inviter_name === eventInviterFilter;
        const matchesCategory = eventCategoryFilter === 'all' || c.category === eventCategoryFilter;
        return matchesSearch && matchesInviter && matchesCategory;
      });
    }
    
    return applySorting(result, sortField, sortDirection);
  }, [availableContacts, searchQuery, statusFilter, rejectedInvitees, contacts, sortField, sortDirection, eventInviterFilter, eventCategoryFilter]);

  // Paginate
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(start, start + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name?.trim()) {
      errors.name = 'Name is required';
    }
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.phone?.trim()) {
      errors.phone = 'Phone is required';
    } else if (!/^201\d{9}$/.test(formData.phone.trim())) {
      errors.phone = 'Phone must start with 20 and be 12 digits (e.g. 201012345678)';
    }
    if (!formData.inviter_id) {
      errors.inviter_id = 'Inviter is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle select all for submission
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedContactIds(filteredAvailableContacts.map(c => c.id));
    } else {
      setSelectedContactIds([]);
    }
  };

  // Refresh quota info for the current event
  const refreshQuota = useCallback(() => {
    if (!selectedEventId) return;
    eventsAPI.getQuotas(selectedEventId).then(res => {
      setQuotaInfo(res.data.length > 0 ? res.data[0] : null);
    }).catch(() => {});
  }, [selectedEventId]);

  // Handle resubmit rejected invitation
  // Removed unused handleResubmit function

  // Handle toggle contact selection
  const handleToggleContact = (contactId: number) => {
    setSelectedContactIds(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  // Handle submit for approval (Bulk)
  const handleSubmitForApproval = async () => {
    if (!selectedEventId || selectedContactIds.length === 0) return;

    // ── Frontend quota pre-check ──────────────────────────────
    if (quotaInfo && quotaInfo.quota !== null && quotaInfo.remaining !== null) {
      if (selectedContactIds.length > quotaInfo.remaining) {
        toast.error(
          `Cannot submit ${selectedContactIds.length} contact(s) — only ${quotaInfo.remaining} of ${quotaInfo.quota} quota remaining for your group.`,
          { duration: 6000 }
        );
        return;
      }
      if (quotaInfo.remaining === 0) {
        toast.error(
          `Quota limit reached — your group has used all ${quotaInfo.quota} allowed submissions.`,
          { duration: 6000 }
        );
        return;
      }
    }

    try {
      setSubmitting(true);

      const response = await inviteesAPI.inviteExistingToEvent(
        selectedEventId,
        selectedContactIds,
        {
          // We don't send inviter_id here as the backend will use the contact's existing inviter_id
          // or the current user's group logic
        }
      );

      const results = response.data.results;
      const successCount = results.successful?.length || 0;
      const crossGroupDuplicates = results.cross_group_duplicates || [];
      const alreadyInvited = results.already_invited || [];
      const failed = results.failed || [];
      const quotaExceeded = results.quota_exceeded || [];

      // Show appropriate messages based on results
      if (successCount > 0) {
        toast.success(`${successCount} contact(s) submitted for approval`);
      }

      // Show quota exceeded errors
      if (quotaExceeded.length > 0) {
        toast.error(
          `${quotaExceeded.length} contact(s) rejected — quota limit reached (${quotaInfo?.quota} allowed for your group).`,
          { duration: 6000 }
        );
      }

      // Show cross-group duplicate errors with clear message
      crossGroupDuplicates.forEach((dup: any) => {
        toast.error(`"${dup.name}" ${dup.reason}`, { duration: 6000 });
      });

      // Show already invited notifications
      if (alreadyInvited.length > 0) {
        toast(`${alreadyInvited.length} contact(s) already invited to this event`, { icon: 'ℹ️' });
      }

      // Show failed notifications
      failed.forEach((f: any) => {
        toast.error(`${f.reason || 'Failed to submit contact'}`);
      });

      // If nothing succeeded and we had cross-group duplicates, show summary
      if (successCount === 0 && crossGroupDuplicates.length > 0 && selectedContactIds.length === crossGroupDuplicates.length) {
        // All were duplicates - no additional message needed, individual errors shown above
      } else if (successCount === 0 && crossGroupDuplicates.length === 0 && alreadyInvited.length === 0 && quotaExceeded.length === 0) {
        toast.error('No contacts were submitted');
      }

      // Clear selection
      setSelectedContactIds([]);

      // Refresh data + quota bar immediately
      fetchEventInvitees(selectedEventId);
      refreshQuota();

    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit contacts');
      console.error(error);
      // Refresh quota even on error (server may have changed state)
      refreshQuota();
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add new contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      // Create contact WITHOUT adding to any event
      // The contact will be available in the contact list for later submission to events
      await inviteesAPI.create(formData);

      toast.success('Contact added to your group\'s contact list');
      setShowAddContactModal(false);
      resetForm();

      // Refresh contacts list
      fetchContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add contact');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit contact
  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedContact) return;
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      await inviteesAPI.update(selectedContact.id, formData);
      toast.success('Contact updated successfully');

      setShowEditContactModal(false);
      setSelectedContact(null);
      resetForm();

      fetchContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update contact');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete contact (admin only)
  const handleDeleteContact = async () => {
    if (!selectedContact) return;

    try {
      setSubmitting(true);
      await inviteesAPI.delete(selectedContact.id);
      toast.success('Contact deleted successfully');

      setShowDeleteContactModal(false);
      setSelectedContact(null);

      fetchContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete contact');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Contacts Tab - Bulk Selection Handlers
  const handleToggleContactListSelection = (contactId: number) => {
    setSelectedContactListIds(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const handleSelectAllContacts = (checked: boolean) => {
    if (checked) {
      // Select all contacts in the CURRENT PAGE or FILTERED LIST? 
      // Usually users expect "Select All" to select visible items. 
      // Let's select from paginatedContacts to be safe/intuitive, or filteredContacts for all pages?
      // Requirement: "Select All functionality". Let's do filteredContacts for power users.
      setSelectedContactListIds(filteredContacts.map(c => c.id));
    } else {
      setSelectedContactListIds([]);
    }
  };

  const handleBulkDeleteContacts = async () => {
    if (selectedContactListIds.length === 0) return;

    try {
      setSubmitting(true);
      await inviteesAPI.deleteBulk(selectedContactListIds);
      toast.success(`${selectedContactListIds.length} contacts deleted successfully`);

      setSelectedContactListIds([]);
      setShowBulkDeleteModal(false);
      fetchContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete contacts');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle view history
  const handleViewHistory = async (contact: InviteeWithStats) => {
    setSelectedContact(contact);
    setShowHistoryModal(true);
    setLoadingHistory(true);

    try {
      const response = await inviteesAPI.getHistory(contact.id);
      setContactHistory(response.data.events);
    } catch (error: any) {
      toast.error('Failed to load history');
      console.error(error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle import
  const handleDownloadTemplate = async () => {
    try {
      await importAPI.downloadTemplate();
      toast.success('Template downloaded');
    } catch (error: any) {
      toast.error('Failed to download template');
    }
  };

  const handleDownloadAdminTemplate = async () => {
    try {
      await importAPI.downloadAdminTemplate();
      toast.success('Admin template downloaded');
    } catch (error: any) {
      toast.error('Failed to download admin template');
    }
  };

  const handleAdminImport = async () => {
    if (!adminImportFile) {
      toast.error('Please select a file');
      return;
    }
    try {
      setAdminImporting(true);
      const response = await importAPI.adminUploadContacts(adminImportFile);
      const { successful, skipped, failed, errors } = response.data;

      if (successful > 0) {
        toast.success(`${successful} contact(s) imported successfully`);
      }

      if (errors && errors.length > 0) {
        const duplicatePhones: string[] = [];
        const invalidPhones: string[] = [];
        const missingFields: string[] = [];
        const updated: string[] = [];
        const groupNotFound: string[] = [];
        const otherErrors: string[] = [];

        errors.forEach((err: string) => {
          if (err.includes('already exists (no changes)')) {
            duplicatePhones.push(err);
          } else if (err.includes('Updated existing contact')) {
            updated.push(err);
          } else if (err.includes('Invalid phone format')) {
            invalidPhones.push(err);
          } else if (err.includes('Missing required field')) {
            missingFields.push(err);
          } else if (err.includes('not found. Please create it first')) {
            groupNotFound.push(err);
          } else {
            otherErrors.push(err);
          }
        });

        if (updated.length > 0) {
          toast.success(`${updated.length} existing contact(s) updated`);
        }
        if (duplicatePhones.length > 0) {
          toast(`${duplicatePhones.length} contact(s) already exist (no changes)`, { icon: 'ℹ️' });
        }
        if (invalidPhones.length > 0) {
          toast.error(`${invalidPhones.length} skipped: Invalid phone format`);
        }
        if (missingFields.length > 0) {
          toast.error(`${missingFields.length} skipped: Missing required fields`);
        }
        if (groupNotFound.length > 0) {
          toast.error(`${groupNotFound.length} skipped: Inviter group not found`);
        }
        if (otherErrors.length > 0) {
          console.log('Other admin import errors:', otherErrors);
        }
        console.log('Admin import details:', errors);
      } else {
        if (skipped > 0) toast(`${skipped} contact(s) skipped`, { icon: 'ℹ️' });
        if (failed > 0) toast.error(`${failed} row(s) failed to import`);
      }

      // Auto-download rejected entries if any
      if (response.data.rejected_rows && response.data.rejected_rows.length > 0) {
        downloadRejectedCSV(response.data.rejected_rows, 'admin_import_rejected');
      }

      setShowAdminImportModal(false);
      setAdminImportFile(null);
      fetchContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Admin import failed');
      console.error(error);
    } finally {
      setAdminImporting(false);
    }
  };

  // Auto-download rejected rows as CSV
  const downloadRejectedCSV = (rejectedRows: Record<string, string>[], prefix = 'rejected') => {
    if (!rejectedRows || rejectedRows.length === 0) return;
    // Build CSV header from keys (exclude internal fields, keep 'reason' last)
    const keys = Object.keys(rejectedRows[0]).filter(k => k !== 'reason');
    const header = [...keys, 'Rejection Reason'];
    const rows = rejectedRows.map(row =>
      [...keys.map(k => `"${(row[k] || '').replace(/"/g, '""')}"`), `"${(row.reason || '').replace(/"/g, '""')}"`].join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prefix}_entries_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`${rejectedRows.length} rejected/skipped entries downloaded as CSV`, { icon: '📥', duration: 5000 });
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setImporting(true);
      const response = await importAPI.uploadContacts(importFile);

      console.log('Full response:', response.data); // Debug full response
      const { successful, skipped, failed, errors } = response.data;

      // Show success count
      if (successful > 0) {
        toast.success(`${successful} contact(s) imported successfully`);
      }

      // Analyze errors to show specific reasons
      if (errors && errors.length > 0) {
        console.log('Errors array:', errors); // Debug errors array
        const duplicatePhones: string[] = [];
        const invalidPhones: string[] = [];
        const missingFields: string[] = [];
        const updated: string[] = [];
        const otherErrors: string[] = [];

        errors.forEach((err: string) => {
          console.log('Processing error:', err); // Debug log
          if (err.includes('already exists (no changes)')) {
            duplicatePhones.push(err);
          } else if (err.includes('Updated existing contact')) {
            updated.push(err);
          } else if (err.includes('Invalid phone format')) {
            invalidPhones.push(err);
          } else if (err.includes('Missing required field')) {
            missingFields.push(err);
          } else {
            otherErrors.push(err);
          }
        });

        // Show categorized messages
        console.log('Counts:', { updated: updated.length, duplicatePhones: duplicatePhones.length, invalidPhones: invalidPhones.length });
        if (updated.length > 0) {
          toast.success(`${updated.length} existing contact(s) updated`);
        }
        if (duplicatePhones.length > 0) {
          toast(`${duplicatePhones.length} contact(s) already exist (no changes)`, { icon: 'ℹ️' });
        }
        if (invalidPhones.length > 0) {
          toast.error(`${invalidPhones.length} skipped: Invalid phone format (must start with 20, 12 digits)`);
        }
        // Email validation removed - no invalid email messages
        if (missingFields.length > 0) {
          toast.error(`${missingFields.length} skipped: Missing required fields (name, email, phone, inviter)`);
        }
        if (otherErrors.length > 0) {
          console.log('Other import errors:', otherErrors);
        }

        // Log all errors for debugging
        console.log('Import details:', errors);
      } else {
        // No errors array, show generic messages
        if (skipped > 0) {
          toast(`${skipped} contact(s) skipped`, { icon: 'ℹ️' });
        }
        if (failed > 0) {
          toast.error(`${failed} row(s) failed to import`);
        }
      }

      // Auto-download rejected entries if any
      if (response.data.rejected_rows && response.data.rejected_rows.length > 0) {
        downloadRejectedCSV(response.data.rejected_rows, 'import_rejected');
      }

      setShowImportModal(false);
      setImportFile(null);

      fetchContacts();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Import failed');
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  // Open edit modal
  // For admin: fetch inviters from the contact's inviter group to maintain group isolation
  // For non-admin: use the already loaded inviters (from their own group)
  const openEditModal = async (contact: InviteeWithStats) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      secondary_phone: (contact as any).secondary_phone || '',
      title: (contact as any).title || '',
      address: (contact as any).address || '',
      position: contact.position || '',
      company: contact.company || '',
      category: contact.category,
      inviter_id: contact.inviter_id,
      plus_one: (contact as any).plus_one || 0,
      notes: (contact as any).notes || '',
    });
    
    // For admin, fetch inviters only from the contact's inviter group
    if (isAdmin && contact.inviter_group_id) {
      try {
        const response = await invitersAPI.getByGroup(contact.inviter_group_id, true);
        setEditModalInviters(response.data);
      } catch (error) {
        console.error('Failed to load group inviters for edit modal:', error);
        setEditModalInviters([]);
      }
    } else {
      // Non-admin uses the regular inviters list (their own group)
      setEditModalInviters(inviters);
    }
    
    setShowEditContactModal(true);
  };

  // Open delete modal (admin only)
  const openDeleteModal = (contact: InviteeWithStats) => {
    setSelectedContact(contact);
    setShowDeleteContactModal(true);
  };

  // Get selected event
  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Invitees</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage event invitations and contacts</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex overflow-x-auto">
            <button
              onClick={() => { setActiveTab('events'); sessionStorage.setItem('invitees_activeTab', 'events'); setSearchQuery(''); }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === 'events'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Events</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'events' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                {events.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('contacts'); sessionStorage.setItem('invitees_activeTab', 'contacts'); setSearchQuery(''); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === 'contacts'
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
            >
              <Users className="w-4 h-4" />
              <span>Contacts</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'contacts' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                {contacts.length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* EVENTS TAB */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Event Selector */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Event
            </label>
            {loadingEvents ? (
              <InlineListSkeleton rows={3} />
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">No active events assigned to your group</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {events.map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className={`group p-4 rounded-xl border text-left transition-all hover:-translate-y-0.5 ${selectedEventId === event.id
                      ? 'border-indigo-300 dark:border-indigo-600 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className={`font-medium truncate ${selectedEventId === event.id ? 'text-indigo-900 dark:text-indigo-300' : 'text-gray-900 dark:text-white'}`}>{event.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-lg shrink-0 ${eventStatusColors[event.status]}`}>
                        {event.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDateEgypt(event.start_date)}
                    </p>
                    {event.venue && (
                      <p className="text-sm text-gray-400 truncate mt-1">{event.venue}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Event Content */}
          {selectedEventId && selectedEvent && (
            <>
              {/* Event Info Header */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">{selectedEvent.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {formatDateEgypt(selectedEvent.start_date)} - {formatDateEgypt(selectedEvent.end_date)}
                    </p>
                    {selectedEvent.venue && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 truncate">{selectedEvent.venue}</p>
                    )}
                    {selectedEvent.inviter_group_names && selectedEvent.inviter_group_names.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Assigned Groups:</span>
                        <button
                          onClick={() => setShowGroupsModal(true)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/40 transition-colors cursor-pointer"
                          title="Click to view assigned groups"
                        >
                          <Users className="w-3.5 h-3.5" />
                          {selectedEvent.inviter_group_names.length} {selectedEvent.inviter_group_names.length === 1 ? 'Group' : 'Groups'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 sm:gap-4 text-sm shrink-0">
                    <button
                      onClick={() => {
                        if (user?.role === 'admin' || user?.role === 'director') {
                          window.location.href = '/approvals?tab=pending';
                        } else {
                          toast.error('Only Directors and Admins can access pending approvals');
                        }
                      }}
                      className="flex-1 sm:flex-none text-center hover:bg-yellow-50 dark:hover:bg-yellow-900/20 p-2 rounded-lg transition-colors cursor-pointer"
                      title="View pending approvals"
                    >
                      <div className="text-xl sm:text-2xl font-bold text-yellow-600 dark:text-yellow-500">{pendingInvitees.length}</div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pending</div>
                    </button>
                    <button
                      onClick={() => {
                        if (user?.role === 'admin' || user?.role === 'director') {
                          window.location.href = '/approvals?tab=approved';
                        } else {
                          toast.error('Only Directors and Admins can access approved invitees');
                        }
                      }}
                      className="flex-1 sm:flex-none text-center hover:bg-green-50 dark:hover:bg-green-900/20 p-2 rounded-lg transition-colors cursor-pointer"
                      title="View approved invitees"
                    >
                      <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-500">
                        {eventInvitees.filter(ei => ei.status === 'approved').length}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Approved</div>
                    </button>
                    <button
                      onClick={() => {
                        setStatusFilter('rejected');
                        toast.success('Showing rejected contacts');
                      }}
                      className="flex-1 sm:flex-none text-center hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors cursor-pointer"
                      title="Filter to rejected contacts"
                    >
                      <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-500">{rejectedInvitees.length}</div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Rejected</div>
                    </button>
                  </div>
                </div>
              </div>



              {/* Quota Banner */}
              {quotaInfo && quotaInfo.quota !== null && !isAdmin && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                  quotaInfo.remaining === 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : quotaInfo.remaining !== null && quotaInfo.remaining <= 5
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                      : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                }`}>
                  <Gauge className={`w-5 h-5 shrink-0 ${
                    quotaInfo.remaining === 0 ? 'text-red-500' : quotaInfo.remaining !== null && quotaInfo.remaining <= 5 ? 'text-amber-500' : 'text-indigo-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Group Quota: {quotaInfo.used} / {quotaInfo.quota}
                      </span>
                      <span className={`text-xs font-medium ${
                        quotaInfo.remaining === 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {quotaInfo.remaining === 0 ? 'Quota reached' : `${quotaInfo.remaining} remaining`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          quotaInfo.remaining === 0 ? 'bg-red-500' : quotaInfo.remaining !== null && quotaInfo.remaining <= 5 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min((quotaInfo.used / (quotaInfo.quota || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Status Filter Badge */}
              {statusFilter !== 'all' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <span className="text-sm text-red-700 dark:text-red-400">
                    Showing: <strong>{statusFilter}</strong> contacts
                  </span>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              {/* Submit New Contacts Section */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700">
                <div className="p-4 border-b dark:border-gray-600">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary" />
                    {statusFilter === 'rejected' ? 'Rejected Contacts' : 'Submit Contacts for Approval'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {statusFilter === 'rejected' 
                      ? 'These contacts were rejected - you can resubmit them'
                      : 'Select contacts from your group\'s list to submit for this event'
                    }
                  </p>
                </div>

                {/* Submission Controls */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 space-y-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search contacts..."
                          className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white text-sm"
                        />
                      </div>
                    </div>
                    {/* Inviter Filter */}
                    <div className="min-w-[160px]">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Inviter</label>
                      <Select
                        value={eventInviterFilter === 'all' ? null : { value: eventInviterFilter, label: eventInviterFilter }}
                        onChange={(option) => setEventInviterFilter(option ? option.value : 'all')}
                        options={inviters.map(inv => ({ value: inv.name, label: inv.name }))}
                        isClearable
                        placeholder="All Inviters"
                        className="text-sm"
                        classNamePrefix="react-select"
                        styles={{
                          control: (base) => ({ ...base, minHeight: '38px', borderColor: '#d1d5db' }),
                          placeholder: (base) => ({ ...base, color: '#6b7280' }),
                        }}
                      />
                    </div>
                    {/* Category Filter */}
                    <div className="min-w-[140px]">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
                      <select
                        value={eventCategoryFilter}
                        onChange={(e) => setEventCategoryFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white text-sm"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Submit Button */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedContactIds.length > 0 && (
                        <span className="font-medium text-primary">
                          {selectedContactIds.length} contact(s) selected
                        </span>
                      )}
                    </div>
                    {!isAdmin && (
                      <button
                        onClick={handleSubmitForApproval}
                        disabled={selectedContactIds.length === 0 || submitting || (quotaInfo?.quota !== null && quotaInfo?.quota !== undefined && quotaInfo?.remaining === 0)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        title={quotaInfo?.remaining === 0 ? 'Quota limit reached' : undefined}
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Submitting...
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Submit for Approval{quotaInfo?.quota !== null && quotaInfo?.quota !== undefined && selectedContactIds.length > 0 && quotaInfo?.remaining !== null
                              ? ` (${selectedContactIds.length}/${quotaInfo.remaining} remaining)`
                              : ''}
                          </>
                        )}
                      </button>
                    )}
                    {isAdmin && (
                      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg text-sm">
                        Admins cannot submit contacts - assign organizers to do this
                      </div>
                    )}
                  </div>
                </div>

                {/* Contacts Table */}
                {loadingEventInvitees ? (
                  <InlineTableSkeleton rows={5} cols={4} />
                ) : filteredAvailableContacts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No contacts available</p>
                    <p className="text-sm">All contacts have been submitted or approved for this event</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedContactIds.length === filteredAvailableContacts.length && filteredAvailableContacts.length > 0}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </th>
                          <SortableColumnHeader field="name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Name</SortableColumnHeader>
                          <SortableColumnHeader field="inviter_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden sm:table-cell">Inviter</SortableColumnHeader>
                          <SortableColumnHeader field="category" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Category</SortableColumnHeader>
                          <SortableColumnHeader field="plus_one" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Guests</SortableColumnHeader>
                          <SortableColumnHeader field="position" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden xl:table-cell">Position</SortableColumnHeader>
                          {isAdmin ? (
                            <SortableColumnHeader field="inviter_group_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Group</SortableColumnHeader>
                          ) : (
                            <SortableColumnHeader field="company" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden xl:table-cell">Company</SortableColumnHeader>
                          )}
                          {!isAdmin && (
                            <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredAvailableContacts.map(contact => {
                          // Find if this contact is rejected for this event
                          const rejectedInvitee = eventInvitees.find(ei => ei.invitee_id === contact.id && ei.status === 'rejected');
                          return (
                            <tr
                              key={contact.id}
                              className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedContactIds.includes(contact.id) ? 'bg-primary/5' : ''
                                }`}
                              onClick={() => handleToggleContact(contact.id)}
                            >
                              <td className="px-2 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedContactIds.includes(contact.id)}
                                  onChange={() => handleToggleContact(contact.id)}
                                  className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3">
                                <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                                  {contact.name}
                                  {rejectedInvitee && (
                                    <button
                                      type="button"
                                      className="ml-1 p-1 rounded-full bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50"
                                      title="Rejected - click for details"
                                      onClick={e => {
                                        e.stopPropagation();
                                        setResubmitInvitee(rejectedInvitee);
                                      }}
                                    >
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    </button>
                                  )}
                                </div>
                                {/* Mobile-only summary tags for hidden columns */}
                                <div className="flex flex-wrap gap-1 mt-0.5 sm:hidden">
                                  {contact.inviter_name && <span className="text-[10px] px-1.5 py-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{contact.inviter_name}</span>}
                                  {contact.category && <span className="text-[10px] px-1.5 py-0 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded">{contact.category}</span>}
                                  {isAdmin && contact.inviter_group_name && <span className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">{contact.inviter_group_name}</span>}
                                </div>
                              </td>
                              <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">{contact.inviter_name || '-'}</td>
                              <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3">
                                {contact.category && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">{contact.category}</span>
                                )}
                              </td>
                              <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">{contact.plus_one || 0}</td>
                              <td className="hidden xl:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">{contact.position || '-'}</td>
                              {isAdmin ? (
                                <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3">
                                  {contact.inviter_group_name ? (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">{contact.inviter_group_name}</span>
                                  ) : <span className="text-xs text-gray-400">-</span>}
                                </td>
                              ) : (
                                <td className="hidden xl:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">{contact.company || '-'}</td>
                              )}
                              {!isAdmin && (
                                <td className="px-2 sm:px-4 py-2 sm:py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={async () => {
                                      if (!selectedEventId) return;
                                      // Frontend quota pre-check for single submit
                                      if (quotaInfo && quotaInfo.quota !== null && quotaInfo.remaining !== null && quotaInfo.remaining <= 0) {
                                        toast.error(
                                          `Quota limit reached — your group has used all ${quotaInfo.quota} allowed submissions.`,
                                          { duration: 6000 }
                                        );
                                        return;
                                      }
                                      try {
                                        setSubmitting(true);
                                        const response = await inviteesAPI.inviteExistingToEvent(selectedEventId, [contact.id], {});
                                        const results = response.data.results;
                                        const successCount = results.successful?.length || 0;
                                        const crossGroupDuplicates = results.cross_group_duplicates || [];
                                        const alreadyInvited = results.already_invited || [];
                                        const quotaExceeded = results.quota_exceeded || [];

                                        if (successCount > 0) {
                                          toast.success(`${contact.name} submitted for approval`);
                                        } else if (quotaExceeded.length > 0) {
                                          toast.error(
                                            `Cannot submit "${contact.name}" — quota limit reached (${quotaInfo?.quota} allowed for your group).`,
                                            { duration: 6000 }
                                          );
                                        } else if (crossGroupDuplicates.length > 0) {
                                          toast.error(`"${contact.name}" ${crossGroupDuplicates[0].reason}`, { duration: 6000 });
                                        } else if (alreadyInvited.length > 0) {
                                          toast(`${contact.name} is already invited to this event`, { icon: 'ℹ️' });
                                        } else {
                                          toast.error(`Failed to submit ${contact.name}`);
                                        }
                                        fetchEventInvitees(selectedEventId);
                                        refreshQuota();
                                      } catch (error: any) {
                                        toast.error(error.response?.data?.error || 'Failed to submit contact');
                                        refreshQuota();
                                      } finally {
                                        setSubmitting(false);
                                      }
                                    }}
                                    disabled={submitting || (quotaInfo?.quota !== null && quotaInfo?.quota !== undefined && quotaInfo?.remaining === 0)}
                                    className="text-primary hover:text-primary-dark text-sm font-medium disabled:opacity-50"
                                  >
                                    Submit
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* No Event Selected */}
          {!selectedEventId && !loadingEvents && events.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select an Event</h3>
              <p className="text-gray-500 dark:text-gray-400">Choose an event above to manage invitee submissions</p>
            </div>
          )}
        </div>
      )}

      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search contacts..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                />
              </div>
              <Select
                value={inviterFilter === 'all' ? null : { value: inviterFilter, label: inviterFilter }}
                onChange={(option) => { setInviterFilter(option ? option.value : 'all'); setCurrentPage(1); }}
                options={inviters.map(inv => ({ value: inv.name, label: inv.name }))}
                isClearable
                placeholder="All Inviters"
                className="min-w-[160px] text-sm"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({ ...base, minHeight: '38px', borderColor: '#d1d5db' }),
                  placeholder: (base) => ({ ...base, color: '#6b7280' }),
                }}
              />
              {isAdmin && (
                <Select
                  value={groupFilter === 'all' ? null : { value: groupFilter, label: groupFilter }}
                  onChange={(option) => { setGroupFilter(option ? option.value : 'all'); setCurrentPage(1); }}
                  options={inviterGroups.map(g => ({ value: g.name, label: g.name }))}
                  isClearable
                  placeholder="All Groups"
                  className="min-w-[160px] text-sm"
                  classNamePrefix="react-select"
                  styles={{
                    control: (base) => ({ ...base, minHeight: '38px', borderColor: '#d1d5db' }),
                    placeholder: (base) => ({ ...base, color: '#6b7280' }),
                  }}
                />
              )}
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white text-sm"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isAdmin && (
                <>
                  {selectedContactListIds.length > 0 && (
                    <button
                      onClick={() => setShowBulkDeleteModal(true)}
                      disabled={submitting}
                      className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span> ({selectedContactListIds.length})
                    </button>
                  )}
                  <button
                    onClick={() => setShowCategoryManager(true)}
                    className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm"
                    title="Manage Categories"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Manage Categories</span>
                  </button>
                  <button
                    onClick={() => setShowAdminImportModal(true)}
                    className="px-3 sm:px-4 py-2 border border-purple-300 dark:border-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center gap-2 text-sm"
                    title="Admin Import"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin Import</span>
                  </button>
                  <div className="relative" ref={exportMenuRef}>
                    <button
                      onClick={() => setShowExportMenu(prev => !prev)}
                      className="px-3 sm:px-4 py-2 border border-green-300 dark:border-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-2 text-sm"
                      title="Export Contacts"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 py-1">
                        <button
                          onClick={() => handleContactsExport('csv')}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                        >
                          <Download className="w-4 h-4" />
                          CSV
                        </button>
                        <button
                          onClick={() => handleContactsExport('excel')}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          Excel
                        </button>
                        <button
                          onClick={() => handleContactsExport('pdf')}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                        >
                          <FileText className="w-4 h-4" />
                          PDF
                        </button>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                        <button
                          onClick={() => {
                            const data = getContactsExportData();
                            if (data.length === 0) {
                              toast.error('No contacts to print');
                              setShowExportMenu(false);
                              return;
                            }
                            const headers = Object.keys(data[0]);
                            const tableRows = data.map((row, idx) =>
                              `<tr style="${idx % 2 === 0 ? '' : 'background-color: #f9fafb;'}">
                                ${headers.map(h => `<td>${(row as Record<string, any>)[h] ?? '—'}</td>`).join('')}
                              </tr>`
                            ).join('');

                            const scaleFactor = logoScale / 100;
                            const printH = Math.round(45 * scaleFactor);
                            const printW = Math.round(130 * scaleFactor);
                            const pTop = logoPaddingTop;
                            const pBot = logoPaddingBottom;
                            const printLeftLogo = exportLogosLoaded && exportLogoLeft
                              ? `<img src="${exportLogoLeft}" style="height:${printH}px;max-width:${printW}px;margin-top:-${pTop}px;margin-bottom:-${pBot}px;" />`
                              : '';
                            const printRightLogo = exportLogosLoaded && exportLogoRight
                              ? `<img src="${exportLogoRight}" style="height:${printH}px;max-width:${printW}px;margin-top:-${pTop}px;margin-bottom:-${pBot}px;" />`
                              : '';

                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Contacts Export</title>
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
                                        <h1>Contacts Export</h1>
                                        <div class="meta">Generated: ${new Date().toLocaleString()} — ${data.length} contacts</div>
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
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center gap-2.5"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {!isAdmin && (
                <>
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 flex items-center gap-2 text-sm"
                    title="Import"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                  <button
                    onClick={() => { setShowAddContactModal(true); resetForm(); }}
                    className="px-3 sm:px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Add Contact</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
            {loadingContacts ? (
              <InlineTableSkeleton rows={8} cols={5} />
            ) : paginatedContacts.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-medium">No contacts found</p>
                {searchQuery && <p className="text-sm">Try adjusting your search</p>}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedContactListIds.length > 0 && selectedContactListIds.length === filteredContacts.length}
                            onChange={(e) => handleSelectAllContacts(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </th>
                        <SortableColumnHeader field="name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Name</SortableColumnHeader>
                        <SortableColumnHeader field="inviter_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden sm:table-cell">Inviter</SortableColumnHeader>
                        <SortableColumnHeader field="category" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Category</SortableColumnHeader>
                        <SortableColumnHeader field="plus_one" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Guests</SortableColumnHeader>
                        <SortableColumnHeader field="position" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden xl:table-cell">Position</SortableColumnHeader>
                        {isAdmin ? (
                          <SortableColumnHeader field="inviter_group_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Group</SortableColumnHeader>
                        ) : (
                          <SortableColumnHeader field="company" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden xl:table-cell">Company</SortableColumnHeader>
                        )}
                        <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Events</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedContacts.map(contact => (
                        <tr
                          key={contact.id}
                          className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${selectedContactListIds.includes(contact.id) ? 'bg-primary/5' : ''}`}
                          onClick={() => handleToggleContactListSelection(contact.id)}
                        >
                          <td className="px-2 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedContactListIds.includes(contact.id)}
                              onChange={() => handleToggleContactListSelection(contact.id)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <div className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">{contact.name}</div>
                            {/* Mobile-only summary tags for hidden columns */}
                            <div className="flex flex-wrap gap-1 mt-0.5 sm:hidden">
                              {contact.inviter_name && <span className="text-[10px] px-1.5 py-0 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">{contact.inviter_name}</span>}
                              {contact.category && <span className="text-[10px] px-1.5 py-0 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded">{contact.category}</span>}
                              {isAdmin && contact.inviter_group_name && <span className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">{contact.inviter_group_name}</span>}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">{contact.inviter_name || '-'} </td>
                          <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3">
                            {contact.category ? (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded">{contact.category}</span>
                            ) : '-'}
                          </td>
                          <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            {contact.plus_one !== undefined ? contact.plus_one : 0}
                          </td>
                          <td className="hidden xl:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">{contact.position || '-'}</td>
                          {isAdmin ? (
                            <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3">
                              {contact.inviter_group_name ? (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">{contact.inviter_group_name}</span>
                              ) : <span className="text-xs text-gray-400">-</span>}
                            </td>
                          ) : (
                            <td className="hidden xl:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">{contact.company || '-'}</td>
                          )}
                          <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded">
                                {contact.approved_count}
                              </span>
                              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                                {contact.pending_count}
                              </span>
                              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded">
                                {contact.rejected_count}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-0.5 sm:gap-1">
                              <button
                                onClick={() => handleViewHistory(contact)}
                                className="p-1 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="View History"
                              >
                                <History className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button
                                onClick={() => openEditModal(contact)}
                                className="p-1 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => openDeleteModal(contact)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredContacts.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Add New Contact</h2>
                <button
                  onClick={() => { setShowAddContactModal(false); resetForm(); }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddContact}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Mandatory Fields First - Left Column */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Inviter <span className="text-red-500">*</span>
                    </label>
                    <Select
                      classNamePrefix="react-select"
                      options={inviters.map(inviter => ({
                        value: inviter.id,
                        label: inviter.name + (inviter.position ? ` (${inviter.position})` : '')
                      }))}
                      value={inviters
                        .filter(inviter => inviter.id === formData.inviter_id)
                        .map(inviter => ({
                          value: inviter.id,
                          label: inviter.name + (inviter.position ? ` (${inviter.position})` : '')
                        }))
                      [0] || null}
                      onChange={option => setFormData({ ...formData, inviter_id: option ? option.value : undefined })}
                      placeholder="Select inviter..."
                      isClearable
                    />
                    {formErrors.inviter_id && <p className="text-red-500 text-sm mt-1">{formErrors.inviter_id}</p>}
                  </div>
                  {/* Name */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                    {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                  </div>
                  {/* Email */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@email.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                    {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                  </div>
                  {/* Phone */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="201012345678"
                      //                      pattern="201[0-9]{9}"
                      maxLength={12}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white ${formErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                    />
                    {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                  </div>
                  {/* Secondary Phone */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary Phone</label>
                    <input
                      type="tel"
                      value={formData.secondary_phone || ''}
                      onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                      placeholder="201012345678"
                      pattern="201[0-9]{9}"
                      maxLength={12}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {/* Optional Fields - Right Column */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      value={formData.category || ''}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">No category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Guests Allowed */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guests Allowed</label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={formData.plus_one || 0}
                      onChange={e => setFormData({ ...formData, plus_one: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g. ACME Corp."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="e.g. Manager"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {/* Title */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Dr., Mr., Ms."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {/* Address */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. 123 Main St, Riyadh"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      placeholder="e.g. VIP guest, prefers email contact"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddContactModal(false); resetForm(); }}
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
                    {submitting ? 'Adding...' : 'Add Contact'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditContactModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Contact</h2>
                <button
                  onClick={() => { setShowEditContactModal(false); setSelectedContact(null); resetForm(); }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditContact}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Inviter - Use editModalInviters which respects group isolation for admin */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inviter <span className="text-red-500">*</span></label>
                    <Select
                      classNamePrefix="react-select"
                      options={editModalInviters.map(inviter => ({
                        value: inviter.id,
                        label: inviter.name + (inviter.position ? ` (${inviter.position})` : '')
                      }))}
                      value={editModalInviters
                        .filter(inviter => inviter.id === formData.inviter_id)
                        .map(inviter => ({
                          value: inviter.id,
                          label: inviter.name + (inviter.position ? ` (${inviter.position})` : '')
                        }))
                      [0] || null}
                      onChange={option => setFormData({ ...formData, inviter_id: option ? option.value : undefined })}
                      placeholder="Select inviter..."
                      isClearable
                    />
                    {formErrors.inviter_id && <p className="text-red-500 text-sm mt-1">{formErrors.inviter_id}</p>}
                  </div>
                  {/* Name */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white ${formErrors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                  </div>
                  {/* Email */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@email.com"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white ${formErrors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                  </div>
                  {/* Phone */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="201012345678"
                      maxLength={12}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white ${formErrors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                    />
                    {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                  </div>
                  {/* Secondary Phone */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary Phone</label>
                    <input
                      type="tel"
                      value={formData.secondary_phone || ''}
                      onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })}
                      placeholder="201012345678"
                      maxLength={12}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {/* Category */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                    <select
                      value={formData.category || ''}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">No category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Guests Allowed */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Guests Allowed</label>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={formData.plus_one || 0}
                      onChange={e => setFormData({ ...formData, plus_one: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {/* Company */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="e.g. ACME Corp."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {/* Position */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Position</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="e.g. Manager"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {/* Title */}
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input
                      type="text"
                      value={formData.title || ''}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Dr., Mr., Ms."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {/* Address */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. 123 Main St, Riyadh"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  {/* Notes */}
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                      placeholder="e.g. VIP guest, prefers email contact"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowEditContactModal(false); setSelectedContact(null); resetForm(); }}
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
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Contact Modal (Admin Only) */}
      {showDeleteContactModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 text-gray-900 dark:text-white">Delete Contact</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Permanently delete "{selectedContact.name}" from the system? This will also remove them from all events. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteContactModal(false); setSelectedContact(null); }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteContact}
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

      {/* Bulk Delete Contacts Modal (Admin Only) */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 text-gray-900 dark:text-white">Delete Contacts</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Are you sure you want to delete <strong>{selectedContactListIds.length}</strong> contact(s)? This will also remove them from all events. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDeleteContacts}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Contact History</h2>
                <button
                  onClick={() => { setShowHistoryModal(false); setSelectedContact(null); setContactHistory([]); }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contact Info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary text-xl font-medium">
                      {selectedContact.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{selectedContact.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedContact.email}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedContact.phone}</p>
                  </div>
                </div>
                {(selectedContact.position || selectedContact.company) && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedContact.position && <span>{selectedContact.position}</span>}
                      {selectedContact.position && selectedContact.company && <span> at </span>}
                      {selectedContact.company && <span className="font-medium">{selectedContact.company}</span>}
                    </p>
                  </div>
                )}
              </div>

              {/* Event History */}
              <h4 className="font-medium mb-3 text-gray-900 dark:text-white">Event History ({selectedContact.total_events} events)</h4>

              {loadingHistory ? (
                <InlineListSkeleton rows={3} />
              ) : contactHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>No event history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contactHistory.map((eventInvitee) => (
                    <div key={eventInvitee.id} className="border dark:border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">{eventInvitee.event_name}</h5>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Invited by {eventInvitee.inviter_name}
                            {eventInvitee.inviter_group_name && ` (${eventInvitee.inviter_group_name})`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDateEgypt(eventInvitee.created_at)}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[getDisplayStatus(eventInvitee)]}`}>
                          {statusLabels[getDisplayStatus(eventInvitee)]}
                        </span>
                      </div>
                      {eventInvitee.category && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Category: {eventInvitee.category}</p>
                      )}
                      {eventInvitee.status === 'rejected' && eventInvitee.approval_notes && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded text-sm">
                          <span className="text-red-600 dark:text-red-400 font-medium">Rejection Note: </span>
                          <span className="text-gray-700 dark:text-gray-300">{eventInvitee.approval_notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => { setShowHistoryModal(false); setSelectedContact(null); setContactHistory([]); }}
                  className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Details Modal */}
      {resubmitInvitee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                  <XCircle className="w-6 h-6 text-red-500" />
                  Rejection Details
                </h2>
                <button
                  onClick={() => { setResubmitInvitee(null); }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-4">
                <div className="font-medium text-gray-900 dark:text-white mb-1">{resubmitInvitee.invitee_name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Rejected By: <span className="font-semibold">{resubmitInvitee.approved_by_name || '-'}</span></div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Rejection Note:</div>
                <div className="text-red-600 dark:text-red-400 text-sm mt-1 whitespace-pre-line">{resubmitInvitee.approval_notes || '-'}</div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => { setResubmitInvitee(null); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk Import Contacts</h2>
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); setIsDragOver(false); }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Step 1: Download Template */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Step 1: Download the template and fill in your contacts
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download Template (.xlsx)
                  </button>
                </div>

                {/* Step 2: Upload File — Drag & Drop Zone */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Step 2: Upload your filled file
                  </p>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) setImportFile(file);
                      e.target.value = '';
                    }}
                  />

                  {!importFile ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
                            setImportFile(file);
                          } else {
                            toast.error('Unsupported file type. Please use .xlsx, .xls, or .csv');
                          }
                        }
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        isDragOver
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <FileUp className={`w-10 h-10 mx-auto mb-3 ${isDragOver ? 'text-indigo-500' : 'text-gray-400 dark:text-gray-500'}`} />
                      <p className={`text-sm font-medium ${isDragOver ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {isDragOver ? 'Drop your file here' : 'Click to browse or drag & drop'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Supports .xlsx, .xls, and .csv files
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                          <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{importFile.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(importFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setImportFile(null); }}
                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove file"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); setIsDragOver(false); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  disabled={importing || !importFile}
                >
                  {importing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Contacts
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Import Modal */}
      {showAdminImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full border border-purple-200 dark:border-purple-700">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Bulk Import</h2>
                <button
                  onClick={() => { setShowAdminImportModal(false); setAdminImportFile(null); setAdminIsDragOver(false); }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                <p className="text-sm text-purple-800 dark:text-purple-300">
                  <strong>Application-wide import.</strong> Each row must specify an <strong>Inviter_Group</strong> column.
                  Groups must already exist. New inviters are auto-created within their group.
                </p>
              </div>

              <div className="space-y-5">
                {/* Step 1: Download Admin Template */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Step 1: Download the admin template and fill in contacts
                  </p>
                  <button
                    onClick={handleDownloadAdminTemplate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-purple-300 dark:border-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-300 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Download Admin Template (.xlsx)
                  </button>
                </div>

                {/* Step 2: Upload File */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Step 2: Upload your filled file
                  </p>

                  <input
                    ref={adminFileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (file) setAdminImportFile(file);
                      e.target.value = '';
                    }}
                  />

                  {!adminImportFile ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setAdminIsDragOver(true); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setAdminIsDragOver(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setAdminIsDragOver(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAdminIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
                            setAdminImportFile(file);
                          } else {
                            toast.error('Unsupported file type. Please use .xlsx, .xls, or .csv');
                          }
                        }
                      }}
                      onClick={() => adminFileInputRef.current?.click()}
                      className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                        adminIsDragOver
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <FileUp className={`w-10 h-10 mx-auto mb-3 ${adminIsDragOver ? 'text-purple-500' : 'text-gray-400 dark:text-gray-500'}`} />
                      <p className={`text-sm font-medium ${adminIsDragOver ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {adminIsDragOver ? 'Drop your file here' : 'Click to browse or drag & drop'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Supports .xlsx, .xls, and .csv files
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <FileSpreadsheet className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{adminImportFile.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(adminImportFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setAdminImportFile(null); }}
                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove file"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setShowAdminImportModal(false); setAdminImportFile(null); setAdminIsDragOver(false); }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  disabled={adminImporting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdminImport}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  disabled={adminImporting || !adminImportFile}
                >
                  {adminImporting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Contacts
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assigned Groups Modal */}
      {showGroupsModal && selectedEvent && selectedEvent.inviter_group_names && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowGroupsModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md max-h-[70vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">Assigned Groups</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedEvent.name}</p>
                </div>
              </div>
              <button onClick={() => setShowGroupsModal(false)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Group List */}
            <div className="px-5 py-4 overflow-y-auto max-h-[calc(70vh-130px)]">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {selectedEvent.inviter_group_names.length} {selectedEvent.inviter_group_names.length === 1 ? 'group' : 'groups'} assigned to this event
              </p>
              <div className="space-y-2">
                {selectedEvent.inviter_group_names.map((groupName, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600/50"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-semibold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{groupName}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
              <button onClick={() => setShowGroupsModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <CategoryManager
          isOpen={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          onUpdate={() => {
            fetchCategories(); // Refresh list for dropdowns
            fetchContacts();   // Refresh contacts to reflect any changes if needed (though backend handles consistency)
          }}
        />
      )}
    </div>
  );
}
