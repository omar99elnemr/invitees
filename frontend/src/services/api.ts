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
      // Redirect to login if unauthorized
      if (!window.location.pathname.includes('/login')) {
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
};

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
};

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
    api.post<{ message: string; results: { successful: any[]; failed: any[]; already_invited: any[] } }>(
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
};

// =========================
// Dashboard API
// =========================
export const dashboardAPI = {
  getStats: () =>
    api.get<DashboardStats>('/dashboard/stats'),

  getActivity: () =>
    api.get('/dashboard/activity'),
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

import { Category } from '../types';

export default api;
