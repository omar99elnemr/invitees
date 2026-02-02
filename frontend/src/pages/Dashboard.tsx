/**
 * Dashboard Page
 * Role-specific dashboards with enhanced UI/UX
 * - Admin: System overview and management
 * - Director (Approver): Approval workflow focus
 * - Organizer (Inviter): Invitation management focus
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, eventsAPI } from '../services/api';
import type { DashboardStats, Event } from '../types';
import {
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  UserPlus,
  Shield,
  Activity,
  ArrowRight,
  CalendarDays,
  MapPin,
  X,
  BarChart3,
  Zap,
  Send,
  ClipboardCheck,
  AlertCircle,
  Award,
  ListChecks,
  UserCheck,
} from 'lucide-react';
import { formatDateEgypt, formatDateTimeEgypt } from '../utils/formatters';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventsModal, setShowEventsModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, eventsRes, activityRes] = await Promise.all([
        dashboardAPI.getStats(),
        eventsAPI.getAll(),
        dashboardAPI.getActivity(10),
      ]);
      setStats(statsRes.data);
      setRecentActivity(activityRes.data || []);
      const activeEvents = eventsRes.data.filter(
        (e: Event) => e.status === 'upcoming' || e.status === 'ongoing'
      );
      setAllEvents(activeEvents);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Render role-specific dashboard
  if (user?.role === 'admin') {
    return <AdminDashboard stats={stats} events={allEvents} recentActivity={recentActivity} navigate={navigate} user={user} />;
  } else if (user?.role === 'director') {
    return <ApproverDashboard stats={stats} events={allEvents} recentActivity={recentActivity} navigate={navigate} user={user} />;
  } else {
    return <InviterDashboard stats={stats} events={allEvents} recentActivity={recentActivity} navigate={navigate} user={user} showEventsModal={showEventsModal} setShowEventsModal={setShowEventsModal} />;
  }
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
interface DashboardProps {
  stats: DashboardStats | null;
  events: Event[];
  recentActivity: any[];
  navigate: (path: string) => void;
  user: any;
}

function AdminDashboard({ stats, events, recentActivity, navigate, user }: DashboardProps) {
  const upcomingEvents = events.slice(0, 4);
  
  return (
    <div className="space-y-6">
      {/* Welcome Header with Gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-2xl p-8 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 backdrop-blur rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <span className="text-indigo-200 text-sm font-medium">System Administrator</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.username}!
          </h1>
          <p className="text-indigo-200 max-w-xl">
            Monitor system health, manage users, and oversee all events from your central command dashboard.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={stats?.total_users || 0}
          subtitle={`${stats?.active_users || 0} active`}
          icon={Users}
          gradient="from-blue-500 to-blue-600"
          onClick={() => navigate('/users')}
        />
        <MetricCard
          title="Active Events"
          value={(stats?.upcoming_events || 0) + (stats?.ongoing_events || 0)}
          subtitle={`${stats?.upcoming_events || 0} upcoming, ${stats?.ongoing_events || 0} live`}
          icon={Calendar}
          gradient="from-purple-500 to-purple-600"
          onClick={() => navigate('/events')}
        />
        <MetricCard
          title="Total Invitees"
          value={stats?.total_invitees || 0}
          subtitle="In database"
          icon={UserCheck}
          gradient="from-emerald-500 to-emerald-600"
        />
        <MetricCard
          title="Pending Approvals"
          value={stats?.pending_approvals || 0}
          subtitle="Needs attention"
          icon={Clock}
          gradient="from-amber-500 to-orange-500"
          onClick={() => navigate('/approvals')}
          alert={stats?.pending_approvals ? stats.pending_approvals > 0 : false}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <ActionCard
                title="Manage Users"
                description="Create accounts & permissions"
                icon={Users}
                color="blue"
                onClick={() => navigate('/users')}
              />
              <ActionCard
                title="Manage Events"
                description="Create & configure events"
                icon={Calendar}
                color="purple"
                onClick={() => navigate('/events')}
              />
              <ActionCard
                title="Review Approvals"
                description={`${stats?.pending_approvals || 0} pending review`}
                icon={ClipboardCheck}
                color="amber"
                onClick={() => navigate('/approvals')}
                badge={stats?.pending_approvals}
              />
              <ActionCard
                title="View Reports"
                description="Analytics & exports"
                icon={BarChart3}
                color="emerald"
                onClick={() => navigate('/reports')}
              />
            </div>
          </div>
        </div>

        {/* Active Events */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                Active Events
              </h2>
              <button
                onClick={() => navigate('/events')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No active events</p>
                <button
                  onClick={() => navigate('/events')}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Create an event
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} onClick={() => navigate('/events')} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            Recent System Activity
          </h2>
          <button
            onClick={() => navigate('/reports')}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            View full log
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// APPROVER (DIRECTOR) DASHBOARD
// ============================================================================
function ApproverDashboard({ stats, events, recentActivity, navigate, user }: DashboardProps) {
  const pendingCount = stats?.pending_approvals || 0;
  const approvedToday = stats?.total_approved_today || 0;
  const myInvitations = stats?.my_invitations_this_month || 0;
  
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-8 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 backdrop-blur rounded-lg">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <span className="text-emerald-100 text-sm font-medium">Approval Manager</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.username}!
          </h1>
          <p className="text-emerald-100 max-w-xl">
            Review pending invitations, manage approvals, and keep your events on track.
          </p>
        </div>
      </div>

      {/* Priority Alert */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-full">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Pending Approvals</h3>
            <p className="text-amber-700 text-sm">
              You have <span className="font-bold">{pendingCount}</span> invitation{pendingCount !== 1 ? 's' : ''} waiting for your review
            </p>
          </div>
          <button
            onClick={() => navigate('/approvals')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
          >
            Review Now
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pending Approvals"
          value={pendingCount}
          subtitle="Awaiting your review"
          icon={Clock}
          gradient="from-amber-500 to-orange-500"
          onClick={() => navigate('/approvals')}
          alert={pendingCount > 0}
        />
        <MetricCard
          title="Approved Today"
          value={approvedToday}
          subtitle="Great progress!"
          icon={CheckCircle}
          gradient="from-emerald-500 to-green-500"
        />
        <MetricCard
          title="My Invitations"
          value={myInvitations}
          subtitle="This month"
          icon={Send}
          gradient="from-blue-500 to-indigo-500"
        />
        <MetricCard
          title="Efficiency Score"
          value={pendingCount === 0 ? 100 : Math.max(0, 100 - Math.min(pendingCount * 5, 50))}
          subtitle={pendingCount === 0 ? 'All caught up!' : 'Keep reviewing'}
          icon={Award}
          gradient="from-purple-500 to-pink-500"
          suffix="%"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <ActionCard
                title="Review Approvals"
                description={`${pendingCount} pending review`}
                icon={ClipboardCheck}
                color="amber"
                onClick={() => navigate('/approvals')}
                badge={pendingCount}
              />
              <ActionCard
                title="Add Invitee"
                description="Submit new invitation"
                icon={UserPlus}
                color="blue"
                onClick={() => navigate('/invitees')}
              />
              <ActionCard
                title="View My Invitees"
                description="Manage submissions"
                icon={Users}
                color="purple"
                onClick={() => navigate('/invitees')}
              />
            </div>
          </div>
        </div>

        {/* Recent Decisions */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-emerald-500" />
                Recent Decisions
              </h2>
              <button
                onClick={() => navigate('/approvals')}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                View all
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent decisions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((item, index) => (
                  <ApprovalActivityItem key={index} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assigned Events */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-teal-500" />
            My Assigned Events
          </h2>
        </div>
        {events.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No events assigned to you</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.slice(0, 6).map((event) => (
              <EventCard key={event.id} event={event} onClick={() => navigate('/invitees')} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// INVITER (ORGANIZER) DASHBOARD
// ============================================================================
interface InviterDashboardProps extends DashboardProps {
  showEventsModal: boolean;
  setShowEventsModal: (show: boolean) => void;
}

function InviterDashboard({ stats, events, recentActivity, navigate, user, showEventsModal, setShowEventsModal }: InviterDashboardProps) {
  const pendingSubmissions = stats?.pending_submissions || 0;
  const approvedThisMonth = stats?.approved_this_month || 0;
  const rejectedThisMonth = stats?.rejected_this_month || 0;
  const successRate = approvedThisMonth + rejectedThisMonth > 0
    ? Math.round((approvedThisMonth / (approvedThisMonth + rejectedThisMonth)) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-8 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 backdrop-blur rounded-lg">
              <Send className="w-6 h-6" />
            </div>
            <span className="text-blue-100 text-sm font-medium">Invitation Manager</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.username}!
          </h1>
          <p className="text-blue-100 max-w-xl">
            Manage your invitations, track approvals, and submit new guests for upcoming events.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Pending Submissions"
          value={pendingSubmissions}
          subtitle="Waiting for approval"
          icon={Clock}
          gradient="from-amber-500 to-orange-500"
          alert={pendingSubmissions > 5}
        />
        <MetricCard
          title="Approved"
          value={approvedThisMonth}
          subtitle="This month"
          icon={CheckCircle}
          gradient="from-emerald-500 to-green-500"
        />
        <MetricCard
          title="Rejected"
          value={rejectedThisMonth}
          subtitle="This month"
          icon={XCircle}
          gradient="from-red-500 to-rose-500"
        />
        <MetricCard
          title="Success Rate"
          value={successRate}
          subtitle={successRate >= 80 ? 'Excellent!' : 'Keep improving'}
          icon={TrendingUp}
          gradient="from-blue-500 to-indigo-500"
          suffix="%"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <ActionCard
                title="Add New Invitee"
                description="Submit for approval"
                icon={UserPlus}
                color="blue"
                onClick={() => navigate('/invitees')}
                primary
              />
              <ActionCard
                title="View My Invitees"
                description="Manage your submissions"
                icon={Users}
                color="purple"
                onClick={() => navigate('/invitees')}
              />
              <ActionCard
                title="My Events"
                description={`${events.length} active event${events.length !== 1 ? 's' : ''}`}
                icon={Calendar}
                color="teal"
                onClick={() => setShowEventsModal(true)}
              />
            </div>
          </div>
        </div>

        {/* My Events */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                My Assigned Events
              </h2>
              {events.length > 3 && (
                <button
                  onClick={() => setShowEventsModal(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  View all ({events.length})
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No events assigned to you yet</p>
                <p className="text-sm text-gray-400 mt-1">Contact your administrator to get assigned to events</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.slice(0, 4).map((event) => (
                  <EventCard key={event.id} event={event} onClick={() => navigate('/invitees')} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            My Recent Submissions
          </h2>
        </div>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No recent submissions</p>
            <button
              onClick={() => navigate('/invitees')}
              className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Add your first invitee
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((item, index) => (
              <SubmissionActivityItem key={index} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Events Modal */}
      {showEventsModal && (
        <EventsModal events={events} onClose={() => setShowEventsModal(false)} navigate={navigate} />
      )}
    </div>
  );
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  onClick?: () => void;
  alert?: boolean;
  suffix?: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, gradient, onClick, alert, suffix }: MetricCardProps) {
  return (
    <div
      className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {value.toLocaleString()}{suffix}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {alert && (
        <div className="absolute top-3 right-3">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'amber' | 'emerald' | 'teal' | 'red';
  onClick: () => void;
  badge?: number;
  primary?: boolean;
}

function ActionCard({ title, description, icon: Icon, color, onClick, badge, primary }: ActionCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/50',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/50',
    teal: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/50',
  };

  return (
    <button
      onClick={onClick}
      className={`group w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
        primary 
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
      }`}
    >
      <div className={`p-2.5 rounded-lg transition-colors ${primary ? 'bg-white/20' : colorClasses[color]}`}>
        <Icon className={`w-5 h-5 ${primary ? 'text-white' : ''}`} />
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <h3 className={`font-medium ${primary ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{title}</h3>
          {badge !== undefined && badge > 0 && (
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${primary ? 'bg-white/20 text-white' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
              {badge}
            </span>
          )}
        </div>
        <p className={`text-xs ${primary ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{description}</p>
      </div>
      <ArrowRight className={`w-4 h-4 ${primary ? 'text-white/60' : 'text-gray-400'}`} />
    </button>
  );
}

function EventCard({ event, onClick, compact }: { event: Event; onClick: () => void; compact?: boolean }) {
  return (
    <div
      onClick={onClick}
      className="group p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors truncate">
            {event.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{formatDateEgypt(event.start_date)}</span>
          </div>
          {!compact && event.venue && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{event.venue}</span>
            </div>
          )}
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
            event.status === 'upcoming'
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
              : event.status === 'ongoing'
              ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
          }`}
        >
          {event.status === 'ongoing' ? 'Live' : event.status}
        </span>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const getActionIcon = (action: string) => {
    if (action.includes('login')) return { icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' };
    if (action.includes('approve')) return { icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' };
    if (action.includes('reject')) return { icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-900/30' };
    if (action.includes('create')) return { icon: UserPlus, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' };
    return { icon: Activity, color: 'text-gray-500 bg-gray-50 dark:bg-gray-700' };
  };

  const { icon: Icon, color } = getActionIcon(activity.action || '');
  const actionText = (activity.action || 'action').replace(/_/g, ' ');

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white capitalize truncate">{actionText}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{activity.username || 'System'}</p>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
        {activity.timestamp ? formatDateTimeEgypt(activity.timestamp) : ''}
      </span>
    </div>
  );
}

function ApprovalActivityItem({ item }: { item: any }) {
  const isApproved = item.status === 'approved';
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className={`p-2 rounded-lg ${isApproved ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500' : 'bg-red-50 dark:bg-red-900/30 text-red-500'}`}>
        {isApproved ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white truncate">
          {item.invitee_name || 'Invitee'} - {item.event_name || 'Event'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{isApproved ? 'Approved' : 'Rejected'}</p>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
        {item.status_date ? formatDateTimeEgypt(item.status_date) : ''}
      </span>
    </div>
  );
}

function SubmissionActivityItem({ item }: { item: any }) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved': return { icon: CheckCircle, color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500', label: 'Approved' };
      case 'rejected': return { icon: XCircle, color: 'bg-red-50 dark:bg-red-900/30 text-red-500', label: 'Rejected' };
      default: return { icon: Clock, color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-500', label: 'Pending' };
    }
  };

  const { icon: Icon, color, label } = getStatusStyle(item.status);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white truncate">
          {item.invitee_name || 'Invitee'} - {item.event_name || 'Event'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
        {item.status_date ? formatDateTimeEgypt(item.status_date) : ''}
      </span>
    </div>
  );
}

function EventsModal({ events, onClose, navigate }: { events: Event[]; onClose: () => void; navigate: (path: string) => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-indigo-500" />
            My Assigned Events
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[calc(80vh-140px)]">
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No events assigned to you</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => { onClose(); navigate('/invitees'); }}
                  className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white text-lg">{event.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDateEgypt(event.start_date)}
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.venue}
                          </div>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.status === 'upcoming'
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          : event.status === 'ongoing'
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {event.status === 'ongoing' ? 'Live' : event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
