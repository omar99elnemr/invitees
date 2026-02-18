/**
 * Dashboard Page
 * Role-specific dashboards with enhanced UI/UX
 * - Admin: System overview and management
 * - Director (Approver): Approval workflow focus
 * - Organizer (Inviter): Invitation management focus
 */
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardSkeleton } from '../components/common/LoadingSkeleton';
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
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudRain,
  CloudDrizzle,
  CloudSnow,
  CloudLightning,
  CloudFog,
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
    return <DashboardSkeleton />;
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
// SHARED WELCOME HEADER — live clock, weather, time-aware greeting
// ============================================================================

// Egypt time helper — backend stores Egypt time with 'Z'; strip 'Z' for local display
const EGYPT_TZ = 'UTC';   // matches formatters.ts convention

function getEgyptNow(): Date {
  // Create a Date whose UTC fields equal Egypt local time
  const s = new Date().toLocaleString('en-US', { timeZone: EGYPT_TZ });
  return new Date(s);
}

// WMO weather code → { icon component, label }
function weatherMeta(code: number, isNight: boolean) {
  if (code === 0)                          return { Icon: isNight ? Moon : Sun,            label: 'Clear' };
  if (code === 1)                          return { Icon: isNight ? Moon : Sun,            label: 'Mostly clear' };
  if (code === 2)                          return { Icon: isNight ? CloudMoon : CloudSun,  label: 'Partly cloudy' };
  if (code === 3)                          return { Icon: Cloud,                           label: 'Overcast' };
  if (code === 45 || code === 48)          return { Icon: CloudFog,                        label: 'Foggy' };
  if ([51, 53, 55].includes(code))         return { Icon: CloudDrizzle,                    label: 'Drizzle' };
  if ([61, 63, 65, 80, 81, 82].includes(code)) return { Icon: CloudRain,                  label: 'Rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { Icon: CloudSnow,                  label: 'Snow' };
  if ([95, 96, 99].includes(code))         return { Icon: CloudLightning,                  label: 'Thunderstorm' };
  return { Icon: Cloud, label: 'Cloudy' };
}

const greetingMessages: Record<string, string[]> = {
  admin: [
    'Your system is running smoothly.',
    'Stay on top of events and approvals.',
    'Monitor, manage, and lead with confidence.',
    'Everything is under your control.',
    'Ready to make today productive.',
  ],
  director: [
    'Review pending approvals and keep things moving.',
    'Your decisions shape every event.',
    'Stay ahead of the approval queue.',
    'Great leaders make timely decisions.',
    'Your team is counting on you.',
  ],
  organizer: [
    'Manage your invitations efficiently.',
    'Keep your guest lists up to date.',
    'Every invite counts — make them matter.',
    'Stay organised, stay ahead.',
    'Your events are looking great.',
  ],
};

interface WelcomeHeaderProps {
  user: any;
  gradientClasses: string;
  blurColor: string;
  accentTextColor: string;
  badgeIcon: React.ElementType;
  badgeLabel: string;
}

function DashboardWelcomeHeader({ user, gradientClasses, blurColor, accentTextColor, badgeIcon: BadgeIcon, badgeLabel }: WelcomeHeaderProps) {
  const [now, setNow] = useState(getEgyptNow);
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const weatherFetched = useRef(false);

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(getEgyptNow()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather once
  useEffect(() => {
    if (weatherFetched.current) return;
    weatherFetched.current = true;
    fetch('https://api.open-meteo.com/v1/forecast?latitude=30.05&longitude=31.25&current=temperature_2m,weather_code&timezone=Africa%2FCairo')
      .then(r => r.json())
      .then(data => {
        if (data?.current) {
          setWeather({ temp: Math.round(data.current.temperature_2m), code: data.current.weather_code });
        }
      })
      .catch(() => {/* silent — weather is optional */});
  }, []);

  const hour = now.getHours();
  const isNight = hour < 5 || hour >= 19;
  const greeting =
    hour >= 5 && hour < 12 ? 'Good morning' :
    hour >= 12 && hour < 17 ? 'Good afternoon' :
    hour >= 17 && hour < 21 ? 'Good evening' : 'Good night';

  const role = user?.role || 'organizer';
  const msgs = greetingMessages[role] || greetingMessages.organizer;
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const subtitle = msgs[dayOfYear % msgs.length];

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });

  const wm = weather ? weatherMeta(weather.code, isNight) : null;
  const TimeIcon = isNight ? Moon : Sun;

  return (
    <div className={`relative overflow-hidden ${gradientClasses} rounded-2xl p-4 sm:p-6 lg:p-8 text-white`}>
      <div className={`absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 ${blurColor} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2`}></div>
      <div className="absolute bottom-0 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left — greeting */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/10 backdrop-blur rounded-lg">
              <BadgeIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className={`${accentTextColor} text-sm font-medium`}>{badgeLabel}</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">
            {greeting}, {user?.full_name || user?.username}!
          </h1>
          <p className={`${accentTextColor} max-w-xl text-sm sm:text-base`}>{subtitle}</p>
        </div>

        {/* Right — clock + weather */}
        <div className="flex items-center gap-4 sm:gap-5 shrink-0">
          {/* Weather */}
          {wm && weather && (
            <div className="hidden sm:flex flex-col items-center gap-1">
              <wm.Icon className="w-8 h-8 text-white/90" />
              <span className="text-lg font-semibold leading-none">{weather.temp}°C</span>
              <span className="text-[11px] text-white/70 leading-none">{wm.label}</span>
            </div>
          )}

          {/* Divider */}
          {wm && <div className="hidden sm:block w-px h-14 bg-white/20 rounded-full" />}

          {/* Clock */}
          <div className="flex flex-col items-end sm:items-center gap-0.5">
            <div className="flex items-center gap-2">
              <TimeIcon className="w-4 h-4 text-white/70 hidden sm:block" />
              <span className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight">{timeStr}</span>
            </div>
            <span className="text-xs sm:text-sm text-white/70">{dateStr}</span>
            {/* Compact weather on mobile */}
            {wm && weather && (
              <span className="text-xs text-white/70 sm:hidden flex items-center gap-1 mt-0.5">
                <wm.Icon className="w-3.5 h-3.5" /> {weather.temp}°C · {wm.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
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
      <DashboardWelcomeHeader
        user={user}
        gradientClasses="bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900"
        blurColor="bg-indigo-500/20"
        accentTextColor="text-indigo-200"
        badgeIcon={Shield}
        badgeLabel="System Administrator"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
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
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
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
      <DashboardWelcomeHeader
        user={user}
        gradientClasses="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700"
        blurColor="bg-white/10"
        accentTextColor="text-emerald-100"
        badgeIcon={ClipboardCheck}
        badgeLabel="Approval Manager"
      />

      {/* Priority Alert */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2.5 sm:p-3 bg-amber-100 dark:bg-amber-800/50 rounded-full shrink-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">Pending Approvals</h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                You have <span className="font-bold">{pendingCount}</span> invitation{pendingCount !== 1 ? 's' : ''} waiting for your review
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/approvals')}
            className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500 text-white rounded-lg font-medium transition-colors text-center"
          >
            Review Now
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
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
                onClick={() => navigate('/invitees?tab=events')}
              />
              <ActionCard
                title="View My Invitees"
                description="Manage submissions"
                icon={Users}
                color="purple"
                onClick={() => navigate('/invitees?tab=events')}
              />
            </div>
          </div>
        </div>

        {/* Recent Decisions */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
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
                <ClipboardCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No recent decisions</p>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
              <EventCard key={event.id} event={event} onClick={() => navigate(`/invitees?tab=events&event=${event.id}`)} compact />
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
      <DashboardWelcomeHeader
        user={user}
        gradientClasses="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700"
        blurColor="bg-white/10"
        accentTextColor="text-blue-100"
        badgeIcon={Send}
        badgeLabel="Invitation Manager"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
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
                onClick={() => navigate('/invitees?tab=events')}
                primary
              />
              <ActionCard
                title="View My Invitees"
                description="Manage your submissions"
                icon={Users}
                color="purple"
                onClick={() => navigate('/invitees?tab=events')}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 h-full">
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
                <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No events assigned to you yet</p>
                <p className="text-sm text-gray-400 mt-1">Contact your administrator to get assigned to events</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.slice(0, 4).map((event) => (
                  <EventCard key={event.id} event={event} onClick={() => navigate(`/invitees?tab=events&event=${event.id}`)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            My Recent Submissions
          </h2>
        </div>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8">
            <Send className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No recent submissions</p>
            <button
              onClick={() => navigate('/invitees?tab=events')}
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
      className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200/80 dark:border-gray-700/60 p-5 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-1' : ''}`}
      onClick={onClick}
    >
      {/* Subtle gradient overlay on hover */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`} />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {value.toLocaleString()}{suffix}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{subtitle}</p>
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg ring-1 ring-white/20 shrink-0 transition-transform duration-300 group-hover:scale-105`}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
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
      className={`group w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
        primary 
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg hover:-translate-y-0.5'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/70 border border-gray-200/80 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600'
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
      className="group p-4 border border-gray-200/80 dark:border-gray-700/60 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-900/20 cursor-pointer transition-all duration-200 hover:shadow-sm"
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
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
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
                  onClick={() => { onClose(); navigate(`/invitees?tab=events&event=${event.id}`); }}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 cursor-pointer transition-all"
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
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
