import { useState } from 'react';
import {
  User,
  Mail,
  Shield,
  Building,
  Calendar,
  Key,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';
import { formatDateEgypt, formatDateTimeEgypt } from '../utils/formatters';

export default function Profile() {
  const { user } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('At least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('At least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('At least one number');
    return errors;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate new password
    const errors = validatePassword(passwordForm.new_password);
    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.old_password === passwordForm.new_password) {
      toast.error('New password must be different from old password');
      return;
    }

    setSubmitting(true);
    try {
      await authAPI.changePassword({
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
      setPasswordErrors([]);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      director: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      organizer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return badges[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getRoleDescription = (role: string) => {
    const descriptions: Record<string, string> = {
      admin: 'Full system access: manage users, events, invitees, and all approvals',
      director: 'Approve/reject invitations, create events, and manage invitees',
      organizer: 'Add invitees to events and track submission status',
    };
    return descriptions[role] || '';
  };

  // Role-based gradient
  const getRoleGradient = () => {
    switch (user?.role) {
      case 'admin': return 'from-indigo-600 to-purple-600';
      case 'director': return 'from-emerald-600 to-teal-600';
      default: return 'from-blue-600 to-indigo-600';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getRoleGradient()} rounded-2xl p-6 sm:p-8 text-white shadow-lg`}>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg">
            {user?.full_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold">{user?.full_name || user?.username}</h1>
            <p className="text-white/70">@{user?.username}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
              <Shield className="w-4 h-4" />
              {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Your account details and permissions</p>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
              <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Full Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.full_name || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
              <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center shadow-sm">
                <Mail className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
              <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getRoleBadge(user?.role || '')}`}>
                  {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
              <Building className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Inviter Group</p>
                <p className="font-medium text-gray-900 dark:text-white">{user?.inviter_group_name || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
              <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center shadow-sm">
                <Calendar className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Account Created</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.created_at
                    ? formatDateEgypt(user.created_at)
                    : '—'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-700 dark:to-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
              <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center shadow-sm">
                <CheckCircle className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Account Status</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${user?.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {user?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Role Description */}
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-indigo-900 dark:text-indigo-300">Role Permissions</p>
                <p className="text-sm text-indigo-700 dark:text-indigo-400 mt-1">
                  {getRoleDescription(user?.role || '')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your password</p>
        </div>

        <div className="p-5 sm:p-6">
          {!showChangePassword ? (
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md font-medium"
            >
              <Key className="w-4 h-4" />
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              {/* Old Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={passwordForm.old_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => {
                      setPasswordForm({ ...passwordForm, new_password: e.target.value });
                      setPasswordErrors(validatePassword(e.target.value));
                    }}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Requirements */}
                <div className="mt-2 space-y-1">
                  {['At least 8 characters', 'At least one uppercase letter', 'At least one lowercase letter', 'At least one number'].map((req, idx) => {
                    const isMet = !passwordErrors.includes(req) && passwordForm.new_password.length > 0;
                    return (
                      <div key={idx} className={`flex items-center gap-2 text-xs ${isMet ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        {isMet ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                        {req}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                  <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Passwords do not match
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setPasswordForm({ old_password: '', new_password: '', confirm_password: '' });
                    setPasswordErrors([]);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={submitting || passwordErrors.length > 0 || passwordForm.new_password !== passwordForm.confirm_password}
                >
                  {submitting ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Activity Summary */}
      {user?.last_login && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>
              <span className="font-medium">Last Login:</span>{' '}
              {formatDateTimeEgypt(user.last_login)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
