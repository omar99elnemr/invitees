/**
 * Dashboard Page
 * Role-based dashboard with statistics and quick actions
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
  UserPlus,
  Shield,
  ArrowRight,
  CalendarDays,
  MapPin,
  X,
  BarChart3,
  Target,
  Zap,
  AlertCircle,
  Database,
  Award,
} from 'lucide-react';
import { formatDateEgypt } from '../utils/formatters';

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
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-primary via-primary to-primary-dark rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.full_name || user?.username}!
            </h1>
            <p className="text-primary-100 text-lg">
              {user?.role === 'admin' && 'System Administrator Dashboard'}
              {user?.role === 'director' && 'Director Dashboard - Manage approvals and invitations'}
              {user?.role === 'organizer' && 'Organizer Dashboard - Track your invitations'}
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
              <div className="text-sm text-primary-100">{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {user?.role === 'organizer' && (
          <>
            <EnhancedStatCard
              title="Pending Submissions"
              value={stats?.pending_submissions || 0}
              icon={Clock}
              color="yellow"
              trend="Waiting for approval"
              subtitle="Need your attention"
            />
            <EnhancedStatCard
              title="Approved This Month"
              value={stats?.approved_this_month || 0}
              icon={CheckCircle}
              color="green"
              trend="+12% from last month"
              subtitle="Successful invitations"
              showProgress
            />
            <EnhancedStatCard
              title="Rejected This Month"
              value={stats?.rejected_this_month || 0}
              icon={XCircle}
              color="red"
              trend="-5% from last month"
              subtitle="Need review"
            />
            <EnhancedStatCard
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
              icon={Award}
              color="blue"
              trend="Performance"
              suffix="%"
              subtitle="Approval success"
              showProgress
            />
          </>
        )}

        {user?.role === 'director' && (
          <>
            <EnhancedStatCard
              title="Pending Approvals"
              value={stats?.pending_approvals || 0}
              icon={AlertCircle}
              color="yellow"
              trend="Urgent attention"
              subtitle="Awaiting review"
              onClick={() => navigate('/approvals')}
              clickable
            />
            <EnhancedStatCard
              title="My Invitations"
              value={stats?.my_invitations_this_month || 0}
              icon={Users}
              color="blue"
              trend="+8% from last month"
              subtitle="This month's activity"
              showProgress
            />
            <EnhancedStatCard
              title="Approved Today"
              value={stats?.total_approved_today || 0}
              icon={CheckCircle}
              color="green"
              trend="Real-time"
              subtitle="Across all events"
              showProgress
            />
            <EnhancedStatCard
              title="Efficiency Score"
              value={stats?.pending_approvals === 0 ? 100 : Math.max(0, 100 - (stats?.pending_approvals || 0))}
              icon={Target}
              color="purple"
              trend="Performance"
              suffix="%"
              subtitle="Approval efficiency"
              showProgress
            />
          </>
        )}

        {user?.role === 'admin' && (
          <>
            <EnhancedStatCard
              title="Total Users"
              value={stats?.total_users || 0}
              icon={Users}
              color="blue"
              trend={`${stats?.active_users || 0} active`}
              subtitle={`${stats?.inactive_users || 0} inactive`}
              onClick={() => navigate('/users')}
              clickable
              showProgress
            />
            <EnhancedStatCard
              title="Total Events"
              value={stats?.total_events || 0}
              icon={Calendar}
              color="purple"
              trend={`${stats?.upcoming_events || 0} upcoming`}
              subtitle={`${stats?.ongoing_events || 0} ongoing`}
              onClick={() => navigate('/events')}
              clickable
              showProgress
            />
            <EnhancedStatCard
              title="Total Invitees"
              value={stats?.total_invitees || 0}
              icon={Database}
              color="green"
              trend="Database size"
              subtitle="All contacts"
              showProgress
            />
            <EnhancedStatCard
              title="System Health"
              value={stats?.pending_approvals === 0 ? 100 : Math.max(0, 100 - (stats?.pending_approvals || 0))}
              icon={Zap}
              color="yellow"
              trend="Operational status"
              suffix="%"
              subtitle="Pending items: ${stats?.pending_approvals || 0}"
              onClick={() => navigate('/approvals')}
              clickable
              showProgress
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Enhanced Quick Actions */}
        <div className="xl:col-span-2">
          <div className="bg-white rounded-xl shadow-lg p-6 h-full border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                Quick Actions
              </h2>
              <span className="text-sm text-gray-500">Role-specific tasks</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <EnhancedQuickActionButton
                title="Manage Invitees"
                description="Add and edit contacts"
                icon={UserPlus}
                onClick={() => navigate('/invitees')}
                color="blue"
              />
              <EnhancedQuickActionButton
                title="View Events"
                description={isAdmin ? 'Manage all events' : `${allEvents.length} active events`}
                icon={Calendar}
                onClick={() => isAdmin ? navigate('/events') : setShowEventsModal(true)}
                color="purple"
                badge={allEvents.length}
              />
              {(user?.role === 'admin' || user?.role === 'director') && (
                <>
                  <EnhancedQuickActionButton
                    title="Review Approvals"
                    description={`${stats?.pending_approvals || 0} pending`}
                    icon={CheckCircle}
                    onClick={() => navigate('/approvals')}
                    color="yellow"
                    badge={stats?.pending_approvals}
                    urgent={(stats?.pending_approvals || 0) > 0}
                  />
                  {user?.role === 'admin' && (
                    <EnhancedQuickActionButton
                      title="Generate Reports"
                      description="Analytics & insights"
                      icon={BarChart3}
                      onClick={() => navigate('/reports')}
                      color="green"
                    />
                  )}
                </>
              )}
              {user?.role === 'admin' && (
                <EnhancedQuickActionButton
                  title="Manage Users"
                  description="User administration"
                  icon={Shield}
                  onClick={() => navigate('/users')}
                  color="indigo"
                />
              )}
              {user?.role === 'organizer' && (
                <EnhancedQuickActionButton
                  title="Import Contacts"
                  description="Bulk import"
                  icon={Database}
                  onClick={() => navigate('/invitees')}
                  color="teal"
                />
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Events Panel */}
        <div>
          <div className="bg-white rounded-xl shadow-lg p-6 h-full border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-3">
                <div className="p-2 bg-purple/10 rounded-lg">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                </div>
                {isAdmin ? 'System Events' : 'My Events'}
              </h2>
              {allEvents.length > 3 && (
                <button
                  onClick={() => isAdmin ? navigate('/events') : setShowEventsModal(true)}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1 font-medium"
                >
                  View all ({allEvents.length})
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">No active events</p>
                <p className="text-sm text-gray-400 mt-1">
                  {isAdmin ? 'Create events to get started' : 'No events assigned to you'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple/5 cursor-pointer transition-all duration-200 group"
                    onClick={() => isAdmin ? navigate('/events') : navigate('/invitees')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">
                          {event.name}
                        </h3>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
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
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          event.status === 'upcoming'
                            ? 'bg-blue-100 text-blue-700'
                            : event.status === 'ongoing'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
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

      {/* Enhanced Events Modal */}
      {showEventsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple/5 to-blue/5">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <div className="p-2 bg-purple/10 rounded-lg">
                  <CalendarDays className="w-6 h-6 text-purple-600" />
                </div>
                My Events
              </h2>
              <button
                onClick={() => setShowEventsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              {allEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium text-lg">No active events</p>
                  <p className="text-sm text-gray-400 mt-2">No events are currently assigned to your group</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {allEvents.map((event) => (
                    <div
                      key={event.id}
                      className="p-5 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple/5 cursor-pointer transition-all duration-200 group"
                      onClick={() => {
                        setShowEventsModal(false);
                        navigate('/invitees');
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg group-hover:text-purple-700 transition-colors">
                            {event.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {formatDateEgypt(event.start_date)}
                            </div>
                            {event.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {event.venue}
                              </div>
                            )}
                          </div>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-3 line-clamp-2">{event.description}</p>
                          )}
                        </div>
                        <span
                          className={`px-4 py-2 rounded-full text-sm font-semibold ml-4 ${
                            event.status === 'upcoming'
                              ? 'bg-blue-100 text-blue-700'
                              : event.status === 'ongoing'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
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
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowEventsModal(false)}
                className="w-full px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
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

interface EnhancedStatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'teal';
  trend?: string;
  subtitle?: string;
  suffix?: string;
  onClick?: () => void;
  clickable?: boolean;
  showProgress?: boolean;
}

function EnhancedStatCard({ title, value, icon: Icon, color, trend, subtitle, suffix, onClick, clickable, showProgress }: EnhancedStatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    teal: 'bg-teal-50 text-teal-600 border-teal-200',
  };

  const progressColor = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    indigo: 'bg-indigo-500',
    teal: 'bg-teal-500',
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 border border-gray-100 ${clickable ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {clickable && (
          <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
        )}
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold text-gray-900">
          {value.toLocaleString()}{suffix}
        </p>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        {subtitle && (
          <p className="text-xs text-gray-500">{subtitle}</p>
        )}
        {trend && (
          <p className="text-xs text-gray-400 font-medium">{trend}</p>
        )}
      </div>
      {showProgress && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${progressColor[color]} transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, suffix ? parseInt(suffix.replace('%', '')) : value))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface EnhancedQuickActionButtonProps {
  title: string;
  description: string;
  icon: React.ElementType;
  onClick: () => void;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'teal';
  badge?: number;
  urgent?: boolean;
}

function EnhancedQuickActionButton({ title, description, icon: Icon, onClick, color = 'blue', badge, urgent }: EnhancedQuickActionButtonProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:border-blue-300',
    green: 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100 hover:border-green-300',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100 hover:border-yellow-300',
    red: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:border-red-300',
    purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 hover:border-purple-300',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300',
    teal: 'bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100 hover:border-teal-300',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 text-left border rounded-xl transition-all duration-200 hover:shadow-md hover:scale-[1.02] ${colorClasses[color]} ${
        urgent ? 'animate-pulse' : ''
      }`}
    >
      <div className={`p-3 rounded-lg border ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {badge !== undefined && badge > 0 && (
            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
              urgent ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}
