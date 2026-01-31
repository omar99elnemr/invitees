import { useState, useEffect, useRef } from 'react';
import {
  Search,
  CheckCircle,
  Phone,
  User,
  Building,
  Calendar,
  MapPin,
  Clock,
  UserCheck,
  Undo2,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { checkinAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Event, EventInvitee } from '../types';
import toast from 'react-hot-toast';
import { formatDateTimeEgypt, formatTimeEgypt } from '../utils/formatters';

export default function CheckInConsole() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EventInvitee[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentCheckins, setRecentCheckins] = useState<EventInvitee[]>([]);
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [guestCounts, setGuestCounts] = useState<{ [key: number]: number }>({});
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, []);

  // Focus search input when event is selected
  useEffect(() => {
    if (selectedEvent && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [selectedEvent]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    if (!selectedEvent) return;
    
    const interval = setInterval(() => {
      loadStats(selectedEvent.id);
      loadRecentCheckins(selectedEvent.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedEvent]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await checkinAPI.getMyEvents();
      setEvents(response.data.events);
      
      // Auto-select first event if only one
      if (response.data.events.length === 1) {
        handleEventSelect(response.data.events[0]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = async (event: Event) => {
    setSelectedEvent(event);
    setSearchQuery('');
    setSearchResults([]);
    await Promise.all([
      loadStats(event.id),
      loadRecentCheckins(event.id)
    ]);
  };

  const loadStats = async (eventId: number) => {
    try {
      const response = await checkinAPI.getEventStats(eventId);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  };

  const loadRecentCheckins = async (eventId: number) => {
    try {
      const response = await checkinAPI.getRecentCheckins(eventId);
      setRecentCheckins(response.data.recent_checkins);
    } catch (error) {
      console.error('Failed to load recent check-ins', error);
    }
  };

  const handleSearch = async () => {
    if (!selectedEvent || searchQuery.length < 2) return;

    try {
      setSearching(true);
      const response = await checkinAPI.searchAttendees(selectedEvent.id, searchQuery);
      setSearchResults(response.data.results);
      
      // Initialize guest counts for results
      const counts: { [key: number]: number } = {};
      response.data.results.forEach(r => {
        counts[r.id] = r.confirmed_guests ?? 0;
      });
      setGuestCounts(counts);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async (invitee: EventInvitee) => {
    if (!selectedEvent) return;

    try {
      setCheckingIn(invitee.id);
      const guests = guestCounts[invitee.id] || 0;
      const response = await checkinAPI.checkIn(selectedEvent.id, invitee.id, guests);

      if (response.data.success) {
        toast.success(`${invitee.invitee_name} checked in successfully!`);
        
        // Update search results to show checked in
        setSearchResults(prev => 
          prev.map(r => r.id === invitee.id ? { ...r, checked_in: true, checked_in_at: new Date().toISOString() } : r)
        );
        
        // Refresh stats and recent
        loadStats(selectedEvent.id);
        loadRecentCheckins(selectedEvent.id);
        
        // Clear search and refocus
        setSearchQuery('');
        setSearchResults([]);
        searchInputRef.current?.focus();
      } else {
        toast.error(response.data.error || 'Check-in failed');
      }
    } catch (error: any) {
      if (error.response?.data?.already_checked_in) {
        toast.error('Already checked in!');
      } else {
        toast.error(error.response?.data?.error || 'Check-in failed');
      }
    } finally {
      setCheckingIn(null);
    }
  };

  const handleUndoCheckIn = async (invitee: EventInvitee) => {
    if (!selectedEvent) return;

    try {
      await checkinAPI.undoCheckIn(selectedEvent.id, invitee.id);
      toast.success('Check-in undone');
      
      // Refresh
      loadStats(selectedEvent.id);
      loadRecentCheckins(selectedEvent.id);
      
      // Update search results if applicable
      setSearchResults(prev => 
        prev.map(r => r.id === invitee.id ? { ...r, checked_in: false, checked_in_at: undefined } : r)
      );
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to undo check-in');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">No Events Assigned</h2>
          <p className="text-gray-500 mt-2">You don't have access to any events for check-in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary p-2 rounded-lg">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Check-in Console</h1>
                <p className="text-sm text-gray-500">Welcome, {user?.full_name || user?.username}</p>
              </div>
            </div>
            
            {/* Event Selector */}
            <div className="relative">
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => {
                  const event = events.find(ev => ev.id === Number(e.target.value));
                  if (event) handleEventSelect(event);
                }}
                className="appearance-none bg-gray-50 border border-gray-300 rounded-lg px-4 py-2 pr-10 font-medium focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select Event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {selectedEvent ? (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Event Info & Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            {/* Event Card */}
            <div className="bg-white rounded-xl shadow p-4">
              <h3 className="font-semibold text-gray-900 mb-2">{selectedEvent.name}</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDateTimeEgypt(selectedEvent.start_date)}
                </div>
                {selectedEvent.venue && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedEvent.venue}
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            {stats && (
              <>
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="text-sm text-gray-500">Checked In</div>
                  <div className="text-3xl font-bold text-green-600">{stats.checked_in}</div>
                  <div className="text-xs text-gray-400">of {stats.confirmed_coming} expected</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="text-sm text-gray-500">Total Arrived</div>
                  <div className="text-3xl font-bold text-primary">{stats.actual_total}</div>
                  <div className="text-xs text-gray-400">including {stats.total_actual_guests} guests</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4">
                  <div className="text-sm text-gray-500">Remaining</div>
                  <div className="text-3xl font-bold text-yellow-600">{stats.confirmed_coming - stats.checked_in}</div>
                  <div className="text-xs text-gray-400">confirmed but not arrived</div>
                </div>
              </>
            )}
          </div>

          {/* Search Section */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search by phone number, code, name, or inviter..."
                  className="w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching || searchQuery.length < 2}
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {searching ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                Search
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone number search is prioritized for faster lookup
            </p>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-xl shadow mb-6">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Search Results ({searchResults.length})</h3>
              </div>
              <div className="divide-y">
                {searchResults.map(invitee => (
                  <div key={invitee.id} className={`p-4 ${invitee.checked_in ? 'bg-green-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${invitee.checked_in ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {invitee.checked_in ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <User className="w-6 h-6 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{invitee.invitee_name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-3">
                            {invitee.invitee_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {invitee.invitee_phone}
                              </span>
                            )}
                            {invitee.invitee_company && (
                              <span className="flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                {invitee.invitee_company}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Code: {invitee.attendance_code || 'N/A'} | Inviter: {invitee.inviter_name || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {!invitee.checked_in ? (
                          <>
                            {/* Guest Count */}
                            {invitee.plus_one > 0 && (
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-600">Guests:</label>
                                <select
                                  value={guestCounts[invitee.id] || 0}
                                  onChange={(e) => setGuestCounts(prev => ({ ...prev, [invitee.id]: Number(e.target.value) }))}
                                  className="border border-gray-300 rounded px-2 py-1"
                                >
                                  {[...Array(invitee.plus_one + 1)].map((_, i) => (
                                    <option key={i} value={i}>{i}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <button
                              onClick={() => handleCheckIn(invitee)}
                              disabled={checkingIn === invitee.id}
                              className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              {checkingIn === invitee.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              Check In
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Checked in at {formatTimeEgypt(invitee.checked_in_at)}
                            </span>
                            <button
                              onClick={() => handleUndoCheckIn(invitee)}
                              className="px-3 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
                            >
                              <Undo2 className="w-4 h-4" />
                              Undo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Check-ins */}
          {recentCheckins.length > 0 && (
            <div className="bg-white rounded-xl shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Recent Check-ins</h3>
                <button
                  onClick={() => loadRecentCheckins(selectedEvent.id)}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              <div className="divide-y">
                {recentCheckins.map(invitee => (
                  <div key={invitee.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="font-medium text-gray-900">{invitee.invitee_name}</div>
                        <div className="text-xs text-gray-500">
                          {(invitee.actual_guests ?? 0) > 0 ? `+${invitee.actual_guests} guests` : 'No guests'}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {formatTimeEgypt(invitee.checked_in_at)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Select an Event</h2>
          <p className="text-gray-500 mt-2">Choose an event from the dropdown to start checking in attendees.</p>
        </div>
      )}
    </div>
  );
}
