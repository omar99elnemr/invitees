import { useState } from 'react';
import {
  Ticket,
  CheckCircle,
  XCircle,
  Calendar,
  MapPin,
  Users,
  User,
  Building,
  PartyPopper,
  ArrowLeft,
} from 'lucide-react';
import { portalAPI, PortalVerifyResponse } from '../services/api';

export default function Portal() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendeeData, setAttendeeData] = useState<PortalVerifyResponse['attendee'] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Please enter your invitation code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await portalAPI.verifyCode(code.trim());

      if (response.data.valid && response.data.attendee) {
        setAttendeeData(response.data.attendee);
        setGuestCount(response.data.attendee.confirmed_guests ?? 0);
      } else {
        setError(response.data.error || 'Invalid code');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (isComing: boolean) => {
    try {
      setConfirmLoading(true);
      const response = await portalAPI.confirmAttendance(code, isComing, isComing ? guestCount : 0);

      if (response.data.success) {
        setConfirmed(true);
        if (attendeeData) {
          setAttendeeData({
            ...attendeeData,
            attendance_confirmed: isComing,
            confirmed_guests: isComing ? guestCount : 0,
          });
        }
      }
    } catch (err) {
      setError('Failed to confirm attendance. Please try again.');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleReset = () => {
    setCode('');
    setAttendeeData(null);
    setError('');
    setConfirmed(false);
    setGuestCount(0);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-EG', {
      timeZone: 'Africa/Cairo',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-primary/5">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Ticket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Event Check-in Portal</h1>
          <p className="text-gray-600 mt-2">Enter your invitation code to view your details</p>
        </div>

        {!attendeeData ? (
          /* Code Entry Form */
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Enter your code (e.g., GALA24-7X9K)"
                  className="w-full px-6 py-4 text-xl font-mono text-center border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || !code.trim()}
                className="w-full py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Verify Code
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                Your code can be found on your invitation card or in your invitation email/message
              </p>
            </div>
          </div>
        ) : (
          /* Attendee Details */
          <div className="space-y-6">
            {/* Welcome Card */}
            <div className="bg-gradient-to-r from-primary to-primary-dark rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/80 text-sm mb-1">Welcome</p>
                  <h2 className="text-3xl font-bold">
                    {attendeeData.title ? `${attendeeData.title} ` : ''}
                    {attendeeData.name}
                  </h2>
                  {attendeeData.category && (
                    <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      {attendeeData.category} Guest
                    </span>
                  )}
                </div>
                <PartyPopper className="w-12 h-12 text-white/80" />
              </div>
            </div>

            {/* Event Details Card */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{attendeeData.event_name}</p>
                    <p className="text-sm text-gray-500">
                      {attendeeData.event_date && formatDate(attendeeData.event_date)}
                    </p>
                  </div>
                </div>

                {attendeeData.event_venue && (
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Venue</p>
                      <p className="text-sm text-gray-500">{attendeeData.event_venue}</p>
                    </div>
                  </div>
                )}

                {attendeeData.inviter_name && (
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Invited By</p>
                      <p className="text-sm text-gray-500">{attendeeData.inviter_name}</p>
                    </div>
                  </div>
                )}

                {(attendeeData.company || attendeeData.position) && (
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {attendeeData.position || 'Guest'}
                      </p>
                      {attendeeData.company && (
                        <p className="text-sm text-gray-500">{attendeeData.company}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Guest Allowance</p>
                    <p className="text-sm text-gray-500">
                      You may bring up to {attendeeData.plus_one} guest(s)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Section */}
            {!attendeeData.checked_in && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Your Attendance</h3>

                {confirmed || attendeeData.attendance_confirmed !== null ? (
                  <div
                    className={`p-4 rounded-xl ${
                      attendeeData.attendance_confirmed
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {attendeeData.attendance_confirmed ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <div>
                            <p className="font-medium text-green-800">You're confirmed!</p>
                            <p className="text-sm text-green-600">
                              Attending with {attendeeData.confirmed_guests || 0} guest(s)
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-600" />
                          <div>
                            <p className="font-medium text-red-800">Not Attending</p>
                            <p className="text-sm text-red-600">
                              We're sorry you can't make it
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attendeeData.plus_one > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          How many guests are you bringing?
                        </label>
                        <select
                          value={guestCount}
                          onChange={(e) => setGuestCount(parseInt(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                          {Array.from({ length: attendeeData.plus_one + 1 }, (_, i) => (
                            <option key={i} value={i}>
                              {i} guest{i !== 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleConfirm(true)}
                        disabled={confirmLoading}
                        className="py-4 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Yes, I'm Attending
                      </button>
                      <button
                        onClick={() => handleConfirm(false)}
                        disabled={confirmLoading}
                        className="py-4 bg-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-300 disabled:opacity-50 transition flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-5 h-5" />
                        Can't Attend
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Already Checked In */}
            {attendeeData.checked_in && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-800">You're Checked In!</p>
                    <p className="text-green-600">Enjoy the event!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Back Button */}
            <button
              onClick={handleReset}
              className="w-full py-3 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Check Another Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
