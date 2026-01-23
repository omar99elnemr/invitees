/**
 * Dashboard Page
 * Role-based dashboard with statistics and quick actions
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import type { DashboardStats } from '../types';
import { Users, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.username}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your events today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {user?.role === 'organizer' && (
          <>
            <StatCard
              title="Pending Submissions"
              value={stats?.pending_submissions || 0}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              title="Approved This Month"
              value={stats?.approved_this_month || 0}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              title="Rejected This Month"
              value={stats?.rejected_this_month || 0}
              icon={XCircle}
              color="red"
            />
          </>
        )}

        {user?.role === 'director' && (
          <>
            <StatCard
              title="Pending Approvals"
              value={stats?.pending_approvals || 0}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              title="My Invitations (Month)"
              value={stats?.my_invitations_this_month || 0}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Approved Today"
              value={stats?.total_approved_today || 0}
              icon={CheckCircle}
              color="green"
            />
          </>
        )}

        {user?.role === 'admin' && (
          <>
            <StatCard
              title="Total Users"
              value={stats?.total_users || 0}
              icon={Users}
              color="blue"
              subtitle={`${stats?.active_users || 0} active`}
            />
            <StatCard
              title="Total Events"
              value={stats?.total_events || 0}
              icon={Calendar}
              color="purple"
              subtitle={`${stats?.upcoming_events || 0} upcoming`}
            />
            <StatCard
              title="Total Invitees"
              value={stats?.total_invitees || 0}
              icon={Users}
              color="green"
            />
            <StatCard
              title="Pending Approvals"
              value={stats?.pending_approvals || 0}
              icon={Clock}
              color="yellow"
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionButton
            title="Add Invitee"
            description="Add a new invitee to an event"
            onClick={() => window.location.href = '/invitees'}
          />
          {(user?.role === 'admin' || user?.role === 'director') && (
            <>
              <QuickActionButton
                title="View Approvals"
                description="Review pending approvals"
                onClick={() => window.location.href = '/approvals'}
              />
              <QuickActionButton
                title="View Reports"
                description="Generate and view reports"
                onClick={() => window.location.href = '/reports'}
              />
            </>
          )}
          {user?.role === 'admin' && (
            <QuickActionButton
              title="Manage Users"
              description="Create and manage user accounts"
              onClick={() => window.location.href = '/users'}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  );
}

interface QuickActionButtonProps {
  title: string;
  description: string;
  onClick: () => void;
}

function QuickActionButton({ title, description, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-4 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 transition-colors"
    >
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </button>
  );
}
