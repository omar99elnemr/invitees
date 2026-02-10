import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { LiveDashboardSkeleton } from '../components/common/LoadingSkeleton';
import {
  Users,
  UserCheck,
  Clock,
  Calendar,
  MapPin,
  TrendingUp,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Activity,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { liveDashboardAPI, LiveEvent, LiveDashboardStats, RecentCheckin } from '../services/api';
import { formatDateTimeEgypt, formatTimeEgypt } from '../utils/formatters';

export default function LiveDashboard() {
  const { eventCode } = useParams<{ eventCode: string }>();
  
  const [eventInfo, setEventInfo] = useState<LiveEvent | null>(null);
  const [stats, setStats] = useState<LiveDashboardStats | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load event info on mount
  useEffect(() => {
    if (eventCode) {
      loadEventInfo();
    }
  }, [eventCode]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!eventCode || !autoRefresh || error) return;

    const interval = setInterval(() => {
      refreshData();
    }, 10000);

    return () => clearInterval(interval);
  }, [eventCode, autoRefresh, error]);

  const loadEventInfo = async () => {
    if (!eventCode) return;
    try {
      setLoading(true);
      setError(null);
      const response = await liveDashboardAPI.getEventInfo(eventCode);
      setEventInfo(response.data.event);
      await refreshData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Event not found');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    if (!eventCode) return;

    try {
      const [statsRes, recentRes] = await Promise.all([
        liveDashboardAPI.getEventStats(eventCode),
        liveDashboardAPI.getRecentActivity(eventCode)
      ]);

      setStats(statsRes.data);
      setRecentCheckins(recentRes.data.recent_checkins);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to refresh data', err);
    }
  };

  if (loading) {
    return <LiveDashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Event Not Found</h2>
          <p className="text-gray-400 mt-2">The event code "{eventCode}" is not valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-primary p-2 sm:p-3 rounded-xl">
                <Activity className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">Live Event Dashboard</h1>
                <p className="text-gray-400 text-xs sm:text-sm">Real-time attendance tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Auto-refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  autoRefresh ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Live' : 'Paused'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {eventInfo && stats && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Event Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 mb-8 border border-white/10">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                  <h2 className="text-xl sm:text-3xl font-bold truncate">{eventInfo.name}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium shrink-0 ${
                    eventInfo.status === 'ongoing' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {eventInfo.status === 'ongoing' ? 'In Progress' : 'Upcoming'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm sm:text-base text-gray-400">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {formatDateTimeEgypt(eventInfo.start_date)}
                  </span>
                  {eventInfo.venue && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {eventInfo.venue}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right text-sm text-gray-400 shrink-0">
                <div>Last updated</div>
                <div>{formatTimeEgypt(lastUpdated.toISOString())}</div>
              </div>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Arrived */}
            <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-2xl p-6 border border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <UserCheck className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-green-400 font-medium">Total Arrived</span>
              </div>
              <div className="text-3xl sm:text-5xl font-bold text-white mb-2">{stats.stats.total_arrived}</div>
              <div className="text-sm text-gray-400">
                {stats.stats.checked_in} invitees + {stats.stats.actual_guests} guests
              </div>
            </div>

            {/* Checked In */}
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-500/20 p-2 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-blue-400 font-medium">Invitees Checked In</span>
              </div>
              <div className="text-3xl sm:text-5xl font-bold text-white mb-2">{stats.stats.checked_in}</div>
              <div className="text-sm text-gray-400">
                of {stats.stats.expected_attendees} expected ({stats.stats.attendance_rate}%)
              </div>
            </div>

            {/* Not Yet Arrived */}
            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 backdrop-blur-sm rounded-2xl p-6 border border-yellow-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-yellow-500/20 p-2 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
                <span className="text-yellow-400 font-medium">Not Yet Arrived</span>
              </div>
              <div className="text-3xl sm:text-5xl font-bold text-white mb-2">{stats.stats.not_yet_arrived}</div>
              <div className="text-sm text-gray-400">
                Confirmed but not checked in
              </div>
            </div>

            {/* Expected Total */}
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-purple-500/20 p-2 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-purple-400 font-medium">Expected Total</span>
              </div>
              <div className="text-3xl sm:text-5xl font-bold text-white mb-2">{stats.stats.expected_total}</div>
              <div className="text-sm text-gray-400">
                {stats.stats.expected_attendees} invitees + {stats.stats.expected_guests} guests
              </div>
            </div>
          </div>

          {/* Secondary Stats & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Confirmation Breakdown */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                Confirmation Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span>Confirmed Coming</span>
                  </div>
                  <span className="text-2xl font-bold">{stats.stats.confirmed_coming}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span>Not Coming</span>
                  </div>
                  <span className="text-2xl font-bold">{stats.stats.confirmed_not_coming}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-gray-400" />
                    <span>No Response</span>
                  </div>
                  <span className="text-2xl font-bold">{stats.stats.not_responded}</span>
                </div>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Response Rate</span>
                    <span className="text-xl font-semibold">{stats.stats.confirmation_rate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity Overview */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4">Capacity Overview</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Approved Invitations</span>
                    <span>{stats.stats.total_approved}</span>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Check-in Progress</span>
                    <span>{stats.stats.checked_in} / {stats.stats.confirmed_coming}</span>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.stats.attendance_rate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Guest Arrival</span>
                    <span>{stats.stats.actual_guests} / {stats.stats.expected_guests}</span>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${stats.stats.expected_guests > 0 ? (stats.stats.actual_guests / stats.stats.expected_guests * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Check-ins */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                Recent Arrivals
              </h3>
              {recentCheckins.length > 0 ? (
                <div className="space-y-3">
                  {recentCheckins.map((checkin, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{checkin.name}</div>
                        <div className="text-xs text-gray-400">
                          {checkin.company && `${checkin.company} • `}
                          {checkin.guests > 0 ? `+${checkin.guests} guests` : 'No guests'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {formatTimeEgypt(checkin.checked_in_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No recent check-ins</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
