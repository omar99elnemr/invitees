/**
 * EventCalendar — shared calendar component for Dashboard and Events page.
 *
 * Two visual modes controlled by the `compact` prop:
 *  • compact  – Dashboard widget: small dots, no event titles on grid.
 *  • full     – Events page:  event titles shown in each day cell,
 *               fixed-height grid (no scrolling to see the whole month),
 *               clicking a day only selects it (no direct create action).
 *
 * Both modes support month/year navigation and event click callbacks.
 */
import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Event } from '../types';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseEventDate(d: string): Date {
  return new Date(d.replace('Z', ''));
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusDot: Record<string, string> = {
  upcoming: 'bg-blue-500',
  ongoing: 'bg-green-500',
  ended: 'bg-gray-400',
  cancelled: 'bg-red-500',
  on_hold: 'bg-yellow-500',
};

const statusTextColor: Record<string, string> = {
  upcoming: 'text-blue-600 dark:text-blue-400',
  ongoing: 'text-green-600 dark:text-green-400',
  ended: 'text-gray-500 dark:text-gray-400',
  cancelled: 'text-red-500 dark:text-red-400',
  on_hold: 'text-yellow-600 dark:text-yellow-400',
};

const statusBorder: Record<string, string> = {
  upcoming: 'border-l-2 border-blue-500',
  ongoing: 'border-l-2 border-green-500',
  ended: 'border-l-2 border-gray-400',
  cancelled: 'border-l-2 border-red-500',
  on_hold: 'border-l-2 border-yellow-500',
};

// ── types ────────────────────────────────────────────────────────────────────

export interface EventCalendarProps {
  events: Event[];
  /** Called when user clicks an event */
  onEventClick?: (event: Event) => void;
  /** Expose the currently selected day to the parent */
  onDaySelect?: (date: Date | null) => void;
  /** Compact mode for Dashboard widget (smaller cells, dots only) */
  compact?: boolean;
  /** Extra className on the wrapper */
  className?: string;
}

// ── component ────────────────────────────────────────────────────────────────

export default function EventCalendar({ events, onEventClick, onDaySelect, compact, className }: EventCalendarProps) {
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

  const handleDayClick = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    const newSel = selectedDay && isSameDay(selectedDay, date) ? null : date;
    setSelectedDay(newSel);
    onDaySelect?.(newSel);
  };

  // Build cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const totalRows = cells.length / 7;

  // ──────────────────────────────────────────────────────────────────────────
  // COMPACT MODE — Dashboard widget (dots only, no event titles)
  // ──────────────────────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className={className}>
        {/* Nav */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={goPrev} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </h3>
            <button onClick={goToday} className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
              Today
            </button>
          </div>
          <button onClick={goNext} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-0.5">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-0.5">{d.slice(0, 2)}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-px">
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
                onClick={() => handleDayClick(day)}
                className={`
                  aspect-square flex flex-col items-center justify-center relative rounded-md transition-all duration-100
                  ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-1.5 ring-indigo-500' : ''}
                  ${isToday && !isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}
                  ${!isSelected && !isToday ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
                  ${isPast && !isToday && !isSelected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}
                  ${hasEvents ? 'cursor-pointer' : 'cursor-pointer'}
                `}
              >
                <span className={`text-xs leading-none ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}`}>
                  {day}
                </span>
                {hasEvents && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <span key={ev.id} className={`w-1 h-1 rounded-full ${statusDot[ev.status] || 'bg-gray-400'}`} />
                    ))}
                    {dayEvents.length > 3 && <span className="text-[7px] text-gray-400 leading-none">+{dayEvents.length - 3}</span>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // FULL MODE — Events page (event titles on cells, fixed-height, no scroll)
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className={className}>
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-0.5">
          <button onClick={goPrevYear} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Previous year">
            <ChevronLeft className="w-4 h-4" /><ChevronLeft className="w-4 h-4 -ml-3" />
          </button>
          <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" title="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h3>
          <button onClick={goToday} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
            Today
          </button>
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors" title="Next month">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={goNextYear} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Next year">
            <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-3" />
          </button>
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-semibold py-2 text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
              i === 0 || i === 6 ? 'text-red-400 dark:text-red-500/70' : ''
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid — fixed height: each row stretches equally */}
      <div className="grid grid-cols-7 border-l border-gray-200 dark:border-gray-700" style={{ minHeight: `${totalRows * 5.5}rem` }}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`e${idx}`} className="border-r border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30" />;
          }

          const cellDate = new Date(viewYear, viewMonth, day);
          const key = `${viewYear}-${viewMonth}-${day}`;
          const dayEvents = eventsByDate[key] || [];
          const isToday = isSameDay(cellDate, today);
          const isSelected = selectedDay && isSameDay(cellDate, selectedDay);
          const isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

          return (
            <button
              key={key}
              onClick={() => handleDayClick(day)}
              className={`
                relative border-r border-b border-gray-100 dark:border-gray-700/50 p-1 text-left flex flex-col
                transition-colors duration-100 cursor-pointer group
                ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-inset ring-indigo-500' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
                ${isPast && !isToday && !isSelected ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''}
              `}
              style={{ minHeight: `${5.5}rem` }}
            >
              {/* Day number */}
              <span className={`
                text-xs font-medium leading-none mb-0.5 self-end w-6 h-6 flex items-center justify-center rounded-full
                ${isToday ? 'bg-indigo-600 text-white font-bold' : ''}
                ${isSelected && !isToday ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold' : ''}
                ${!isToday && !isSelected && isPast ? 'text-gray-400 dark:text-gray-500' : ''}
                ${!isToday && !isSelected && !isPast ? 'text-gray-700 dark:text-gray-300' : ''}
              `}>
                {day}
              </span>

              {/* Event titles */}
              <div className="flex-1 space-y-px overflow-hidden">
                {dayEvents.slice(0, 2).map(ev => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick?.(ev); }}
                    className={`
                      text-[10px] leading-tight truncate px-1 py-0.5 rounded cursor-pointer
                      hover:opacity-80 transition-opacity font-medium
                      ${statusTextColor[ev.status] || 'text-gray-500'}
                      ${statusBorder[ev.status] || ''}
                      bg-gray-50 dark:bg-gray-700/50
                    `}
                    title={ev.name}
                  >
                    {ev.name}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 pl-1">+{dayEvents.length - 2} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
