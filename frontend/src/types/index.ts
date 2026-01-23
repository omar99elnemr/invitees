/**
 * TypeScript type definitions for the application
 */

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'director' | 'organizer';
  inviter_group_id: number | null;
  inviter_group_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface InviterGroup {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  member_count?: number;
}

export interface Event {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  venue?: string;
  description?: string;
  status: 'upcoming' | 'ongoing' | 'ended' | 'cancelled' | 'on_hold';
  created_by_user_id: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  invitee_count?: number;
}

export interface Invitee {
  id: number;
  name: string;
  email: string;
  phone: string;
  position?: string;
  company?: string;
  created_at: string;
  updated_at: string;
}

export interface EventInvitee {
  id: number;
  event_id: number;
  event_name?: string;
  invitee_id: number;
  invitee_name?: string;
  invitee_email?: string;
  invitee_phone?: string;
  invitee_position?: string;
  invitee_company?: string;
  category?: string;
  invitation_class: string;
  inviter_user_id: number;
  inviter_name?: string;
  inviter_group_name?: string;
  inviter_role: string;
  status: 'waiting_for_approval' | 'approved' | 'rejected';
  status_date: string;
  approved_by_user_id?: number;
  approved_by_name?: string;
  approver_role?: string;
  approval_notes?: string;
  is_going?: 'yes' | 'no' | 'maybe';
  plus_one: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  // Organizer stats
  pending_submissions?: number;
  approved_this_month?: number;
  rejected_this_month?: number;
  
  // Director stats
  pending_approvals?: number;
  my_invitations_this_month?: number;
  total_approved_today?: number;
  
  // Admin stats
  total_users?: number;
  active_users?: number;
  inactive_users?: number;
  total_events?: number;
  upcoming_events?: number;
  ongoing_events?: number;
  ended_events?: number;
  total_invitees?: number;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  table_name: string;
  record_id?: number;
  old_value?: string;
  new_value?: string;
  ip_address?: string;
  timestamp: string;
}

// API Response types
export interface ApiError {
  error: string;
}

export interface ImportResult {
  message: string;
  total_rows: number;
  successful: number;
  failed: number;
  errors: string[];
}

export interface ApprovalResult {
  message: string;
  success_count: number;
  failed_count: number;
  errors: string[];
}

// Form data types
export interface LoginFormData {
  username: string;
  password: string;
  remember?: boolean;
}

export interface ChangePasswordFormData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface UserFormData {
  username: string;
  password?: string;
  role: 'admin' | 'director' | 'organizer';
  inviter_group_id: number | null;
}

export interface EventFormData {
  name: string;
  start_date: string;
  end_date: string;
  venue?: string;
  description?: string;
}

export interface InviteeFormData {
  name: string;
  email: string;
  phone: string;
  position?: string;
  company?: string;
  category?: string;
  invitation_class: string;
  notes?: string;
}

// Filter types
export interface ReportFilters {
  event_id?: number;
  status?: string;
  inviter_group_id?: number;
  inviter_user_id?: number;
  is_going?: string;
  plus_one?: boolean;
  search?: string;
  start_date?: string;
  end_date?: string;
}

export interface UserFilters {
  role?: string;
  is_active?: boolean;
  inviter_group_id?: number;
  search?: string;
}
