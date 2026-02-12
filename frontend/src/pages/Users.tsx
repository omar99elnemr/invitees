import { useState, useEffect } from 'react';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import {
  UserPlus,
  Search,
  Edit2,
  ShieldCheck,
  ShieldOff,
  Key,
  X,
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
import TablePagination from '../components/common/TablePagination';
import SortableColumnHeader, { applySorting, type SortDirection } from '../components/common/SortableColumnHeader';
import { formatDateTimeEgypt, formatDateEgypt } from '../utils/formatters';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'inviters'>(() => {
    const savedTab = sessionStorage.getItem('users_activeTab');
    return (savedTab === 'users' || savedTab === 'groups' || savedTab === 'inviters') ? savedTab : 'users';
  });
  
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
  const [inviterGroupFilter, setInviterGroupFilter] = useState<string>('all'); // 'all', 'unassigned', or group id
  const [selectedInviterIds, setSelectedInviterIds] = useState<number[]>([]);
  const [showBulkDeleteInvitersModal, setShowBulkDeleteInvitersModal] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [groupsPage, setGroupsPage] = useState(1);
  const [groupsPerPage, setGroupsPerPage] = useState(20);
  const [invitersPage, setInvitersPage] = useState(1);
  const [invitersPerPage, setInvitersPerPage] = useState(20);

  // Sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [groupsSortField, setGroupsSortField] = useState<string | null>(null);
  const [groupsSortDirection, setGroupsSortDirection] = useState<SortDirection>('asc');
  const [invitersSortField, setInvitersSortField] = useState<string | null>(null);
  const [invitersSortDirection, setInvitersSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: string) => {
    setSortDirection(sortField === field && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  };
  const handleGroupsSort = (field: string) => {
    setGroupsSortDirection(groupsSortField === field && groupsSortDirection === 'asc' ? 'desc' : 'asc');
    setGroupsSortField(field);
  };
  const handleInvitersSort = (field: string) => {
    setInvitersSortDirection(invitersSortField === field && invitersSortDirection === 'asc' ? 'desc' : 'asc');
    setInvitersSortField(field);
  };

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
      const [usersRes, groupsRes, invitersRes] = await Promise.all([
        usersAPI.getAll(),
        inviterGroupsAPI.getAll(),
        invitersAPI.getAll(),
      ]);
      setUsers(usersRes.data);
      setInviterGroups(groupsRes.data);
      setInviters(invitersRes.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = applySorting(users.filter(user => {
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
  }), sortField, sortDirection);

  // Pagination
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

    setSubmitting(true);
    try {
      if (selectedInviter) {
        await invitersAPI.update(selectedInviter.id, inviterFormData);
        toast.success('Inviter updated successfully');
      } else {
        // Create inviter without group - will be assigned later
        await invitersAPI.create(inviterFormData);
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

  const handleBulkDeleteInviters = async () => {
    if (selectedInviterIds.length === 0) return;
    
    setSubmitting(true);
    try {
      await invitersAPI.deleteBulk(selectedInviterIds);
      toast.success(`${selectedInviterIds.length} inviter(s) deleted successfully`);
      setShowBulkDeleteInvitersModal(false);
      setSelectedInviterIds([]);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete inviters');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleInviterSelection = (inviterId: number) => {
    setSelectedInviterIds(prev => 
      prev.includes(inviterId) 
        ? prev.filter(id => id !== inviterId)
        : [...prev, inviterId]
    );
  };

  const toggleAllInvitersSelection = (filteredInviters: Inviter[]) => {
    const filteredIds = filteredInviters.map(inv => inv.id);
    const allSelected = filteredIds.every(id => selectedInviterIds.includes(id));
    if (allSelected) {
      setSelectedInviterIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedInviterIds(prev => [...new Set([...prev, ...filteredIds])]);
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
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      director: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      organizer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    };
    return badges[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-500 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Only Administrators can access user management.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <TableSkeleton rows={6} cols={5} />;
  }

  // Compute filtered inviters for the Inviters tab
  const filteredInviters = applySorting(inviters.filter(inv => {
    if (inviterGroupFilter === 'unassigned' && inv.inviter_group_id) return false;
    if (inviterGroupFilter !== 'all' && inviterGroupFilter !== 'unassigned' && inv.inviter_group_id !== parseInt(inviterGroupFilter)) return false;
    const searchMatch = inviterSearchQuery === '' || 
      inv.name?.toLowerCase().includes(inviterSearchQuery.toLowerCase()) ||
      inv.email?.toLowerCase().includes(inviterSearchQuery.toLowerCase()) ||
      inv.position?.toLowerCase().includes(inviterSearchQuery.toLowerCase());
    return searchMatch;
  }), invitersSortField, invitersSortDirection);
  const paginatedInviters = filteredInviters.slice(
    (invitersPage - 1) * invitersPerPage,
    invitersPage * invitersPerPage
  );
  const filteredInviterIds = filteredInviters.map(inv => inv.id);
  const allInvitersSelected = filteredInviters.length > 0 && filteredInviterIds.every(id => selectedInviterIds.includes(id));

  return (
    <div className="space-y-4 sm:space-y-6 overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create and manage user accounts and inviter groups
          </p>
        </div>

        {activeTab === 'users' ? (
          <button
            onClick={() => setShowCreateModal(true)}
            className="self-start inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium text-sm sm:text-base"
          >
            <UserPlus className="w-5 h-5" />
            Add User
          </button>
        ) : activeTab === 'groups' ? (
          <button
            onClick={() => openGroupModal()}
            className="self-start inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium text-sm sm:text-base"
          >
            <FolderPlus className="w-5 h-5" />
            Add Group
          </button>
        ) : (
          <button
            onClick={() => { setShowInviterModal(true); setSelectedInviter(null); setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined }); }}
            className="self-start inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium text-sm sm:text-base"
          >
            <Plus className="w-5 h-5" />
            Add Inviter
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex">
            <button
              onClick={() => { setActiveTab('users'); sessionStorage.setItem('users_activeTab', 'users'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'users'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="w-4 h-4 hidden sm:block" />
              <span>Users</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${activeTab === 'users' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                {users.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('groups'); sessionStorage.setItem('users_activeTab', 'groups'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'groups'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <Building className="w-4 h-4 hidden sm:block" />
              <span className="hidden sm:inline">Inviter Groups</span>
              <span className="sm:hidden">Groups</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${activeTab === 'groups' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                {inviterGroups.length}
              </span>
            </button>
            <button
              onClick={() => { setActiveTab('inviters'); sessionStorage.setItem('users_activeTab', 'inviters'); }}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'inviters'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <UserCog className="w-4 h-4 hidden sm:block" />
              <span>Inviters</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${activeTab === 'inviters' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                {inviters.length}
              </span>
            </button>
          </nav>
        </div>
      </div>

      {/* Users Tab Content */}
      {activeTab === 'users' && (
        <>
          {/* Stats - Clickable Filters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <button
              onClick={() => { setRoleFilter('all'); setCurrentPage(1); }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                roleFilter === 'all' ? 'ring-2 ring-indigo-500 border-indigo-200 dark:border-indigo-700' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl text-white shadow-md">
                <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
              </div>
            </button>
            <button
              onClick={() => { setRoleFilter('admin'); setCurrentPage(1); }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                roleFilter === 'admin' ? 'ring-2 ring-purple-500 border-purple-200 dark:border-purple-700' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white shadow-md">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Admins</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'admin').length}</p>
              </div>
            </button>
            <button
              onClick={() => { setRoleFilter('director'); setCurrentPage(1); }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                roleFilter === 'director' ? 'ring-2 ring-blue-500 border-blue-200 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-md">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Directors</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'director').length}</p>
              </div>
            </button>
            <button
              onClick={() => { setRoleFilter('organizer'); setCurrentPage(1); }}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-3 sm:p-4 flex items-center gap-2 sm:gap-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                roleFilter === 'organizer' ? 'ring-2 ring-emerald-500 border-emerald-200 dark:border-emerald-700' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="p-2.5 sm:p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl text-white shadow-md">
                <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Organizers</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'organizer').length}</p>
              </div>
            </button>
          </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-800 dark:text-white shadow-sm"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Result count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</p>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <SortableColumnHeader field="full_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>User</SortableColumnHeader>
                <SortableColumnHeader field="role" sortField={sortField} sortDirection={sortDirection} onSort={handleSort}>Role</SortableColumnHeader>
                <SortableColumnHeader field="inviter_group_name" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden sm:table-cell">Group</SortableColumnHeader>
                <SortableColumnHeader field="is_active" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden md:table-cell">Status</SortableColumnHeader>
                <SortableColumnHeader field="last_login" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} className="hidden lg:table-cell">Last Login</SortableColumnHeader>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center">
                      <div className="hidden sm:flex flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full items-center justify-center">
                        <span className="text-primary font-medium">
                          {user.full_name?.charAt(0).toUpperCase() || user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="sm:ml-4 min-w-0">
                        <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-none">{user.full_name || user.username}</div>
                        <div className="hidden sm:flex text-xs sm:text-sm text-gray-500 dark:text-gray-400 items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-400">@{user.username}</div>
                        {/* Mobile-only: show group tag when column is hidden */}
                        {user.inviter_group_name && (
                          <div className="sm:hidden mt-0.5">
                            <span className="text-[10px] px-1.5 py-0 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">{user.inviter_group_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                    {user.inviter_group_name ? (
                      <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <Building className="w-4 h-4" />
                        {user.inviter_group_name}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <ShieldCheck className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <ShieldOff className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {user.last_login
                      ? formatDateTimeEgypt(user.last_login)
                      : 'Never'}
                  </td>
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-sm font-medium">
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

        <TablePagination
          currentPage={currentPage}
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
        />
      </div>
        </>
      )}

      {/* Inviter Groups Tab Content */}
      {activeTab === 'groups' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {inviterGroups.length === 0 ? (
            <div className="text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No inviter groups</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
            <>
            {/* Groups result count */}
            <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">{inviterGroups.length} group{inviterGroups.length !== 1 ? 's' : ''} found</p>
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <SortableColumnHeader field="name" sortField={groupsSortField} sortDirection={groupsSortDirection} onSort={handleGroupsSort}>Group Name</SortableColumnHeader>
                    <SortableColumnHeader field="description" sortField={groupsSortField} sortDirection={groupsSortDirection} onSort={handleGroupsSort} className="hidden md:table-cell">Description</SortableColumnHeader>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Inviters</th>
                    <th className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Members</th>
                    <SortableColumnHeader field="created_at" sortField={groupsSortField} sortDirection={groupsSortDirection} onSort={handleGroupsSort} className="hidden lg:table-cell">Created</SortableColumnHeader>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {applySorting(inviterGroups, groupsSortField, groupsSortDirection).slice((groupsPage - 1) * groupsPerPage, groupsPage * groupsPerPage).map((group) => {
                    const memberCount = users.filter(u => u.inviter_group_id === group.id).length;
                    const inviterCount = inviters.filter(i => i.inviter_group_id === group.id).length;
                    return (
                      <tr key={group.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <div className="flex items-center">
                            <div className="hidden sm:flex flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center">
                              <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="sm:ml-4 min-w-0">
                              <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-none">{group.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3">
                          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {group.description || '-'}
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3">
                          <button
                            onClick={() => {
                              setSelectedGroupForDetail(group);
                              setShowGroupInvitersModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                          >
                            <UserCog className="w-3 h-3" />
                            {inviterCount} {inviterCount === 1 ? 'inviter' : 'inviters'}
                          </button>
                        </td>
                        <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedGroupForDetail(group);
                              setShowGroupMembersModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                          >
                            <UsersIcon className="w-3 h-3" />
                            {memberCount} {memberCount === 1 ? 'member' : 'members'}
                          </button>
                        </td>
                        <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {formatDateEgypt(group.created_at)}
                        </td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <button
                              onClick={() => openGroupModal(group)}
                              className="p-1 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedGroup(group);
                                setShowDeleteGroupModal(true);
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={groupsPage}
              totalItems={inviterGroups.length}
              itemsPerPage={groupsPerPage}
              onPageChange={setGroupsPage}
              onItemsPerPageChange={(size) => { setGroupsPerPage(size); setGroupsPage(1); }}
            />
            </>
          )}
        </div>
      )}

      {/* Inviters Tab Content */}
      {activeTab === 'inviters' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-1 gap-3 items-center">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search inviters..."
                  value={inviterSearchQuery}
                  onChange={(e) => setInviterSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
              <select
                value={inviterGroupFilter}
                onChange={(e) => setInviterGroupFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Inviters</option>
                <option value="unassigned">Unassigned</option>
                {inviterGroups.map((group) => (
                  <option key={group.id} value={group.id.toString()}>{group.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setSelectedInviter(null);
                setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                setShowInviterModal(true);
              }}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Inviter
            </button>
          </div>

          {/* Bulk Delete Bar */}
          {selectedInviterIds.length > 0 && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm text-red-800 dark:text-red-300">
                {selectedInviterIds.length} inviter(s) selected
              </span>
              <button
                onClick={() => setShowBulkDeleteInvitersModal(true)}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          )}

          {inviters.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <UserCog className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-500" />
              <p>No inviters found</p>
            </div>
          ) : (
            <>
            {/* Inviters result count */}
            <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">{filteredInviters.length} inviter{filteredInviters.length !== 1 ? 's' : ''} found</p>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allInvitersSelected}
                        onChange={() => toggleAllInvitersSelection(filteredInviters)}
                        className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                      />
                    </th>
                    <SortableColumnHeader field="name" sortField={invitersSortField} sortDirection={invitersSortDirection} onSort={handleInvitersSort}>Name</SortableColumnHeader>
                    <SortableColumnHeader field="email" sortField={invitersSortField} sortDirection={invitersSortDirection} onSort={handleInvitersSort} className="hidden sm:table-cell">Email</SortableColumnHeader>
                    <SortableColumnHeader field="phone" sortField={invitersSortField} sortDirection={invitersSortDirection} onSort={handleInvitersSort} className="hidden md:table-cell">Phone</SortableColumnHeader>
                    <SortableColumnHeader field="position" sortField={invitersSortField} sortDirection={invitersSortDirection} onSort={handleInvitersSort} className="hidden lg:table-cell">Position</SortableColumnHeader>
                    <SortableColumnHeader field="inviter_group_id" sortField={invitersSortField} sortDirection={invitersSortDirection} onSort={handleInvitersSort} className="hidden sm:table-cell">Group</SortableColumnHeader>
                    <SortableColumnHeader field="is_active" sortField={invitersSortField} sortDirection={invitersSortDirection} onSort={handleInvitersSort} className="hidden md:table-cell">Status</SortableColumnHeader>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedInviters.map(inviter => {
                      const group = inviterGroups.find(g => g.id === inviter.inviter_group_id);
                      return (
                        <tr key={inviter.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedInviterIds.includes(inviter.id) ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <input
                              type="checkbox"
                              checked={selectedInviterIds.includes(inviter.id)}
                              onChange={() => toggleInviterSelection(inviter.id)}
                              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            />
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 dark:text-white">
                            <span className="truncate block max-w-[100px] sm:max-w-none">{inviter.name}</span>
                          </td>
                          <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-400">{inviter.email || '-'}</td>
                          <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-400">{inviter.phone || '-'}</td>
                          <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-600 dark:text-gray-400">{inviter.position || '-'}</td>
                          <td className="hidden sm:table-cell px-2 sm:px-4 py-2 sm:py-3">
                            {group ? (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded">{group.name}</span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500">Unassigned</span>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded ${inviter.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
                              {inviter.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                            <div className="flex justify-end gap-1 sm:gap-2">
                              <button
                                onClick={() => {
                                  setSelectedInviter(inviter);
                                  setInviterFormData({
                                    name: inviter.name,
                                    email: inviter.email || '',
                                    phone: inviter.phone || '',
                                    position: inviter.position || '',
                                    inviter_group_id: inviter.inviter_group_id,
                                  });
                                  setShowInviterModal(true);
                                }}
                                className="p-1 text-gray-400 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedInviter(inviter);
                                  setShowDeleteInviterModal(true);
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={invitersPage}
              totalItems={filteredInviters.length}
              itemsPerPage={invitersPerPage}
              onPageChange={setInvitersPage}
              onItemsPerPageChange={(size) => { setInvitersPerPage(size); setInvitersPage(1); }}
            />
            </>
          )}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold dark:text-white">Create New User</h2>
              <button
                onClick={() => { setShowCreateModal(false); setShowCreatePassword(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                  required
                >
                  <option value="organizer">Organizer</option>
                  <option value="director">Director</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Inviter Group
                  </label>
                  <select
                    value={formData.inviter_group_id || ''}
                    onChange={(e) => setFormData({ ...formData, inviter_group_id: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
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
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold dark:text-white">Edit User</h2>
              <button
                onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User['role'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                  required
                >
                  <option value="organizer">Organizer</option>
                  <option value="director">Director</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role !== 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Inviter Group
                  </label>
                  <select
                    value={formData.inviter_group_id || ''}
                    onChange={(e) => setFormData({ ...formData, inviter_group_id: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
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
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
                <Key className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 dark:text-white">Reset Password</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                Reset password for <strong>{selectedUser.full_name || selectedUser.username}</strong>
              </p>

              <form onSubmit={handleResetPassword}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                      required
                      minLength={8}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 8 characters</p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowResetPasswordModal(false); setShowResetNewPassword(false); setSelectedUser(null); setNewPassword(''); }}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full mb-4 ${selectedUser.is_active ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                {selectedUser.is_active ? (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-green-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 dark:text-white">
                {selectedUser.is_active ? 'Deactivate User' : 'Activate User'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                {selectedUser.is_active
                  ? `Are you sure you want to deactivate ${selectedUser.full_name || selectedUser.username}? They will no longer be able to log in.`
                  : `Are you sure you want to activate ${selectedUser.full_name || selectedUser.username}? They will be able to log in again.`}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeactivateModal(false); setSelectedUser(null); }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold dark:text-white">
                {selectedGroup ? 'Edit Group' : 'Create New Group'}
              </h2>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setSelectedGroup(null);
                  setGroupFormData({ name: '', description: '' });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupFormData.name}
                    onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="Enter group name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={groupFormData.description}
                    onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-white dark:bg-gray-700 dark:text-white"
                    placeholder="Optional description..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowGroupModal(false);
                    setSelectedGroup(null);
                    setGroupFormData({ name: '', description: '' });
                  }}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 dark:text-white">Delete Group</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
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
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold dark:text-white">
                {selectedInviter ? 'Edit Inviter' : 'Create New Inviter'}
              </h2>
              <button
                onClick={() => {
                  setShowInviterModal(false);
                  setSelectedInviter(null);
                  setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInviter}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={inviterFormData.name}
                    onChange={(e) => setInviterFormData({ ...inviterFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="Enter inviter name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={inviterFormData.email}
                    onChange={(e) => setInviterFormData({ ...inviterFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={inviterFormData.phone}
                    onChange={(e) => setInviterFormData({ ...inviterFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Position
                  </label>
                  <input
                    type="text"
                    value={inviterFormData.position}
                    onChange={(e) => setInviterFormData({ ...inviterFormData, position: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 dark:text-white"
                    placeholder="Enter position/title"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviterModal(false);
                    setSelectedInviter(null);
                    setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                  }}
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 dark:text-white">Delete Inviter</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Delete inviter "{selectedInviter.name}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteInviterModal(false);
                    setSelectedInviter(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
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

      {/* Bulk Delete Inviters Modal */}
      {showBulkDeleteInvitersModal && selectedInviterIds.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2 dark:text-white">Delete {selectedInviterIds.length} Inviter(s)</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-2">
                This will permanently delete the selected inviters.
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400 text-center mb-6">
                Their invitations from active events will be removed. Ended event records will be preserved.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBulkDeleteInvitersModal(false);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDeleteInviters}
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

      {/* Group Inviters Modal */}
      {showGroupInvitersModal && selectedGroupForDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold dark:text-white">Inviters - {selectedGroupForDetail.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage inviters for this group</p>
              </div>
              <button
                onClick={() => {
                  setShowGroupInvitersModal(false);
                  setSelectedGroupForDetail(null);
                  setShowInlineInviterForm(false);
                  setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Assign Existing Inviter Form */}
              {showInlineInviterForm ? (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Assign Inviter to Group</h3>
                  {(() => {
                    const unassignedInviters = inviters.filter(i => !i.inviter_group_id);
                    if (unassignedInviters.length === 0) {
                      return (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No unassigned inviters available.</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">Create new inviters in the Inviters tab first.</p>
                          <button
                            type="button"
                            onClick={() => setShowInlineInviterForm(false)}
                            className="mt-3 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500"
                          >
                            Close
                          </button>
                        </div>
                      );
                    }
                    return (
                      <form onSubmit={async (e) => {
                        e.preventDefault();
                        const selectedId = inviterFormData.inviter_group_id;
                        if (!selectedId) {
                          toast.error('Please select an inviter');
                          return;
                        }
                        setSubmitting(true);
                        try {
                          await invitersAPI.update(selectedId as number, { inviter_group_id: selectedGroupForDetail.id });
                          toast.success('Inviter assigned to group successfully');
                          setShowInlineInviterForm(false);
                          setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                          fetchData();
                        } catch (error: any) {
                          toast.error(error.response?.data?.error || 'Failed to assign inviter');
                        } finally {
                          setSubmitting(false);
                        }
                      }} className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Select Inviter *</label>
                          <select
                            value={inviterFormData.inviter_group_id || ''}
                            onChange={(e) => setInviterFormData({ ...inviterFormData, inviter_group_id: Number(e.target.value) || undefined })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                            required
                          >
                            <option value="">-- Select an unassigned inviter --</option>
                            {unassignedInviters.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.name} {inv.email ? `(${inv.email})` : ''} {inv.position ? `- ${inv.position}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowInlineInviterForm(false);
                              setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                            }}
                            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500"
                            disabled={submitting}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                            disabled={submitting}
                          >
                            {submitting ? 'Assigning...' : 'Assign to Group'}
                          </button>
                        </div>
                      </form>
                    );
                  })()}
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
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                      setSelectedInviter(null);
                      setShowInlineInviterForm(true);
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark"
                  >
                    <Plus className="w-4 h-4" />
                    Assign Inviter
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
                      <UserCog className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No inviters in this group</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {groupInviters.map((inviter) => (
                      <div key={inviter.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UserCog className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{inviter.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {inviter.email || inviter.phone || inviter.position || 'No contact info'}
                            </div>
                          </div>
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            inviter.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {inviter.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openInviterModal(inviter)}
                            className="p-1.5 text-gray-400 hover:text-primary rounded-full hover:bg-white dark:hover:bg-gray-600"
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
                            onClick={async () => {
                              try {
                                await invitersAPI.update(inviter.id, { inviter_group_id: null as any });
                                toast.success('Inviter unassigned from group');
                                fetchData();
                              } catch (error: any) {
                                toast.error(error.response?.data?.error || 'Failed to unassign inviter');
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-orange-600 rounded-full hover:bg-orange-50"
                            title="Unassign from group"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <button
                onClick={() => {
                  setShowGroupInvitersModal(false);
                  setSelectedGroupForDetail(null);
                  setInviterSearchQuery('');
                  setShowInlineInviterForm(false);
                  setInviterFormData({ name: '', email: '', phone: '', position: '', inviter_group_id: undefined });
                }}
                className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold dark:text-white">Members - {selectedGroupForDetail.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">System users in this group</p>
              </div>
              <button
                onClick={() => {
                  setShowGroupMembersModal(false);
                  setSelectedGroupForDetail(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
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
                      <UsersIcon className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No members in this group</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {groupMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-primary text-sm font-medium">
                              {member.full_name?.charAt(0).toUpperCase() || member.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{member.full_name || member.username}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">@{member.username}</div>
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
                          className="p-1.5 text-gray-400 hover:text-primary rounded-full hover:bg-white dark:hover:bg-gray-600"
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

            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex gap-3">
              <button
                onClick={() => {
                  setShowGroupMembersModal(false);
                  setSelectedGroupForDetail(null);
                }}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500"
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
