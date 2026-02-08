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
  Phone,
  RefreshCw,
} from 'lucide-react';
import { portalAPI, PortalVerifyResponse } from '../services/api';

export default function Portal() {
  const [verifyMode, setVerifyMode] = useState<'code' | 'phone'>('code');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendeeData, setAttendeeData] = useState<PortalVerifyResponse['attendee'] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [attendeeCode, setAttendeeCode] = useState(''); // Store the code for confirmation
  const [changingResponse, setChangingResponse] = useState(false);

  const handleVerify = async () => {
    if (verifyMode === 'code' && !code.trim()) {
      setError('Please enter your invitation code');
      return;
    }
    if (verifyMode === 'phone' && !phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const response = await portalAPI.verify(
        verifyMode === 'code' ? code.trim() : undefined,
        verifyMode === 'phone' ? phone.trim() : undefined
      );

      if (response.data.valid && response.data.attendee) {
        setAttendeeData(response.data.attendee);
        setGuestCount(response.data.attendee.confirmed_guests ?? 0);
        // Store the attendance code for confirmation
        const attendee = response.data.attendee as any;
        setAttendeeCode(attendee.attendance_code || code.trim());
      } else {
        setError(response.data.error || 'Invalid code or phone number');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to verify. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (isComing: boolean) => {
    try {
      setConfirmLoading(true);
      // Use attendeeCode which may have been retrieved from phone lookup
      const confirmCode = attendeeCode || code;
      const response = await portalAPI.confirmAttendance(confirmCode, isComing, isComing ? guestCount : 0);

      if (response.data.success) {
        setConfirmed(true);
        setChangingResponse(false);
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
    setPhone('');
    setAttendeeData(null);
    setError('');
    setConfirmed(false);
    setGuestCount(0);
    setAttendeeCode('');
    setVerifyMode('code');
    setChangingResponse(false);
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-primary/5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Ticket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Event Attendance Confirmation Portal</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Enter your invitation code to confirm your attendance</p>
        </div>

        {!attendeeData ? (
          /* Code/Phone Entry Form */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="space-y-6">
              {/* Mode Toggle */}
              <div className="flex rounded-xl border-2 border-gray-200 dark:border-gray-700 p-1">
                <button
                  onClick={() => setVerifyMode('code')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    verifyMode === 'code' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Ticket className="w-5 h-5" />
                  Use Code
                </button>
                <button
                  onClick={() => setVerifyMode('phone')}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    verifyMode === 'phone' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Phone className="w-5 h-5" />
                  Use Phone
                </button>
              </div>

              {verifyMode === 'code' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invitation Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Enter your code (e.g., GALA24-7X9K)"
                    className="w-full px-6 py-4 text-xl font-mono text-center border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition bg-white dark:bg-gray-700 dark:text-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    autoFocus
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full px-6 py-4 text-xl text-center border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition bg-white dark:bg-gray-700 dark:text-white"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    autoFocus
                  />
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 flex items-center gap-3">
                  <XCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || (verifyMode === 'code' ? !code.trim() : !phone.trim())}
                className="w-full py-4 bg-primary text-white text-lg font-medium rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Verify {verifyMode === 'code' ? 'Code' : 'Phone'}
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {verifyMode === 'code' 
                  ? 'Your code can be found on your invitation card or in your invitation email/message'
                  : 'Enter the phone number you registered with for your invitation'
                }
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Event Details</h3>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{attendeeData.event_name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
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
                      <p className="font-medium text-gray-900 dark:text-white">Venue</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{attendeeData.event_venue}</p>
                    </div>
                  </div>
                )}

                {attendeeData.inviter_name && (
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Invited By</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{attendeeData.inviter_name}</p>
                    </div>
                  </div>
                )}

                {(attendeeData.company || attendeeData.position) && (
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {attendeeData.position || 'Guest'}
                      </p>
                      {attendeeData.company && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{attendeeData.company}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Guest Allowance</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You may bring up to {attendeeData.plus_one} guest(s)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Section */}
            {!attendeeData.checked_in && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Your Attendance</h3>

                {(confirmed || attendeeData.attendance_confirmed !== null) && !changingResponse ? (
                  <div className="space-y-3">
                    <div
                      className={`p-4 rounded-xl ${
                        attendeeData.attendance_confirmed
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {attendeeData.attendance_confirmed ? (
                          <>
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-300">You're confirmed!</p>
                              <p className="text-sm text-green-600 dark:text-green-400">
                                Attending with {attendeeData.confirmed_guests || 0} guest(s)
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                            <div>
                              <p className="font-medium text-red-800 dark:text-red-300">Not Attending</p>
                              <p className="text-sm text-red-600 dark:text-red-400">
                                We're sorry you can't make it
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setChangingResponse(true);
                        setConfirmed(false);
                        setGuestCount(attendeeData.confirmed_guests ?? 0);
                      }}
                      className="w-full py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2 text-sm"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Change My Response
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {attendeeData.plus_one > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          How many guests are you bringing?
                        </label>
                        <select
                          value={guestCount}
                          onChange={(e) => setGuestCount(parseInt(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 dark:text-white"
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
                        className="py-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
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
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-800 dark:text-green-300">You're Checked In!</p>
                    <p className="text-green-600 dark:text-green-400">Enjoy the event!</p>
                  </div>
                </div>
              </div>
            )}

            {/* Back Button */}
            <button
              onClick={handleReset}
              className="w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
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
