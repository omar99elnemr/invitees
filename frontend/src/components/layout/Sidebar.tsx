/**
 * Sidebar Component
 * Navigation sidebar with role-based menu items
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
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
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
      name: 'Reports',
      path: '/reports',
      icon: FileText,
      roles: ['admin'],  // Only admins can see reports
    },
    {
      name: 'Users',
      path: '/users',
      icon: UserCog,
      roles: ['admin'],
    },
  ];

  const visibleItems = menuItems.filter((item) => hasRole(item.roles));

  if (!isOpen) return null;

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <item.icon size={20} />
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Info at Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-sm">
          <div className="font-medium text-gray-900">{user?.username}</div>
          <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
          {user?.inviter_group_name && (
            <div className="text-xs text-gray-400 mt-1">
              {user.inviter_group_name}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
