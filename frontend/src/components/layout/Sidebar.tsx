/**
 * Sidebar Component
 * Navigation sidebar with role-based menu items
 * Mobile responsive with slide-in animation
 */
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  CheckSquare,
  FileText,
  UserCog,
  UserCheck,
  X,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, isMobile, onClose }: SidebarProps) {
  const { user, hasRole } = useAuth();

  const menuItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'director', 'organizer'],
    },
    {
      name: 'Events',
      path: '/events',
      icon: Calendar,
      roles: ['admin'],
    },
    {
      name: 'Invitees',
      path: '/invitees',
      icon: Users,
      roles: ['admin', 'director', 'organizer'],
    },
    {
      name: 'Approvals',
      path: '/approvals',
      icon: CheckSquare,
      roles: ['admin', 'director'],
    },
    {
      name: 'Attendance',
      path: '/attendance',
      icon: UserCheck,
      roles: ['admin'],
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: FileText,
      roles: ['admin'],
    },
    {
      name: 'Users',
      path: '/users',
      icon: UserCog,
      roles: ['admin'],
    },
  ];

  const visibleItems = menuItems.filter((item) => hasRole(item.roles));

  // Role-based styling
  const getRoleGradient = () => {
    switch (user?.role) {
      case 'admin': return 'from-indigo-600 to-purple-600';
      case 'director': return 'from-emerald-600 to-teal-600';
      default: return 'from-blue-600 to-indigo-600';
    }
  };

  return (
    <aside 
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-800 border-r border-gray-200 dark:border-gray-700/80 overflow-y-auto shadow-xl lg:shadow-md dark:lg:shadow-none z-40 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Mobile close button */}
      {isMobile && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="font-semibold text-gray-900 dark:text-white">Menu</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      )}

      <nav className="p-3 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={isMobile ? onClose : undefined}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? `bg-gradient-to-r ${getRoleGradient()} text-white shadow-md`
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={isActive ? '' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'} />
                <span className="font-medium flex-1">{item.name}</span>
                {isActive && <ChevronRight size={16} className="opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Info at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-t from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getRoleGradient()} text-white flex items-center justify-center font-semibold text-sm shadow-md`}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate">{user?.full_name || user?.username}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</div>
            {user?.inviter_group_name && (
              <div className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {user.inviter_group_name}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
