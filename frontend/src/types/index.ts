/**
 * TypeScript type definitions for the application
 */

// Category options
// export const INVITEE_CATEGORIES = ['White', 'Gold'] as const;
export type InviteeCategory = string;

export interface Category {
  id: number;
  name: string;
  is_active: boolean;
  invitee_count?: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
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
  inviter_count?: number;
  invitee_count?: number;
  inviters?: Inviter[];
}

export interface Inviter {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  inviter_group_id: number;
  inviter_group_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  venue?: string;
  description?: string;
  status: 'upcoming' | 'ongoing' | 'ended' | 'cancelled' | 'on_hold';
  is_all_groups?: boolean;
  created_by_user_id: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  invitee_count?: number;
  inviter_group_ids?: number[];
  inviter_group_names?: string[];
}

export interface Invitee {
  id: number;
  name: string;
  email: string;
  phone: string;
  position?: string;
  company?: string;
  category?: InviteeCategory;
  inviter_group_id?: number;
  inviter_group_name?: string;
  inviter_id?: number;
  inviter_name?: string;
  created_at: string;
  updated_at: string;
}

export interface InviteeWithStats extends Invitee {
  inviter_id?: number;
  inviter_name?: string;
  plus_one?: number;
  total_events: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
}

export interface EventInvitee {
  id: number;
  event_id: number;
  event_name?: string;
  event_date?: string;
  event_location?: string;
  invitee_id: number;
  invitee_name?: string;
  invitee_email?: string;
  invitee_phone?: string;
  invitee_position?: string;
  invitee_company?: string;
  invitee_title?: string;
  category?: InviteeCategory;
  category_id?: number;
  inviter_id?: number;
  inviter_name?: string;
  inviter_user_id: number;
  submitter_name?: string;
  inviter_group_name?: string;
  inviter_role: string;
  status: 'waiting_for_approval' | 'approved' | 'rejected';
  status_date: string;
  approved_by_user_id?: number;
  approved_by_name?: string;
  approver_role?: string;
  approval_notes?: string;
  is_going?: 'yes' | 'no' | 'maybe';
  plus_one: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Attendance tracking fields
  attendance_code?: string;
  code_generated_at?: string;
  invitation_sent?: boolean;
  invitation_sent_at?: string;
  invitation_method?: 'email' | 'whatsapp' | 'physical' | 'sms';
  portal_accessed_at?: string;
  attendance_confirmed?: boolean | null;
  confirmed_at?: string;
  confirmed_guests?: number;
  checked_in?: boolean;
  checked_in_at?: string;
  checked_in_by_user_id?: number;
  checked_in_by_name?: string;
  actual_guests?: number;
  check_in_notes?: string;
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
  skipped: number;
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
  email: string;
  password?: string;
  full_name?: string;
  role: 'admin' | 'director' | 'organizer';
  inviter_group_id?: number;
}

export interface EventFormData {
  name: string;
  start_date: string;
  end_date: string;
  venue?: string;
  description?: string;
  inviter_group_ids?: number[];
}

export interface InviteeFormData {
  name: string;
  email: string;
  phone: string;
  secondary_phone?: string;
  address?: string;
  title?: string;
  position?: string;
  company?: string;
  category?: InviteeCategory;
  inviter_id?: number;
  plus_one?: number;
  notes?: string;
}

export interface InviterFormData {
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  inviter_group_id: number | undefined;
  is_active?: boolean;
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
