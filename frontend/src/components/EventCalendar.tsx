/**
 * EventCalendar — shared calendar component for Dashboard and Events page.
 * Renders a month grid with event dots. Supports navigation, day click, event click.
 */
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react';
import { getHour12 } from '../utils/formatters';
import type { Event } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseEventDate(d: string): Date {
  // Backend stores Egypt local time with 'Z' suffix. Strip 'Z' → JS parses as local.
  return new Date(d.replace('Z', ''));
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-500',
  ongoing: 'bg-green-500',
  ended: 'bg-gray-400',
  cancelled: 'bg-red-500',
  on_hold: 'bg-yellow-500',
};

const statusBadge: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  ongoing: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  ended: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const statusLabel: Record<string, string> = {
  upcoming: 'Upcoming',
  ongoing: 'Live',
  ended: 'Ended',
  cancelled: 'Cancelled',
  on_hold: 'On Hold',
};

function formatCalDate(d: string) {
  return new Date(d).toLocaleDateString('en-EG', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: getHour12(),
  });
}

// ── types ────────────────────────────────────────────────────────────────────

export interface EventCalendarProps {
  events: Event[];
  /** Called when user clicks a day (used in Events page to open Create modal) */
  onDayClick?: (date: Date) => void;
  /** Called when user clicks an event */
  onEventClick?: (event: Event) => void;
  /** Compact mode for Dashboard widget (smaller cells, fewer details) */
  compact?: boolean;
  /** Extra className on the wrapper */
  className?: string;
}

// ── component ────────────────────────────────────────────────────────────────

export default function EventCalendar({ events, onDayClick, onEventClick, compact, className }: EventCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Build a map: "YYYY-MM-DD" → Event[]
  const eventsByDate = useMemo(() => {
    const map: Record<string, Event[]> = {};
    events.forEach(ev => {
      const start = parseEventDate(ev.start_date);
      const end = parseEventDate(ev.end_date);
      // Mark every day the event spans
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      while (cursor <= endDay) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        if (!map[key]) map[key] = [];
        if (!map[key].find(e => e.id === ev.id)) map[key].push(ev);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [events]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  // Navigation
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); };
  const goPrev = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const goNext = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const goPrevYear = () => setViewYear(y => y - 1);
  const goNextYear = () => setViewYear(y => y + 1);

  // Events for the selected day
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = `${selectedDay.getFullYear()}-${selectedDay.getMonth()}-${selectedDay.getDate()}`;
    return eventsByDate[key] || [];
  }, [selectedDay, eventsByDate]);

  const handleDayClick = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    setSelectedDay(prev => prev && isSameDay(prev, date) ? null : date);
  };

  // Build cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className={className}>
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          {!compact && (
            <button onClick={goPrevYear} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Previous year">
              <ChevronLeft className="w-4 h-4" /><ChevronLeft className="w-4 h-4 -ml-3" />
            </button>
          )}
          <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" title="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <h3 className={`font-semibold text-gray-900 dark:text-white ${compact ? 'text-sm' : 'text-base'}`}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button onClick={goToday} className="px-2 py-0.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
            Today
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" title="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!compact && (
            <button onClick={goNextYear} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Next year">
              <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-3" />
            </button>
          )}
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className={`text-center font-medium text-gray-400 dark:text-gray-500 ${compact ? 'text-[10px] py-1' : 'text-xs py-1.5'}`}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} className="aspect-square" />;

          const cellDate = new Date(viewYear, viewMonth, day);
          const key = `${viewYear}-${viewMonth}-${day}`;
          const dayEvents = eventsByDate[key] || [];
          const isToday = isSameDay(cellDate, today);
          const isSelected = selectedDay && isSameDay(cellDate, selectedDay);
          const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={key}
              onClick={() => {
                handleDayClick(day);
                if (!hasEvents && onDayClick) onDayClick(cellDate);
              }}
              className={`
                aspect-square flex flex-col items-center justify-center relative rounded-lg transition-all duration-150 text-sm
                ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-500' : ''}
                ${isToday && !isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 font-bold' : ''}
                ${!isSelected && !isToday ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
                ${isPast && !isToday && !isSelected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}
                ${hasEvents ? 'cursor-pointer' : onDayClick ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              <span className={`${compact ? 'text-xs' : 'text-sm'} ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                {day}
              </span>
              {/* Event dots */}
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, compact ? 2 : 3).map(ev => (
                    <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${statusColors[ev.status] || 'bg-gray-400'}`} />
                  ))}
                  {dayEvents.length > (compact ? 2 : 3) && (
                    <span className="text-[8px] text-gray-400 leading-none">+{dayEvents.length - (compact ? 2 : 3)}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day event list */}
      {selectedDay && selectedDayEvents.length > 0 && (
        <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            {' · '}{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {selectedDayEvents.map(ev => (
              <button
                key={ev.id}
                onClick={(e) => { e.stopPropagation(); onEventClick?.(ev); }}
                className="w-full text-left p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {ev.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatCalDate(ev.start_date)}
                      </span>
                      {!compact && ev.venue && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          {ev.venue}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge[ev.status] || ''}`}>
                    {statusLabel[ev.status] || ev.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty selected day — prompt to create (Events page) */}
      {selectedDay && selectedDayEvents.length === 0 && onDayClick && (
        <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            No events on {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
}
