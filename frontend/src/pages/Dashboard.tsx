/**
 * Dashboard Page
 * Role-based dashboard with statistics and quick actions
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, approvalsAPI, eventsAPI } from '../services/api';
import type { DashboardStats, Event, EventInvitee } from '../types';
import {
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  UserPlus,
  FileText,
  Shield,
  Activity,
  ArrowRight,
  CalendarDays,
  MapPin,
  X,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventsModal, setShowEventsModal] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, eventsRes] = await Promise.all([
        dashboardAPI.getStats(),
        eventsAPI.getAll(),
      ]);
      setStats(statsRes.data);
      // Filter active events
      const activeEvents = eventsRes.data.filter(
        (e: Event) => e.status === 'upcoming' || e.status === 'ongoing'
      );
      setAllEvents(activeEvents);
      setUpcomingEvents(activeEvents.slice(0, 3));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">
          Welcome back, {user?.full_name || user?.username}!
        </h1>
        <p className="text-primary-100 mt-1">
          {user?.role === 'admin' && 'System Administrator Dashboard'}
          {user?.role === 'director' && 'Director Dashboard - Manage approvals and invitations'}
          {user?.role === 'organizer' && 'Organizer Dashboard - Track your invitations'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.role === 'organizer' && (
          <>
            <StatCard
              title="Pending Submissions"
              value={stats?.pending_submissions || 0}
              icon={Clock}
              color="yellow"
              trend="Waiting for approval"
            />
            <StatCard
              title="Approved This Month"
              value={stats?.approved_this_month || 0}
              icon={CheckCircle}
              color="green"
              trend="Approved invitations"
            />
            <StatCard
              title="Rejected This Month"
              value={stats?.rejected_this_month || 0}
              icon={XCircle}
              color="red"
              trend="Rejected invitations"
            />
            <StatCard
              title="Success Rate"
              value={
                stats?.approved_this_month && stats?.rejected_this_month
                  ? Math.round(
                      (stats.approved_this_month /
                        (stats.approved_this_month + stats.rejected_this_month)) *
                        100
                    )
                  : 100
              }
              icon={TrendingUp}
              color="blue"
              trend="%"
              suffix="%"
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
              trend="Needs your review"
              onClick={() => navigate('/approvals')}
            />
            <StatCard
              title="My Invitations"
              value={stats?.my_invitations_this_month || 0}
              icon={Users}
              color="blue"
              trend="This month"
            />
            <StatCard
              title="Approved Today"
              value={stats?.total_approved_today || 0}
              icon={CheckCircle}
              color="green"
              trend="Across all events"
            />
            <StatCard
              title="Efficiency"
              value={stats?.pending_approvals === 0 ? 100 : Math.max(0, 100 - (stats?.pending_approvals || 0))}
              icon={TrendingUp}
              color="purple"
              trend="Approval rate"
              suffix="%"
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
              trend={`${stats?.active_users || 0} active, ${stats?.inactive_users || 0} inactive`}
              onClick={() => navigate('/users')}
            />
            <StatCard
              title="Total Events"
              value={stats?.total_events || 0}
              icon={Calendar}
              color="purple"
              trend={`${stats?.upcoming_events || 0} upcoming, ${stats?.ongoing_events || 0} ongoing`}
              onClick={() => navigate('/events')}
            />
            <StatCard
              title="Total Invitees"
              value={stats?.total_invitees || 0}
              icon={Users}
              color="green"
              trend="In database"
            />
            <StatCard
              title="Pending Approvals"
              value={stats?.pending_approvals || 0}
              icon={Clock}
              color="yellow"
              trend="Needs attention"
              onClick={() => navigate('/approvals')}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div>
          <div className="bg-white rounded-lg shadow p-6 h-full">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <QuickActionButton
                title="Add Invitee"
                description="Add a new invitee to an event"
                icon={UserPlus}
                onClick={() => navigate('/invitees')}
              />
              <QuickActionButton
                title="View Events"
                description={isAdmin ? 'Manage event details' : `${allEvents.length} active events`}
                icon={Calendar}
                onClick={() => isAdmin ? navigate('/events') : setShowEventsModal(true)}
              />
              {(user?.role === 'admin' || user?.role === 'director') && (
                <>
                  <QuickActionButton
                    title="Review Approvals"
                    description={`${stats?.pending_approvals || 0} pending`}
                    icon={CheckCircle}
                    onClick={() => navigate('/approvals')}
                    badge={stats?.pending_approvals}
                  />
                  <QuickActionButton
                    title="Generate Reports"
                    description="View analytics and export"
                    icon={FileText}
                    onClick={() => navigate('/reports')}
                  />
                </>
              )}
              {user?.role === 'admin' && (
                <QuickActionButton
                  title="Manage Users"
                  description="Create and manage accounts"
                  icon={Shield}
                  onClick={() => navigate('/users')}
                />
              )}
            </div>
          </div>
        </div>

        {/* My Events */}
        <div>
          <div className="bg-white rounded-lg shadow p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                {isAdmin ? 'Active Events' : 'My Events'}
              </h2>
              {allEvents.length > 3 && (
                <button
                  onClick={() => isAdmin ? navigate('/events') : setShowEventsModal(true)}
                  className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                >
                  View all ({allEvents.length})
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No active events assigned to you</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => isAdmin ? navigate('/events') : navigate('/invitees')}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{event.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(event.start_date).toLocaleDateString()}
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {event.venue}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === 'upcoming'
                            ? 'bg-blue-100 text-blue-800'
                            : event.status === 'ongoing'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Events Modal */}
      {showEventsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                My Events
              </h2>
              <button
                onClick={() => setShowEventsModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
              {allEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No active events assigned to you</p>
              ) : (
                <div className="space-y-3">
                  {allEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setShowEventsModal(false);
                        navigate('/invitees');
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 text-lg">{event.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(event.start_date).toLocaleDateString()}
                            </div>
                            {event.venue && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {event.venue}
                              </div>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{event.description}</p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ml-4 ${
                            event.status === 'upcoming'
                              ? 'bg-blue-100 text-blue-800'
                              : event.status === 'ongoing'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setShowEventsModal(false)}
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  trend?: string;
  suffix?: string;
  onClick?: () => void;
}

function StatCard({ title, value, icon: Icon, color, trend, suffix, onClick }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow p-4 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {value.toLocaleString()}{suffix}
      </p>
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {trend && <p className="text-xs text-gray-400 mt-1">{trend}</p>}
    </div>
  );
}

interface QuickActionButtonProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  badge?: number;
}

function QuickActionButton({ title, description, icon: Icon, onClick, badge }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
    >
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900">{title}</h3>
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}
