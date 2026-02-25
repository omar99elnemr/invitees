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
  Search,
  X,
  ChevronRight,
} from 'lucide-react';
import { liveDashboardAPI, LiveEvent, LiveDashboardStats, RecentCheckin } from '../services/api';
import { formatTimeEgypt, formatEventDateTime } from '../utils/formatters';

export default function LiveDashboard() {
  const { eventCode } = useParams<{ eventCode: string }>();
  
  const [eventInfo, setEventInfo] = useState<LiveEvent | null>(null);
  const [stats, setStats] = useState<LiveDashboardStats | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<RecentCheckin[]>([]);
  const [totalCheckedIn, setTotalCheckedIn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showArrivalsModal, setShowArrivalsModal] = useState(false);
  const [allCheckins, setAllCheckins] = useState<RecentCheckin[]>([]);
  const [arrivalsSearch, setArrivalsSearch] = useState('');
  const [loadingAll, setLoadingAll] = useState(false);

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
      setTotalCheckedIn(recentRes.data.total || recentRes.data.recent_checkins.length);
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
      <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="text-center text-white">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Event Not Found</h2>
          <p className="text-gray-400 mt-2">The event code "{eventCode}" is not valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Header */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="bg-primary p-1.5 sm:p-3 rounded-lg sm:rounded-xl">
                <Activity className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-bold">Live Dashboard</h1>
                <p className="text-gray-400 text-[10px] sm:text-sm">Real-time attendance</p>
              </div>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center gap-1.5 sm:gap-2 text-sm ${
                autoRefresh ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
          </div>
        </div>
      </div>

      {eventInfo && stats && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {/* Event Info */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 mb-4 sm:mb-8 border border-white/10">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <h2 className="text-base sm:text-3xl font-bold truncate">{eventInfo.name}</h2>
                  <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-sm font-medium shrink-0 ${
                    eventInfo.status === 'ongoing' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {eventInfo.status === 'ongoing' ? 'Live' : 'Upcoming'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-6 text-xs sm:text-base text-gray-400">
                  <span className="flex items-center gap-1 sm:gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    {formatEventDateTime(eventInfo.start_date)}
                  </span>
                  {eventInfo.venue && (
                    <span className="flex items-center gap-1 sm:gap-2">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                      {eventInfo.venue}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-left sm:text-right text-xs sm:text-sm text-gray-400 shrink-0">
                <span className="sm:block">Last updated {formatTimeEgypt(lastUpdated.toISOString())}</span>
              </div>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            {/* Total Arrived */}
            <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-green-500/30">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                <div className="bg-green-500/20 p-1.5 sm:p-2 rounded-lg">
                  <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-green-400" />
                </div>
                <span className="text-green-400 font-medium text-xs sm:text-base">Total Arrived</span>
              </div>
              <div className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">{stats.stats.total_arrived}</div>
              <div className="text-[10px] sm:text-sm text-gray-400">
                {stats.stats.checked_in} invitees + {stats.stats.actual_guests} guests
              </div>
            </div>

            {/* Checked In */}
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-blue-500/30">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                <div className="bg-blue-500/20 p-1.5 sm:p-2 rounded-lg">
                  <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
                </div>
                <span className="text-blue-400 font-medium text-xs sm:text-base">Checked In</span>
              </div>
              <div className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">{stats.stats.checked_in}</div>
              <div className="text-[10px] sm:text-sm text-gray-400">
                of {stats.stats.expected_attendees} expected ({stats.stats.attendance_rate}%)
              </div>
            </div>

            {/* Not Yet Arrived */}
            <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-yellow-500/30">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                <div className="bg-yellow-500/20 p-1.5 sm:p-2 rounded-lg">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400" />
                </div>
                <span className="text-yellow-400 font-medium text-xs sm:text-base">Not Yet Arrived</span>
              </div>
              <div className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">{stats.stats.not_yet_arrived}</div>
              <div className="text-[10px] sm:text-sm text-gray-400">
                {stats.stats.metric === 'approved' ? 'Approved but not checked in' :
                 stats.stats.metric === 'invited' ? 'Invited but not checked in' :
                 'Confirmed but not checked in'}
              </div>
            </div>

            {/* Expected Total */}
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-purple-500/30">
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                <div className="bg-purple-500/20 p-1.5 sm:p-2 rounded-lg">
                  <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-purple-400" />
                </div>
                <span className="text-purple-400 font-medium text-xs sm:text-base">Expected Total</span>
              </div>
              <div className="text-2xl sm:text-5xl font-bold text-white mb-1 sm:mb-2">{stats.stats.expected_total}</div>
              <div className="text-[10px] sm:text-sm text-gray-400">
                {stats.stats.expected_attendees} invitees + {stats.stats.expected_guests} guests
              </div>
            </div>
          </div>

          {/* Secondary Stats & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Confirmation Breakdown */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
              <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                Confirmation Status
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                    <span className="text-sm sm:text-base">Confirmed Coming</span>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold">{stats.stats.confirmed_coming}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                    <span className="text-sm sm:text-base">Not Coming</span>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold">{stats.stats.confirmed_not_coming}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <span className="text-sm sm:text-base">No Response</span>
                  </div>
                  <span className="text-lg sm:text-2xl font-bold">{stats.stats.not_responded}</span>
                </div>
                <div className="pt-3 sm:pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Response Rate</span>
                    <span className="text-base sm:text-xl font-semibold">{stats.stats.confirmation_rate}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity Overview */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
              <h3 className="text-sm sm:text-lg font-semibold mb-3 sm:mb-4">Capacity Overview</h3>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span className="text-gray-400">Approved Invitations</span>
                    <span>{stats.stats.total_approved}</span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span className="text-gray-400">Check-in Progress</span>
                    <span>{stats.stats.checked_in} / {stats.stats.expected_attendees}</span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${stats.stats.attendance_rate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs sm:text-sm mb-2">
                    <span className="text-gray-400">Guest Arrival</span>
                    <span>{stats.stats.actual_guests} / {stats.stats.expected_guests}</span>
                  </div>
                  <div className="h-2.5 sm:h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${stats.stats.expected_guests > 0 ? (stats.stats.actual_guests / stats.stats.expected_guests * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Check-ins */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-sm sm:text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                  Recent Arrivals
                </h3>
                {totalCheckedIn > 5 && (
                  <button
                    onClick={async () => {
                      setShowArrivalsModal(true);
                      setLoadingAll(true);
                      try {
                        const res = await liveDashboardAPI.getRecentActivity(eventCode!, 500);
                        setAllCheckins(res.data.recent_checkins);
                      } catch { /* ignore */ }
                      setLoadingAll(false);
                    }}
                    className="text-xs text-green-400 hover:text-green-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    View all ({totalCheckedIn})
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              {recentCheckins.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {recentCheckins.map((checkin, index) => (
                    <div key={index} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm sm:text-base">{checkin.name}</div>
                        <div className="text-[10px] sm:text-xs text-gray-400">
                          {checkin.company && `${checkin.company} • `}
                          {checkin.guests > 0 ? `+${checkin.guests} guests` : 'No guests'}
                        </div>
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400 shrink-0">
                        {formatTimeEgypt(checkin.checked_in_at)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-6 sm:py-8">
                  <Clock className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent check-ins</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Arrivals Modal */}
      {showArrivalsModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowArrivalsModal(false); setArrivalsSearch(''); }}>
          <div
            className="bg-gray-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                All Arrivals ({totalCheckedIn})
              </h3>
              <button onClick={() => { setShowArrivalsModal(false); setArrivalsSearch(''); }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name or company..."
                  value={arrivalsSearch}
                  onChange={e => setArrivalsSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50"
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingAll ? (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" />
                  <p className="text-sm">Loading arrivals...</p>
                </div>
              ) : (() => {
                const q = arrivalsSearch.toLowerCase().trim();
                const filtered = q
                  ? allCheckins.filter(c => c.name.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q)))
                  : allCheckins;
                return filtered.length > 0 ? (
                  <>{filtered.map((checkin, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-2 h-2 bg-green-400 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm text-white">{checkin.name}</div>
                        <div className="text-xs text-gray-400">
                          {checkin.company && `${checkin.company} • `}
                          {checkin.guests > 0 ? `+${checkin.guests} guests` : 'No guests'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 shrink-0">
                        {formatTimeEgypt(checkin.checked_in_at)}
                      </div>
                    </div>
                  ))}
                  {q && <p className="text-center text-xs text-gray-500 pt-2">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No arrivals match "{arrivalsSearch}"</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
