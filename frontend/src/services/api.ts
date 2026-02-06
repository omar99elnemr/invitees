/**
 * API service for making HTTP requests to the backend
 * All API endpoints are defined here
 */
import axios from 'axios';
import type {
  User,
  InviterGroup,
  Inviter,
  Event,
  Invitee,
  EventInvitee,
  LoginFormData,
  UserFormData,
  EventFormData,
  InviteeFormData,
  InviterFormData,
  ImportResult,
  ApprovalResult,
  DashboardStats,
  ReportFilters,
  UserFilters,
} from '../types';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect to login for check-in or live dashboard routes - they use PIN auth
      const isCheckinRoute = window.location.pathname.startsWith('/checkin/') || 
                             window.location.pathname.startsWith('/live/');
      const isPinRequired = error.response?.data?.requires_pin;
      
      if (!isCheckinRoute && !isPinRequired && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// =========================
// Authentication API
// =========================
export const authAPI = {
  login: (credentials: LoginFormData) =>
    api.post<User>('/auth/login', credentials),

  logout: () =>
    api.post('/auth/logout'),

  getCurrentUser: () =>
    api.get<User>('/auth/me'),

  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
};

// =========================
// Users API
// =========================
export const usersAPI = {
  getAll: (filters?: UserFilters) =>
    api.get<User[]>('/users', { params: filters }),

  getById: (id: number) =>
    api.get<User>(`/users/${id}`),

  create: (data: UserFormData) =>
    api.post<User>('/users', data),

  update: (id: number, data: Partial<UserFormData>) =>
    api.put<User>(`/users/${id}`, data),

  activate: (id: number) =>
    api.patch<User>(`/users/${id}/activate`),

  deactivate: (id: number) =>
    api.patch<User>(`/users/${id}/deactivate`),

  resetPassword: (id: number, new_password: string) =>
    api.post(`/users/${id}/reset-password`, { new_password }),

  // Check-in attendant event assignment management
  getCheckInAttendants: () =>
    api.get<{ success: boolean; attendants: (User & { event_assignments: EventAssignment[] })[] }>('/users/check-in-attendants'),

  getEventAssignments: (userId: number) =>
    api.get<{ success: boolean; assignments: EventAssignment[] }>(`/users/${userId}/event-assignments`),

  assignToEvent: (userId: number, eventId: number) =>
    api.post<{ success: boolean; assignment: EventAssignment }>(`/users/${userId}/event-assignments`, { event_id: eventId }),

  removeFromEvent: (userId: number, eventId: number) =>
    api.delete(`/users/${userId}/event-assignments/${eventId}`),
};

// Event Assignment Type
export interface EventAssignment {
  id: number;
  user_id: number;
  event_id: number;
  is_active: boolean;
  created_at: string;
  user_name: string;
  event_name: string;
}

// =========================
// Inviter Groups API
// =========================
export const inviterGroupsAPI = {
  getAll: () =>
    api.get<InviterGroup[]>('/inviter-groups'),

  getById: (id: number) =>
    api.get<InviterGroup>(`/inviter-groups/${id}`),

  create: (data: { name: string; description?: string; inviters?: { name: string; email?: string; phone?: string; position?: string }[] }) =>
    api.post<InviterGroup>('/inviter-groups', data),

  update: (id: number, data: { name?: string; description?: string }) =>
    api.put<InviterGroup>(`/inviter-groups/${id}`, data),

  delete: (id: number) =>
    api.delete(`/inviter-groups/${id}`),
};

// =========================
// Inviters API
// =========================
export const invitersAPI = {
  getAll: (activeOnly = false) =>
    api.get<Inviter[]>('/inviters', { params: { active_only: activeOnly } }),

  getByGroup: (groupId: number, activeOnly = true) =>
    api.get<Inviter[]>(`/inviters/group/${groupId}`, { params: { active_only: activeOnly } }),

  getMyGroupInviters: (activeOnly = true) =>
    api.get<Inviter[]>('/inviters/my-group', { params: { active_only: activeOnly } }),

  getById: (id: number) =>
    api.get<Inviter>(`/inviters/${id}`),

  create: (data: InviterFormData) =>
    api.post<Inviter>('/inviters', data),

  createBulk: (groupId: number, inviters: { name: string; email?: string; phone?: string; position?: string }[]) =>
    api.post<{ message: string; created: Inviter[]; errors: string[] }>('/inviters/bulk', { inviter_group_id: groupId, inviters }),

  update: (id: number, data: Partial<InviterFormData>) =>
    api.put<Inviter>(`/inviters/${id}`, data),

  delete: (id: number) =>
    api.delete(`/inviters/${id}`),

  deleteBulk: (ids: number[]) =>
    api.post<{ message: string; deleted: number; errors: string[] }>('/inviters/bulk-delete', { inviter_ids: ids }),
};

// =========================
// Events API
// =========================
export const eventsAPI = {
  getAll: () =>
    api.get<Event[]>('/events'),

  getById: (id: number) =>
    api.get<Event>(`/events/${id}`),

  create: (data: EventFormData) =>
    api.post<Event>('/events', data),

  update: (id: number, data: Partial<EventFormData>) =>
    api.put<Event>(`/events/${id}`, data),

  updateStatus: (id: number, status: Event['status']) =>
    api.patch<Event>(`/events/${id}/status`, { status }),

  delete: (id: number) =>
    api.delete(`/events/${id}`),

  // Refresh event statuses based on current Egypt time
  refreshStatuses: () =>
    api.post<{ events: Event[]; updated: { ongoing: number; ended: number }; server_time: string }>('/events/refresh-statuses'),

  // Check-in PIN Management
  generateCheckinPin: (id: number, autoDeactivateHours?: number) =>
    api.post<CheckinPinInfo>(`/events/${id}/checkin-pin`, { auto_deactivate_hours: autoDeactivateHours }),

  getCheckinPin: (id: number) =>
    api.get<CheckinPinInfo>(`/events/${id}/checkin-pin`),

  toggleCheckinPin: (id: number, active: boolean) =>
    api.patch<{ success: boolean; checkin_pin_active: boolean }>(`/events/${id}/checkin-pin/toggle`, { active }),

  updateCheckinPinSettings: (id: number, autoDeactivateHours: number | null) =>
    api.patch<{ success: boolean }>(`/events/${id}/checkin-pin/settings`, { auto_deactivate_hours: autoDeactivateHours }),
};

export interface CheckinPinInfo {
  success: boolean;
  code: string;
  pin: string;
  active: boolean;
  auto_deactivate_hours: number | null;
  checkin_url: string;
  live_url: string;
}

// =========================
// Invitees API
// =========================
export const inviteesAPI = {
  // Global invitee pool - include contact details for editing
  getAll: () =>
    api.get<(Invitee & { total_events: number; approved_count: number; rejected_count: number; pending_count: number })[]>('/invitees', { params: { include_contact_details: 'true' } }),

  getById: (id: number) =>
    api.get<Invitee>(`/invitees/${id}`),

  // Create a contact without event assignment
  create: (data: InviteeFormData) =>
    api.post<Invitee>('/invitees', data),

  getHistory: (id: number) =>
    api.get<{ invitee: Invitee; events: EventInvitee[] }>(`/invitees/${id}/history`),

  getCategories: () =>
    api.get<string[]>('/invitees/categories'),

  search: (query: string) =>
    api.get<Invitee[]>('/invitees/search', { params: { q: query } }),

  update: (id: number, data: Partial<InviteeFormData>) =>
    api.put<Invitee>(`/invitees/${id}`, data),

  delete: (id: number) =>
    api.delete(`/invitees/${id}`),

  deleteBulk: (inviteeIds: number[]) =>
    api.delete('/invitees/bulk', { data: { invitee_ids: inviteeIds } }),

  // Event-specific invitees
  getForEvent: (eventId: number, filters?: ReportFilters) =>
    api.get<EventInvitee[]>(`/invitees/events/${eventId}/invitees`, { params: filters }),

  addToEvent: (eventId: number, data: InviteeFormData) =>
    api.post<EventInvitee>(`/invitees/events/${eventId}/invitees`, data),

  updateEventInvitee: (eventId: number, inviteeId: number, data: Partial<EventInvitee>) =>
    api.put<EventInvitee>(`/invitees/events/${eventId}/invitees/${inviteeId}`, data),

  removeFromEvent: (eventId: number, inviteeId: number) =>
    api.delete(`/invitees/events/${eventId}/invitees/${inviteeId}`),

  resubmit: (eventId: number, inviteeId: number, notes?: string) =>
    api.post<EventInvitee>(`/invitees/events/${eventId}/invitees/${inviteeId}/resubmit`, { notes }),

  // Bulk invite existing invitees to event
  inviteExistingToEvent: (eventId: number, inviteeIds: number[], invitationData?: { category?: string; inviter_id?: number; plus_one?: number; notes?: string }) =>
    api.post<{ message: string; results: { successful: any[]; failed: any[]; already_invited: any[]; cross_group_duplicates?: any[] } }>(
      `/invitees/events/${eventId}/invite-existing`,
      { invitee_ids: inviteeIds, invitation_data: invitationData }
    ),
};

// =========================
// Approvals API
// =========================
export const approvalsAPI = {
  getPending: (filters?: ReportFilters) =>
    api.get<EventInvitee[]>('/approvals/pending', { params: filters }),

  getApproved: (filters?: ReportFilters) =>
    api.get<EventInvitee[]>('/approvals/approved', { params: filters }),

  approve: (event_invitee_ids: number[], notes?: string) =>
    api.post<ApprovalResult>('/approvals/approve', { event_invitee_ids, notes }),

  reject: (event_invitee_ids: number[], notes?: string) =>
    api.post<ApprovalResult>('/approvals/reject', { event_invitee_ids, notes }),

  cancelApproval: (event_invitee_ids: number[], notes: string) =>
    api.post<ApprovalResult>('/approvals/cancel-approval', { event_invitee_ids, notes }),

  getHistory: (inviteeId: number) =>
    api.get<EventInvitee[]>(`/approvals/history/${inviteeId}`),

  getMyApprovals: (limit?: number) =>
    api.get<EventInvitee[]>('/approvals/my-approvals', { params: { limit } }),
};

// =========================
// Reports API
// =========================
export const reportsAPI = {
  summaryPerEvent: (filters?: ReportFilters) =>
    api.get('/reports/summary-per-event', { params: filters }),

  summaryPerInviter: (filters?: ReportFilters) =>
    api.get('/reports/summary-per-inviter', { params: filters }),

  detailPerEvent: (filters?: ReportFilters) =>
    api.get<EventInvitee[]>('/reports/detail-per-event', { params: filters }),

  detailGoing: (filters?: ReportFilters) =>
    api.get<EventInvitee[]>('/reports/detail-going', { params: filters }),

  // Activity Log
  activityLog: (filters?: { action?: string; user_id?: string; start_date?: string; end_date?: string; limit?: number }) =>
    api.get('/reports/activity-log', { params: filters }),

  activityLogActions: () =>
    api.get<string[]>('/reports/activity-log/actions'),

  activityLogUsers: () =>
    api.get<{ id: number; username: string; name: string }[]>('/reports/activity-log/users'),

  // Historical Data
  historicalData: (filters?: { event?: string; inviter?: string; group?: string; status?: string; search?: string }) =>
    api.get('/reports/historical', { params: filters }),

  historicalFilters: () =>
    api.get<{ events: string[]; inviters: string[]; groups: string[] }>('/reports/historical/filters'),
};

// =========================
// Dashboard API
// =========================
export const dashboardAPI = {
  getStats: () =>
    api.get<DashboardStats>('/dashboard/stats'),

  getActivity: (limit?: number) =>
    api.get('/dashboard/activity', { params: { limit } }),
};

// =========================
// Import API
// =========================
export const importAPI = {
  downloadTemplate: async () => {
    const response = await api.get('/import/template', {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'contacts_import_template.xlsx');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  uploadContacts: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post<ImportResult>('/import/contacts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// =========================
// Categories API
// =========================
export const categoriesAPI = {
  getAll: (activeOnly = false) =>
    api.get<Category[]>('/categories', { params: { active_only: activeOnly } }),

  create: (name: string) =>
    api.post<Category>('/categories', { name }),

  update: (id: number, name: string) =>
    api.put<Category>(`/categories/${id}`, { name }),

  toggle: (id: number) =>
    api.patch<Category>(`/categories/${id}/toggle`),

  delete: (id: number) =>
    api.delete(`/categories/${id}`),

  getUsage: (id: number) =>
    api.get<{ contacts: number; event_invitations: number }>(`/categories/${id}/usage`),
};

// =========================
// Attendance API (Admin)
// =========================
export const attendanceAPI = {
  getEvents: () =>
    api.get<{ success: boolean; events: Event[] }>('/attendance/events'),

  getEventStats: (eventId: number) =>
    api.get<{ success: boolean; event: Event; stats: AttendanceStats }>(`/attendance/event/${eventId}/stats`),

  getEventAttendees: (eventId: number, filters?: AttendanceFilters) =>
    api.get<{ success: boolean; attendees: EventInvitee[]; total: number }>(`/attendance/event/${eventId}/attendees`, { params: filters }),

  generateCodes: (eventId: number, prefix?: string) =>
    api.post<{ success: boolean; generated: number; errors?: string[] }>(`/attendance/event/${eventId}/generate-codes`, { prefix }),

  markInvitationsSent: (inviteeIds: number[], method: 'email' | 'whatsapp' | 'physical' | 'sms') =>
    api.post<{ success: boolean; updated: number }>('/attendance/mark-sent', { invitee_ids: inviteeIds, method }),

  checkIn: (code: string, actualGuests?: number, notes?: string) =>
    api.post<{ success: boolean; attendee?: EventInvitee; error?: string }>('/attendance/check-in', { code, actual_guests: actualGuests, notes }),

  undoCheckIn: (inviteeId: number) =>
    api.post<{ success: boolean }>(`/attendance/undo-check-in/${inviteeId}`),

  search: (query: string, eventId?: number) =>
    api.get<{ success: boolean; results: EventInvitee[] }>('/attendance/search', { params: { q: query, event_id: eventId } }),
};

// =========================
// Portal API (Public - No Auth)
// =========================
export const portalAPI = {
  verifyCode: (code: string) =>
    api.post<PortalVerifyResponse>('/portal/verify', { code }),

  verifyPhone: (phone: string, eventId?: number) =>
    api.post<PortalVerifyResponse>('/portal/verify', { phone, event_id: eventId }),

  verify: (code?: string, phone?: string, eventId?: number) =>
    api.post<PortalVerifyResponse>('/portal/verify', { code, phone, event_id: eventId }),

  confirmAttendance: (code: string, isComing: boolean, guestCount: number) =>
    api.post<{ success: boolean; message: string }>('/portal/confirm', { code, is_coming: isComing, guest_count: guestCount }),
};

// =========================
// Check-in Console API (Event-specific with PIN auth)
// =========================
export const checkinAPI = {

  getEventInfo: (eventCode: string) =>
    api.get<{ success: boolean; event: CheckinEventInfo; is_verified: boolean }>(`/checkin/${eventCode}/info`),

  verifyPin: (eventCode: string, pin: string) =>
    api.post<{ success: boolean; message: string }>(`/checkin/${eventCode}/verify-pin`, { pin }),

  logout: (eventCode: string) =>
    api.post<{ success: boolean }>(`/checkin/${eventCode}/logout`),

  getEventStats: (eventCode: string) =>
    api.get<{ success: boolean; event: Event; stats: AttendanceStats }>(`/checkin/${eventCode}/stats`),

  getAllAttendees: (eventCode: string) =>
    api.get<{ success: boolean; attendees: EventInvitee[]; total: number }>(`/checkin/${eventCode}/attendees`),

  searchAttendees: (eventCode: string, query: string) =>
    api.get<{ success: boolean; results: EventInvitee[]; total: number }>(`/checkin/${eventCode}/search`, { params: { q: query } }),

  checkIn: (eventCode: string, inviteeId: number, actualGuests?: number, notes?: string) =>
    api.post<{ success: boolean; attendee?: EventInvitee; error?: string }>(`/checkin/${eventCode}/check-in`, { invitee_id: inviteeId, actual_guests: actualGuests, notes }),

  undoCheckIn: (eventCode: string, inviteeId: number) =>
    api.post<{ success: boolean }>(`/checkin/${eventCode}/undo-check-in/${inviteeId}`),

  getRecentCheckins: (eventCode: string) =>
    api.get<{ success: boolean; recent_checkins: EventInvitee[] }>(`/checkin/${eventCode}/recent-checkins`),
};

export interface CheckinEventInfo {
  id: number;
  name: string;
  code: string;
  venue: string;
  status: string;
  start_date: string;
  end_date: string;
  checkin_available: boolean;
}

// =========================
// Live Dashboard API (Public - No Auth)
// =========================
export const liveDashboardAPI = {
  getActiveEvents: () =>
    api.get<{ success: boolean; events: LiveEvent[] }>('/live/events'),

  getEventInfo: (eventCode: string) =>
    api.get<{ success: boolean; event: LiveEvent }>(`/live/${eventCode}`),

  getEventStats: (eventCode: string) =>
    api.get<LiveDashboardStats>(`/live/${eventCode}/stats`),

  getRecentActivity: (eventCode: string) =>
    api.get<{ success: boolean; recent_checkins: RecentCheckin[] }>(`/live/${eventCode}/recent`),
};

// Live Dashboard Types
export interface LiveEvent {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  venue: string;
  status: string;
}

export interface LiveDashboardStats {
  success: boolean;
  event: LiveEvent;
  stats: {
    total_approved: number;
    total_capacity: number;
    confirmed_coming: number;
    confirmed_not_coming: number;
    not_responded: number;
    confirmation_rate: number;
    expected_attendees: number;
    expected_guests: number;
    expected_total: number;
    checked_in: number;
    not_yet_arrived: number;
    actual_guests: number;
    total_arrived: number;
    attendance_rate: number;
  };
  timestamp: string;
}

export interface RecentCheckin {
  name: string;
  company: string | null;
  guests: number;
  checked_in_at: string;
}

// Type definitions for attendance
export interface AttendanceStats {
  total_approved: number;
  codes_generated: number;
  invitations_sent: number;
  confirmed_coming: number;
  confirmed_not_coming: number;
  not_responded: number;
  checked_in: number;
  not_checked_in: number;
  total_plus_one_allowed: number;
  total_confirmed_guests: number;
  total_actual_guests: number;
  expected_total: number;
  actual_total: number;
}

export interface AttendanceFilters {
  has_code?: boolean;
  invitation_sent?: boolean;
  checked_in?: boolean;
  attendance_confirmed?: 'yes' | 'no' | 'pending';
  search?: string;
}

export interface PortalVerifyResponse {
  valid: boolean;
  error?: string;
  attendee?: {
    name: string;
    title: string;
    company: string;
    position: string;
    category: string;
    plus_one: number;
    inviter_name: string;
    event_name: string;
    event_date: string;
    event_end_date: string;
    event_venue: string;
    attendance_confirmed: boolean | null;
    confirmed_guests: number | null;
    checked_in: boolean;
  };
}

import { Category } from '../types';

export default api;
