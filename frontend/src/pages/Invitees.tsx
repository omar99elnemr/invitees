/**
 * Invitees Page - Two Tab Design
 * Tab 1 (Events): View assigned events and submit contacts for approval
 * Tab 2 (Contacts): Manage the inviter group's contact list
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
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
  ChevronLeft,
  ChevronRight,
  XCircle,
  RotateCcw,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { eventsAPI, inviteesAPI, invitersAPI, importAPI } from '../services/api';
import type { Event, EventInvitee, Inviter, InviteeWithStats, InviteeFormData } from '../types';

// Status display helpers
const statusColors: Record<string, string> = {
  waiting_for_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  resubmitted: 'bg-blue-100 text-blue-800',
};

const statusLabels: Record<string, string> = {
  waiting_for_approval: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  resubmitted: 'Resubmitted',
};

const eventStatusColors: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-green-100 text-green-800',
  ended: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
  on_hold: 'bg-yellow-100 text-yellow-800',
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

  // Active tab state
  const [activeTab, setActiveTab] = useState<'events' | 'contacts'>('events');

  // Events tab state
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventInvitees, setEventInvitees] = useState<EventInvitee[]>([]);
  const [inviters, setInviters] = useState<Inviter[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingEventInvitees, setLoadingEventInvitees] = useState(false);

  // Contacts tab state
  const [contacts, setContacts] = useState<InviteeWithStats[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Shared state
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Events tab - submission state
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [selectedInviterId, setSelectedInviterId] = useState<number | null>(null);
  const [submissionCategory, setSubmissionCategory] = useState<'White' | 'Gold' | ''>('');
  const [submissionPlusOne, setSubmissionPlusOne] = useState<number>(0);
  const [submissionNotes, setSubmissionNotes] = useState('');

  // Events tab - resubmit state
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitInvitee, setResubmitInvitee] = useState<EventInvitee | null>(null);
  const [resubmitNotes, setResubmitNotes] = useState('');

  // Contacts tab - modals
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showEditContactModal, setShowEditContactModal] = useState(false);
  const [showDeleteContactModal, setShowDeleteContactModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<InviteeWithStats | null>(null);
  const [contactHistory, setContactHistory] = useState<EventInvitee[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  // Form data
  const [formData, setFormData] = useState<InviteeFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

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

  // Fetch inviters for the user's group
  const fetchInviters = useCallback(async () => {
    try {
      const response = await invitersAPI.getMyGroupInviters();
      setInviters(response.data);
    } catch (error: any) {
      console.error('Failed to load inviters:', error);
    }
  }, []);

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

  // Initial load
  useEffect(() => {
    fetchEvents();
    fetchInviters();
    fetchContacts();
  }, [fetchEvents, fetchInviters, fetchContacts]);

  // Load event invitees when event is selected
  useEffect(() => {
    if (selectedEventId) {
      fetchEventInvitees(selectedEventId);
      setSelectedContactIds([]);
    }
  }, [selectedEventId, fetchEventInvitees]);

  // Get contacts available for submission (not approved for selected event)
  const availableContacts = useMemo(() => {
    if (!selectedEventId) return [];
    
    // Get IDs of invitees already approved for this event
    const approvedIds = new Set(
      eventInvitees
        .filter(ei => ei.status === 'approved')
        .map(ei => ei.invitee_id)
    );
    
    // Return contacts not yet approved
    return contacts.filter(c => !approvedIds.has(c.id));
  }, [contacts, eventInvitees, selectedEventId]);

  // Get rejected invitees for the selected event (can be resubmitted)
  const rejectedInvitees = useMemo(() => {
    return eventInvitees.filter(ei => ei.status === 'rejected');
  }, [eventInvitees]);

  // Get pending invitees for the selected event
  const pendingInvitees = useMemo(() => {
    return eventInvitees.filter(ei => ei.status === 'waiting_for_approval');
  }, [eventInvitees]);

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.company?.toLowerCase().includes(query))
    );
  }, [contacts, searchQuery]);

  // Filter available contacts by search
  const filteredAvailableContacts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return availableContacts.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.company?.toLowerCase().includes(query))
    );
  }, [availableContacts, searchQuery]);

  // Paginate
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(start, start + itemsPerPage);
  }, [filteredContacts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

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

  // Handle toggle single contact selection
  const handleToggleContact = (contactId: number) => {
    setSelectedContactIds(prev =>
      prev.includes(contactId)
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Handle submit selected contacts for approval
  const handleSubmitForApproval = async () => {
    if (selectedContactIds.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }
    
    if (!selectedInviterId) {
      toast.error('Please select an inviter');
      return;
    }
    
    if (!selectedEventId) {
      toast.error('Please select an event');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await inviteesAPI.inviteExistingToEvent(
        selectedEventId,
        selectedContactIds,
        {
          inviter_id: selectedInviterId,
          category: submissionCategory || undefined,
          plus_one: submissionPlusOne,
          notes: submissionNotes || undefined,
        }
      );
      
      const { successful, failed, already_invited } = response.data.results;
      
      if (successful.length > 0) {
        toast.success(`${successful.length} contact(s) submitted for approval`);
      }
      if (already_invited.length > 0) {
        toast.error(`${already_invited.length} contact(s) already invited to this event`);
      }
      if (failed.length > 0) {
        toast.error(`${failed.length} contact(s) failed to submit`);
      }
      
      // Reset selection
      setSelectedContactIds([]);
      setSelectedInviterId(null);
      setSubmissionCategory('');
      setSubmissionPlusOne(0);
      setSubmissionNotes('');
      
      // Refresh data
      fetchEventInvitees(selectedEventId);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit for approval');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle resubmit rejected invitation
  const handleResubmit = async () => {
    if (!resubmitInvitee || !selectedEventId) return;

    try {
      setSubmitting(true);
      await inviteesAPI.resubmit(selectedEventId, resubmitInvitee.invitee_id, resubmitNotes);
      toast.success('Invitation resubmitted for approval');
      
      setShowResubmitModal(false);
      setResubmitInvitee(null);
      setResubmitNotes('');
      
      fetchEventInvitees(selectedEventId);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to resubmit');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle add new contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // For adding a new contact, we need to add them to an event first
    if (events.length === 0) {
      toast.error('No active events available');
      return;
    }

    try {
      setSubmitting(true);
      
      // Add new invitee - this creates both the contact and event_invitee record
      const eventId = selectedEventId || events[0].id;
      await inviteesAPI.addToEvent(eventId, formData);
      
      toast.success('Contact added successfully');
      setShowAddContactModal(false);
      resetForm();
      
      // Refresh data
      fetchContacts();
      if (selectedEventId) {
        fetchEventInvitees(selectedEventId);
      }
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

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setImporting(true);
      const response = await importAPI.uploadContacts(importFile);
      
      const { successful, skipped, failed, errors } = response.data;
      
      if (successful > 0) {
        toast.success(`${successful} contact(s) imported successfully`);
      }
      if (skipped > 0) {
        toast(`${skipped} contact(s) already exist`, { icon: 'ℹ️' });
      }
      if (failed > 0) {
        toast(`${failed} row(s) failed to import`, { icon: '⚠️' });
      }
      if (errors && errors.length > 0) {
        console.log('Import errors:', errors);
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
  const openEditModal = (contact: InviteeWithStats) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      position: contact.position || '',
      company: contact.company || '',
      category: contact.category,
      notes: '',
    });
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
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invitees</h1>
        <p className="text-gray-600">Manage event invitations and contacts</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => { setActiveTab('events'); setSearchQuery(''); }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'events'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-5 h-5 inline mr-2" />
            Events
          </button>
          <button
            onClick={() => { setActiveTab('contacts'); setSearchQuery(''); setCurrentPage(1); }}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'contacts'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Contacts
            <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
              {contacts.length}
            </span>
          </button>
        </nav>
      </div>

      {/* EVENTS TAB */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Event Selector */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Event
            </label>
            {loadingEvents ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : events.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No active events assigned to your group</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {events.map(event => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedEventId === event.id
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 truncate">{event.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${eventStatusColors[event.status]}`}>
                        {event.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(event.start_date).toLocaleDateString()}
                    </p>
                    {event.venue && (
                      <p className="text-sm text-gray-400 truncate">{event.venue}</p>
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
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedEvent.name}</h2>
                    <p className="text-gray-500">
                      {new Date(selectedEvent.start_date).toLocaleDateString()} - {selectedEvent.venue}
                    </p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{pendingInvitees.length}</div>
                      <div className="text-gray-500">Pending</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {eventInvitees.filter(ei => ei.status === 'approved').length}
                      </div>
                      <div className="text-gray-500">Approved</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{rejectedInvitees.length}</div>
                      <div className="text-gray-500">Rejected</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rejected Invitees - Can be resubmitted */}
              {rejectedInvitees.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      Rejected Invitations ({rejectedInvitees.length})
                    </h3>
                    <p className="text-sm text-gray-500">These can be resubmitted for approval</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejected By</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejection Note</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {rejectedInvitees.map(invitee => (
                          <tr key={invitee.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{invitee.invitee_name}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{invitee.invitee_email}</td>
                            <td className="px-4 py-3 text-gray-600">{invitee.invitee_company || '-'}</td>
                            <td className="px-4 py-3 text-gray-600">{invitee.approved_by_name || '-'}</td>
                            <td className="px-4 py-3">
                              {invitee.approval_notes ? (
                                <span className="text-red-600 text-sm">{invitee.approval_notes}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setResubmitInvitee(invitee);
                                  setShowResubmitModal(true);
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Resubmit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Submit New Contacts Section */}
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-4 border-b">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary" />
                    Submit Contacts for Approval
                  </h3>
                  <p className="text-sm text-gray-500">Select contacts from your group's list to submit for this event</p>
                </div>

                {/* Submission Controls */}
                <div className="p-4 bg-gray-50 border-b space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Inviter Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Inviter <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedInviterId || ''}
                        onChange={(e) => setSelectedInviterId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Select inviter...</option>
                        {inviters.map(inviter => (
                          <option key={inviter.id} value={inviter.id}>
                            {inviter.name} {inviter.position ? `(${inviter.position})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={submissionCategory}
                        onChange={(e) => setSubmissionCategory(e.target.value as 'White' | 'Gold' | '')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">No category</option>
                        <option value="White">White</option>
                        <option value="Gold">Gold</option>
                      </select>
                    </div>

                    {/* Search */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search contacts..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Guests Allowed and Notes row */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Guests Allowed */}
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guests Allowed</label>
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={submissionPlusOne}
                        onChange={(e) => setSubmissionPlusOne(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    {/* Notes */}
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                      <input
                        type="text"
                        value={submissionNotes}
                        onChange={(e) => setSubmissionNotes(e.target.value)}
                        placeholder="Add notes for the approver..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {selectedContactIds.length > 0 && (
                        <span className="font-medium text-primary">
                          {selectedContactIds.length} contact(s) selected
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleSubmitForApproval}
                      disabled={selectedContactIds.length === 0 || !selectedInviterId || submitting}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Submitting...
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Submit for Approval
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Contacts Table */}
                {loadingEventInvitees ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredAvailableContacts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No contacts available</p>
                    <p className="text-sm">All contacts have been submitted or approved for this event</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={selectedContactIds.length === filteredAvailableContacts.length && filteredAvailableContacts.length > 0}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredAvailableContacts.map(contact => (
                          <tr
                            key={contact.id}
                            className={`hover:bg-gray-50 cursor-pointer ${
                              selectedContactIds.includes(contact.id) ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => handleToggleContact(contact.id)}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedContactIds.includes(contact.id)}
                                onChange={() => handleToggleContact(contact.id)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{contact.name}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{contact.email}</td>
                            <td className="px-4 py-3 text-gray-600">{contact.phone}</td>
                            <td className="px-4 py-3 text-gray-600">{contact.company || '-'}</td>
                            <td className="px-4 py-3 text-gray-600">{contact.position || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {/* No Event Selected */}
          {!selectedEventId && !loadingEvents && events.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Event</h3>
              <p className="text-gray-500">Choose an event above to manage invitee submissions</p>
            </div>
          )}
        </div>
      )}

      {/* CONTACTS TAB */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                placeholder="Search contacts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button
                onClick={() => { setShowAddContactModal(true); resetForm(); }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Contact
              </button>
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : paginatedContacts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No contacts found</p>
                {searchQuery && <p className="text-sm">Try adjusting your search</p>}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Events</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedContacts.map(contact => (
                        <tr key={contact.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{contact.name}</div>
                            {contact.category && (
                              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{contact.category}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{contact.email}</td>
                          <td className="px-4 py-3 text-gray-600">{contact.phone}</td>
                          <td className="px-4 py-3 text-gray-600">{contact.company || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{contact.position || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex justify-center gap-1">
                              <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                                {contact.approved_count}
                              </span>
                              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                                {contact.pending_count}
                              </span>
                              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                                {contact.rejected_count}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <button
                                onClick={() => handleViewHistory(contact)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg"
                                title="View History"
                              >
                                <History className="w-4 h-4 text-gray-500" />
                              </button>
                              <button
                                onClick={() => openEditModal(contact)}
                                className="p-1.5 hover:bg-gray-100 rounded-lg"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 text-gray-500" />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => openDeleteModal(contact)}
                                  className="p-1.5 hover:bg-red-100 rounded-lg"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-4 py-3 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredContacts.length)} of {filteredContacts.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-3 py-2 text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* Add Contact Modal */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Add New Contact</h2>
                <button
                  onClick={() => { setShowAddContactModal(false); resetForm(); }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddContact}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        formErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        formErrors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddContactModal(false); resetForm(); }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
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
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Edit Contact</h2>
                <button
                  onClick={() => { setShowEditContactModal(false); setSelectedContact(null); resetForm(); }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditContact}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        formErrors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        formErrors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category || ''}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as 'White' | 'Gold' || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">No category</option>
                      <option value="White">White</option>
                      <option value="Gold">Gold</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowEditContactModal(false); setSelectedContact(null); resetForm(); }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">Delete Contact</h3>
              <p className="text-gray-600 text-center mb-6">
                Permanently delete "{selectedContact.name}" from the system? This will also remove them from all events. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteContactModal(false); setSelectedContact(null); }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
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

      {/* History Modal */}
      {showHistoryModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Contact History</h2>
                <button
                  onClick={() => { setShowHistoryModal(false); setSelectedContact(null); setContactHistory([]); }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contact Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary text-xl font-medium">
                      {selectedContact.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold">{selectedContact.name}</h3>
                    <p className="text-sm text-gray-500">{selectedContact.email}</p>
                    <p className="text-sm text-gray-500">{selectedContact.phone}</p>
                  </div>
                </div>
                {(selectedContact.position || selectedContact.company) && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      {selectedContact.position && <span>{selectedContact.position}</span>}
                      {selectedContact.position && selectedContact.company && <span> at </span>}
                      {selectedContact.company && <span className="font-medium">{selectedContact.company}</span>}
                    </p>
                  </div>
                )}
              </div>

              {/* Event History */}
              <h4 className="font-medium mb-3">Event History ({selectedContact.total_events} events)</h4>
              
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : contactHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No event history found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contactHistory.map((eventInvitee) => (
                    <div key={eventInvitee.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="font-medium">{eventInvitee.event_name}</h5>
                          <p className="text-sm text-gray-500">
                            Invited by {eventInvitee.inviter_name}
                            {eventInvitee.inviter_group_name && ` (${eventInvitee.inviter_group_name})`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(eventInvitee.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[getDisplayStatus(eventInvitee)]}`}>
                          {statusLabels[getDisplayStatus(eventInvitee)]}
                        </span>
                      </div>
                      {eventInvitee.category && (
                        <p className="text-sm text-gray-600 mt-2">Category: {eventInvitee.category}</p>
                      )}
                      {eventInvitee.status === 'rejected' && eventInvitee.approval_notes && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-sm">
                          <span className="text-red-600 font-medium">Rejection Note: </span>
                          <span className="text-gray-700">{eventInvitee.approval_notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <button
                  onClick={() => { setShowHistoryModal(false); setSelectedContact(null); setContactHistory([]); }}
                  className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Modal */}
      {showResubmitModal && resubmitInvitee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-blue-100 rounded-full mb-4">
                <RotateCcw className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">Resubmit Invitation</h3>
              <p className="text-gray-600 text-center mb-4">
                Resubmit the invitation for "{resubmitInvitee.invitee_name}" for approval?
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={resubmitNotes}
                  onChange={(e) => setResubmitNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder="Add a note for the approver..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowResubmitModal(false); setResubmitInvitee(null); setResubmitNotes(''); }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Resubmitting...' : 'Resubmit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Bulk Import Contacts</h2>
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Download className="w-5 h-5" />
                    Download Template
                  </button>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Supported formats: Excel (.xlsx, .xls) or CSV
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setShowImportModal(false); setImportFile(null); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  disabled={importing || !importFile}
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
