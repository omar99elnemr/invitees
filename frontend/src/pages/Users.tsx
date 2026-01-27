import { useState, useEffect } from 'react';
import {
  UserPlus,
  Search,
  Edit2,
  ShieldCheck,
  ShieldOff,
  Key,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Users as UsersIcon,
  Building,
  Mail,
  AlertTriangle,
  Plus,
  Trash2,
  FolderPlus,
  Eye,
  EyeOff,
  UserCog,
} from 'lucide-react';
import { usersAPI, inviterGroupsAPI, invitersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { User, InviterGroup, Inviter, UserFormData } from '../types';
import toast from 'react-hot-toast';
import ActionMenu, { ActionMenuItem } from '../components/common/ActionMenu';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  
  // Group detail modals
  const [showGroupInvitersModal, setShowGroupInvitersModal] = useState(false);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [selectedGroupForDetail, setSelectedGroupForDetail] = useState<InviterGroup | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [inviterGroups, setInviterGroups] = useState<InviterGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);


  // Inviter groups state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<InviterGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState({ name: '', description: '' });

  // Inviters state
  const [inviters, setInviters] = useState<Inviter[]>([]);
  const [showInviterModal, setShowInviterModal] = useState(false);
  const [showDeleteInviterModal, setShowDeleteInviterModal] = useState(false);
  const [selectedInviter, setSelectedInviter] = useState<Inviter | null>(null);
  const [inviterFormData, setInviterFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    inviter_group_id: undefined as number | undefined,
  });
  const [inviterSearchQuery, setInviterSearchQuery] = useState('');
  const [showInlineInviterForm, setShowInlineInviterForm] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'organizer',
    inviter_group_id: undefined,
  });

  const [newPassword, setNewPassword] = useState('');

  // Check admin permissions
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, groupsRes] = await Promise.all([
        usersAPI.getAll(),
        inviterGroupsAPI.getAll(),
      ]);
      setUsers(usersRes.data);
      setInviterGroups(groupsRes.data);
      
      // Fetch all inviters from all groups
      const allInviters: Inviter[] = [];
      for (const group of groupsRes.data) {
        try {
          const invitersRes = await invitersAPI.getByGroup(group.id, false);
          allInviters.push(...invitersRes.data);
        } catch {
          // Group may not have inviters
        }
      }
      setInviters(allInviters);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Create user
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await usersAPI.create(formData);
      toast.success('User created successfully');
      setShowCreateModal(false);
      setShowCreatePassword(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  // Update user
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const updateData: Partial<UserFormData> = {
        username: formData.username,
        email: formData.email,
        full_name: formData.full_name,
        role: formData.role,
        inviter_group_id: formData.inviter_group_id,
      };
      await usersAPI.update(selectedUser.id, updateData);
      toast.success('User updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  // Activate/Deactivate user
  const handleToggleStatus = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      if (selectedUser.is_active) {
        await usersAPI.deactivate(selectedUser.id);
        toast.success('User deactivated');
      } else {
        await usersAPI.activate(selectedUser.id);
        toast.success('User activated');
      }
      setShowDeactivateModal(false);
      setSelectedUser(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update user status');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    setSubmitting(true);
    try {
      await usersAPI.resetPassword(selectedUser.id, newPassword);
      toast.success('Password reset successfully');
      setShowResetPasswordModal(false);
      setShowResetNewPassword(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      full_name: '',
      role: 'organizer',
      inviter_group_id: undefined,
    });
  };

  // Inviter Group CRUD
  const openGroupModal = (group?: InviterGroup) => {
    if (group) {
      setSelectedGroup(group);
      setGroupFormData({ name: group.name, description: group.description || '' });
    } else {
      setSelectedGroup(null);
      setGroupFormData({ name: '', description: '' });
    }
    setShowGroupModal(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupFormData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedGroup) {
        await inviterGroupsAPI.update(selectedGroup.id, groupFormData);
        toast.success('Group updated successfully');
      } else {
        await inviterGroupsAPI.create(groupFormData);
        toast.success('Group created successfully');
      }
      setShowGroupModal(false);
      setSelectedGroup(null);
      setGroupFormData({ name: '', description: '' });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    setSubmitting(true);
    try {
      await inviterGroupsAPI.delete(selectedGroup.id);
      toast.success('Group deleted successfully');
      setShowDeleteGroupModal(false);
      setSelectedGroup(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete group');
    } finally {
      setSubmitting(false);
    }
  };

  // Inviter CRUD
  const openInviterModal = (inviter?: Inviter) => {
    if (inviter) {
      setSelectedInviter(inviter);
      setInviterFormData({
        name: inviter.name,
        email: inviter.email || '',
        phone: inviter.phone || '',
        position: inviter.position || '',
        inviter_group_id: inviter.inviter_group_id,
      });
    } else {
      setSelectedInviter(null);
      setInviterFormData({
        name: '',
        email: '',
        phone: '',
        position: '',
        inviter_group_id: inviterGroups.length > 0 ? inviterGroups[0].id : undefined,
      });
    }
    setShowInviterModal(true);
  };

  const handleSaveInviter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviterFormData.name.trim()) {
      toast.error('Inviter name is required');
      return;
    }
    if (!inviterFormData.inviter_group_id) {
      toast.error('Please select an inviter group');
      return;
    }

    setSubmitting(true);
    try {
      if (selectedInviter) {
        await invitersAPI.update(selectedInviter.id, inviterFormData);
        toast.success('Inviter updated successfully');
      } else {
        if (typeof inviterFormData.inviter_group_id === 'number') {
          await invitersAPI.create(inviterFormData);
        } else {
          toast.error('Inviter group is required');
        }
        toast.success('Inviter created successfully');
      }
      setShowInviterModal(false);
      setSelectedInviter(null);
      setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save inviter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInviter = async () => {
    if (!selectedInviter) return;

    setSubmitting(true);
    try {
      await invitersAPI.delete(selectedInviter.id);
      toast.success('Inviter deleted successfully');
      setShowDeleteInviterModal(false);
      setSelectedInviter(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete inviter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleInviterStatus = async (inviter: Inviter) => {
    try {
      await invitersAPI.update(inviter.id, { is_active: !inviter.is_active });
      toast.success(`Inviter ${inviter.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update inviter status');
    }
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      role: user.role,
      inviter_group_id: user.inviter_group_id ?? undefined,
    });
    setShowEditModal(true);
  };

  // Role badge styling
  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800',
      director: 'bg-blue-100 text-blue-800',
      organizer: 'bg-green-100 text-green-800',
    };
    return badges[role] || 'bg-gray-100 text-gray-800';
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          Only Administrators can access user management.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage user accounts and inviter groups
          </p>
        </div>

        {activeTab === 'users' ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
        ) : (
          <button
            onClick={() => openGroupModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <FolderPlus className="w-5 h-5" />
            Add Group
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'users'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="w-4 h-4 inline-block mr-2" />
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'groups'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building className="w-4 h-4 inline-block mr-2" />
              Inviter Groups ({inviterGroups.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <>
          {/* Stats - Clickable Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <button
              onClick={() => { setRoleFilter('all'); setCurrentPage(1); }}
              className={`bg-white rounded-lg shadow p-4 flex items-center gap-4 text-left transition-all hover:shadow-md ${
                roleFilter === 'all' ? 'ring-2 ring-gray-400' : ''
              }`}
            >
              <div className="p-3 bg-gray-100 rounded-full">
                <UsersIcon className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </button>
            <button
              onClick={() => { setRoleFilter('admin'); setCurrentPage(1); }}
              className={`bg-white rounded-lg shadow p-4 flex items-center gap-4 text-left transition-all hover:shadow-md ${
                roleFilter === 'admin' ? 'ring-2 ring-purple-400' : ''
              }`}
            >
              <div className="p-3 bg-purple-100 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'admin').length}</p>
              </div>
            </button>
            <button
              onClick={() => { setRoleFilter('director'); setCurrentPage(1); }}
              className={`bg-white rounded-lg shadow p-4 flex items-center gap-4 text-left transition-all hover:shadow-md ${
                roleFilter === 'director' ? 'ring-2 ring-blue-400' : ''
              }`}
            >
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Directors</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'director').length}</p>
              </div>
            </button>
            <button
              onClick={() => { setRoleFilter('organizer'); setCurrentPage(1); }}
              className={`bg-white rounded-lg shadow p-4 flex items-center gap-4 text-left transition-all hover:shadow-md ${
                roleFilter === 'organizer' ? 'ring-2 ring-green-400' : ''
              }`}
            >
              <div className="p-3 bg-green-100 rounded-full">
                <UsersIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Organizers</p>
                <p className="text-2xl font-bold">{users.filter(u => u.role === 'organizer').length}</p>
              </div>
            </button>
          </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
        >
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Group
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-medium">
                          {user.full_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.full_name || user.username}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-400">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.inviter_group_name ? (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Building className="w-4 h-4" />
                        {user.inviter_group_name}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <ShieldCheck className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <ShieldOff className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {user.id !== currentUser?.id && (
                      <ActionMenu disabled={user.id === currentUser?.id}>
                        <ActionMenuItem
                          onClick={() => openEditModal(user)}
                          icon={<Edit2 className="w-4 h-4" />}
                        >
                          Edit User
                        </ActionMenuItem>
                        <ActionMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setShowResetPasswordModal(true);
                          }}
                          icon={<Key className="w-4 h-4" />}
                        >
                          Reset Password
                        </ActionMenuItem>
                        <ActionMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeactivateModal(true);
                          }}
                          icon={user.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          variant={user.is_active ? 'danger' : 'success'}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </ActionMenuItem>
                      </ActionMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
                  </span>{' '}
                  of <span className="font-medium">{filteredUsers.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
        </>
      )}

      {/* Inviter Groups Tab Content */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {inviterGroups.length === 0 ? (
            <div className="text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No inviter groups</h3>
              <p className="mt-1 text-sm text-gray-500">
                Create groups to organize your inviting teams
              </p>
              <button
                onClick={() => openGroupModal()}
                className="mt-4 inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Group
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Group Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inviters
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Members
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {inviterGroups.map((group) => {
                    const memberCount = users.filter(u => u.inviter_group_id === group.id).length;
                    const inviterCount = inviters.filter(i => i.inviter_group_id === group.id).length;
                    return (
                      <tr key={group.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Building className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{group.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {group.description || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedGroupForDetail(group);
                              setShowGroupInvitersModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors cursor-pointer"
                          >
                            <UserCog className="w-3 h-3" />
                            {inviterCount} {inviterCount === 1 ? 'inviter' : 'inviters'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedGroupForDetail(group);
                              setShowGroupMembersModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors cursor-pointer"
                          >
                            <UsersIcon className="w-3 h-3" />
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(group.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openGroupModal(group)}
                              className="p-1 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100"
                              title="Edit"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedGroup(group);
                                setShowDeleteGroupModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Create New User</h2>
              <button
                onClick={() => { setShowCreateModal(false); setShowCreatePassword(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  required
                >
                  <option value="organizer">Organizer</option>
                  <option value="director">Director</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inviter Group
                  </label>
                  <select
                    value={formData.inviter_group_id || ''}
                    onChange={(e) => setFormData({ ...formData, inviter_group_id: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  >
                    <option value="">No Group</option>
                    {inviterGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {formData.role === 'admin' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-700">
                    Admin users do not belong to any inviter group. They have full system access.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setShowCreatePassword(false); resetForm(); }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">Edit User</h2>
              <button
                onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  required
                >
                  <option value="organizer">Organizer</option>
                  <option value="director">Director</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inviter Group
                  </label>
                  <select
                    value={formData.inviter_group_id || ''}
                    onChange={(e) => setFormData({ ...formData, inviter_group_id: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                  >
                    <option value="">No Group</option>
                    {inviterGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {formData.role === 'admin' && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-700">
                    Admin users do not belong to any inviter group. They have full system access.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
                <Key className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">Reset Password</h3>
              <p className="text-gray-600 text-center mb-4">
                Reset password for <strong>{selectedUser.full_name || selectedUser.username}</strong>
              </p>

              <form onSubmit={handleResetPassword}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                      minLength={8}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowResetPasswordModal(false); setShowResetNewPassword(false); setSelectedUser(null); setNewPassword(''); }}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Modal */}
      {showDeactivateModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full mb-4 ${selectedUser.is_active ? 'bg-red-100' : 'bg-green-100'}`}>
                {selectedUser.is_active ? (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-green-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">
                {selectedUser.is_active ? 'Deactivate User' : 'Activate User'}
              </h3>
              <p className="text-gray-600 text-center mb-4">
                {selectedUser.is_active
                  ? `Are you sure you want to deactivate ${selectedUser.full_name || selectedUser.username}? They will no longer be able to log in.`
                  : `Are you sure you want to activate ${selectedUser.full_name || selectedUser.username}? They will be able to log in again.`}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeactivateModal(false); setSelectedUser(null); }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleToggleStatus}
                  className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                    selectedUser.is_active
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={submitting}
                >
                  {submitting
                    ? 'Processing...'
                    : selectedUser.is_active
                    ? 'Deactivate'
                    : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {selectedGroup ? 'Edit Group' : 'Create New Group'}
              </h2>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setSelectedGroup(null);
                  setGroupFormData({ name: '', description: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter group name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder="Optional description..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setSelectedGroup(null);
                    setGroupFormData({ name: '', description: '' });
                  }}
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
                  {submitting ? 'Saving...' : selectedGroup ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Group Modal */}
      {showDeleteGroupModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">Delete Group</h3>
              <p className="text-gray-600 text-center mb-6">
                Delete "{selectedGroup.name}"? This action cannot be undone.
                {users.filter(u => u.inviter_group_id === selectedGroup.id).length > 0 && (
                  <span className="block mt-2 text-red-600 text-sm">
                    Warning: This group has members. Remove members first before deleting.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteGroupModal(false);
                    setSelectedGroup(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGroup}
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

      {/* Create/Edit Inviter Modal */}
      {showInviterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {selectedInviter ? 'Edit Inviter' : 'Create New Inviter'}
              </h2>
              <button
                onClick={() => {
                  setShowInviterModal(false);
                  setSelectedInviter(null);
                  setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInviter}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={inviterFormData.name}
                    onChange={(e) => setInviterFormData({ ...inviterFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter inviter name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={inviterFormData.email}
                    onChange={(e) => setInviterFormData({ ...inviterFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={inviterFormData.phone}
                    onChange={(e) => setInviterFormData({ ...inviterFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={inviterFormData.position}
                    onChange={(e) => setInviterFormData({ ...inviterFormData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter position/title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inviter Group *
                  </label>
                  <select
                    value={inviterFormData.inviter_group_id || ''}
                    onChange={(e) => setInviterFormData({ ...inviterFormData, inviter_group_id: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Select a group</option>
                    {inviterGroups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviterModal(false);
                    setSelectedInviter(null);
                    setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                  }}
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
                  {submitting ? 'Saving...' : selectedInviter ? 'Save Changes' : 'Create Inviter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Inviter Modal */}
      {showDeleteInviterModal && selectedInviter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">Delete Inviter</h3>
              <p className="text-gray-600 text-center mb-6">
                Delete inviter "{selectedInviter.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteInviterModal(false);
                    setSelectedInviter(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteInviter}
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

      {/* Group Inviters Modal */}
      {showGroupInvitersModal && selectedGroupForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Inviters - {selectedGroupForDetail.name}</h2>
                <p className="text-sm text-gray-500 mt-1">Manage inviters for this group</p>
              </div>
              <button
                onClick={() => {
                  setShowGroupInvitersModal(false);
                  setSelectedGroupForDetail(null);
                  setShowInlineInviterForm(false);
                  setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Inline Add Inviter Form */}
              {showInlineInviterForm ? (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Inviter</h3>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!inviterFormData.name.trim()) {
                      toast.error('Inviter name is required');
                      return;
                    }
                    setSubmitting(true);
                    try {
                      await invitersAPI.create({ ...inviterFormData, inviter_group_id: selectedGroupForDetail.id });
                      toast.success('Inviter created successfully');
                      setShowInlineInviterForm(false);
                      setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                      fetchData();
                    } catch (error: any) {
                      toast.error(error.response?.data?.error || 'Failed to create inviter');
                    } finally {
                      setSubmitting(false);
                    }
                  }} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          type="text"
                          value={inviterFormData.name}
                          onChange={(e) => setInviterFormData({ ...inviterFormData, name: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Enter name"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={inviterFormData.email}
                          onChange={(e) => setInviterFormData({ ...inviterFormData, email: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Enter email"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          value={inviterFormData.phone}
                          onChange={(e) => setInviterFormData({ ...inviterFormData, phone: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Enter phone"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Position</label>
                        <input
                          type="text"
                          value={inviterFormData.position}
                          onChange={(e) => setInviterFormData({ ...inviterFormData, position: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Enter position"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowInlineInviterForm(false);
                          setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                        }}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={submitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                        disabled={submitting}
                      >
                        {submitting ? 'Adding...' : 'Add Inviter'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="flex justify-between items-center mb-4">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search inviters..."
                      value={inviterSearchQuery}
                      onChange={(e) => setInviterSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: selectedGroupForDetail.id });
                      setSelectedInviter(null);
                      setShowInlineInviterForm(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark"
                  >
                    <Plus className="w-4 h-4" />
                    Add Inviter
                  </button>
                </div>
              )}

              {(() => {
                const groupInviters = inviters.filter(i => 
                  i.inviter_group_id === selectedGroupForDetail.id &&
                  (inviterSearchQuery === '' || 
                    i.name.toLowerCase().includes(inviterSearchQuery.toLowerCase()) ||
                    i.email?.toLowerCase().includes(inviterSearchQuery.toLowerCase()) ||
                    i.phone?.includes(inviterSearchQuery)
                  )
                );
                
                if (groupInviters.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <UserCog className="mx-auto h-10 w-10 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No inviters in this group</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {groupInviters.map((inviter) => (
                      <div key={inviter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UserCog className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{inviter.name}</div>
                            <div className="text-xs text-gray-500">
                              {inviter.email || inviter.phone || inviter.position || 'No contact info'}
                            </div>
                          </div>
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            inviter.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {inviter.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openInviterModal(inviter)}
                            className="p-1.5 text-gray-400 hover:text-primary rounded-full hover:bg-white"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleInviterStatus(inviter)}
                            className={`p-1.5 rounded-full ${
                              inviter.is_active 
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={inviter.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {inviter.is_active ? <ShieldOff className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedInviter(inviter);
                              setShowDeleteInviterModal(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowGroupInvitersModal(false);
                  setSelectedGroupForDetail(null);
                  setInviterSearchQuery('');
                  setShowInlineInviterForm(false);
                  setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                }}
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Members Modal */}
      {showGroupMembersModal && selectedGroupForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Members - {selectedGroupForDetail.name}</h2>
                <p className="text-sm text-gray-500 mt-1">System users in this group</p>
              </div>
              <button
                onClick={() => {
                  setShowGroupMembersModal(false);
                  setSelectedGroupForDetail(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const groupMembers = users.filter(u => u.inviter_group_id === selectedGroupForDetail.id);
                
                if (groupMembers.length === 0) {
                  return (
                    <div className="text-center py-8">
                      <UsersIcon className="mx-auto h-10 w-10 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No members in this group</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {groupMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary text-sm font-medium">
                              {member.full_name?.charAt(0).toUpperCase() || member.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.full_name || member.username}</div>
                            <div className="text-xs text-gray-500">@{member.username}</div>
                          </div>
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(member.role)}`}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setShowGroupMembersModal(false);
                            setSelectedGroupForDetail(null);
                            openEditModal(member);
                          }}
                          className="p-1.5 text-gray-400 hover:text-primary rounded-full hover:bg-white"
                          title="Edit User"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowGroupMembersModal(false);
                  setSelectedGroupForDetail(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowGroupMembersModal(false);
                  setSelectedGroupForDetail(null);
                  setActiveTab('users');
                  setFormData({ ...formData, inviter_group_id: selectedGroupForDetail.id });
                  setShowCreateModal(true);
                }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark inline-flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add User to Group
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
