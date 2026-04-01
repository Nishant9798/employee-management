import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  CalendarDays, ChevronLeft, ChevronRight, X, Cake, Award,
  Users, PartyPopper, BookOpen, TreePalm, Clock, List, LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/* ── colour system ──────────────────────────────────── */
const EVENT_STYLES = {
  leave: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    border: 'border-blue-400 dark:border-blue-600',
    label: 'Approved Leave',
  },
  holiday: {
    bg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-700 dark:text-red-300',
    dot: 'bg-red-500',
    border: 'border-red-400 dark:border-red-600',
    label: 'Holiday',
  },
  birthday: {
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    text: 'text-pink-700 dark:text-pink-300',
    dot: 'bg-pink-500',
    border: 'border-pink-400 dark:border-pink-600',
    label: 'Birthday',
  },
  training: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    border: 'border-emerald-400 dark:border-emerald-600',
    label: 'Training',
  },
  anniversary: {
    bg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    border: 'border-amber-400 dark:border-amber-600',
    label: 'Work Anniversary',
  },
};

/* ── helpers ──────────────────────────────────── */
function pad(n) {
  return String(n).padStart(2, '0');
}

function fmtDate(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function dateInRange(from, to, y, m, d) {
  const t = new Date(y, m, d);
  t.setHours(0, 0, 0, 0);
  const f = new Date(from);
  f.setHours(0, 0, 0, 0);
  const e = new Date(to);
  e.setHours(0, 0, 0, 0);
  return t >= f && t <= e;
}

function sameMonthDay(dateStr, month, day) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getMonth() === month && d.getDate() === day;
}

function sameDay(dateStr, y, m, d) {
  if (!dateStr) return false;
  const dt = new Date(dateStr);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
}

function yearsAgo(dateStr, refYear) {
  if (!dateStr) return 0;
  return refYear - new Date(dateStr).getFullYear();
}

function formatDisplayDate(y, m, d) {
  return new Date(y, m, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ── component ──────────────────────────────────── */
export default function TeamCalendar() {
  const { user, isAdmin, isManager } = useAuth();
  const today = useMemo(() => new Date(), []);

  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [celebrations, setCelebrations] = useState({ birthdays: [], anniversaries: [] });
  const [training, setTraining] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  /* ── data fetching ── */
  useEffect(() => {
    loadAll();
  }, [currentMonth, currentYear]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [leavesRes, holidaysRes, celebRes, trainingRes, empRes] = await Promise.allSettled([
        api.get('/leaves/all-applications'),
        api.get('/holidays'),
        api.get('/employees/stats/celebrations'),
        api.get('/training/programs'),
        api.get('/employees'),
      ]);

      if (leavesRes.status === 'fulfilled') {
        const approved = (leavesRes.value.data || []).filter(
          (l) => l.status === 'approved' || l.status === 'Approved'
        );
        setLeaves(approved);
      }
      if (holidaysRes.status === 'fulfilled') setHolidays(holidaysRes.value.data || []);

      // Build celebrations from employee list for any month (the celebrations API only returns current month)
      if (empRes.status === 'fulfilled') {
        const allEmps = empRes.value.data || [];
        const monthBirthdays = allEmps.filter(e => {
          if (!e.dateOfBirth) return false;
          const d = new Date(e.dateOfBirth);
          return d.getMonth() === currentMonth;
        }).map(e => ({ name: e.name, department: e.department, dateOfBirth: e.dateOfBirth }));

        const monthAnniversaries = allEmps.filter(e => {
          if (!e.joiningDate) return false;
          const d = new Date(e.joiningDate);
          return d.getMonth() === currentMonth;
        }).map(e => ({
          name: e.name, department: e.department, joiningDate: e.joiningDate,
          years: currentYear - new Date(e.joiningDate).getFullYear()
        }));

        setCelebrations({ birthdays: monthBirthdays, anniversaries: monthAnniversaries });
      } else if (celebRes.status === 'fulfilled') {
        setCelebrations(celebRes.value.data || { birthdays: [], anniversaries: [] });
      }

      if (trainingRes.status === 'fulfilled') setTraining(trainingRes.value.data || []);
    } catch {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  /* ── navigation ── */
  const goToPrevMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const goToNextMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const goToToday = () => {
    setSelectedDay(null);
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  /* ── calendar grid ── */
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells = useMemo(() => {
    const cells = [];
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      cells.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isPrev: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, isCurrentMonth: true });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, isCurrentMonth: false, isNext: true });
    }
    return cells;
  }, [firstDayOfMonth, daysInMonth, daysInPrevMonth]);

  /* ── event lookups ── */
  const getEventsForDay = useCallback(
    (day) => {
      const events = [];

      // Leaves
      leaves.forEach((l) => {
        if (dateInRange(l.fromDate, l.toDate, currentYear, currentMonth, day)) {
          const empName = l.employee?.name || l.employeeName || l.name || 'Employee';
          events.push({
            type: 'leave',
            title: empName,
            subtitle: l.leaveType || l.type || 'Leave',
          });
        }
      });

      // Holidays
      holidays.forEach((h) => {
        if (sameDay(h.date, currentYear, currentMonth, day)) {
          events.push({
            type: 'holiday',
            title: h.name,
            subtitle: h.type || 'Holiday',
          });
        }
      });

      // Birthdays
      (celebrations.birthdays || []).forEach((b) => {
        const dob = b.dateOfBirth || b.dob || b.date;
        if (sameMonthDay(dob, currentMonth, day)) {
          events.push({
            type: 'birthday',
            title: b.name || b.employeeName || 'Employee',
            subtitle: `Birthday`,
          });
        }
      });

      // Anniversaries
      (celebrations.anniversaries || []).forEach((a) => {
        const joinDate = a.joiningDate || a.joinDate || a.date;
        if (sameMonthDay(joinDate, currentMonth, day)) {
          const yrs = yearsAgo(joinDate, currentYear);
          events.push({
            type: 'anniversary',
            title: a.name || a.employeeName || 'Employee',
            subtitle: yrs > 0 ? `${yrs} year${yrs > 1 ? 's' : ''}` : 'Anniversary',
          });
        }
      });

      // Training
      training.forEach((t) => {
        const start = t.startDate || t.date;
        const end = t.endDate || start;
        if (start && dateInRange(start, end, currentYear, currentMonth, day)) {
          events.push({
            type: 'training',
            title: t.name || t.title || 'Training',
            subtitle: t.instructor || 'Program',
          });
        }
      });

      return events;
    },
    [leaves, holidays, celebrations, training, currentMonth, currentYear]
  );

  const isToday = (day) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const isWeekend = (idx) => idx % 7 === 0 || idx % 7 === 6;

  /* ── stats ── */
  const stats = useMemo(() => {
    const todayStr = fmtDate(today.getFullYear(), today.getMonth(), today.getDate());
    const onLeaveToday = leaves.filter((l) =>
      dateInRange(l.fromDate, l.toDate, today.getFullYear(), today.getMonth(), today.getDate())
    ).length;

    const holidaysThisMonth = holidays.filter((h) => {
      const d = new Date(h.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const birthdaysThisMonth = (celebrations.birthdays || []).filter((b) => {
      const dob = b.dateOfBirth || b.dob || b.date;
      if (!dob) return false;
      return new Date(dob).getMonth() === currentMonth;
    }).length;

    return { onLeaveToday, holidaysThisMonth, birthdaysThisMonth };
  }, [leaves, holidays, celebrations, currentMonth, currentYear, today]);

  /* ── selected day detail ── */
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  /* ── list view data (for mobile / list toggle) ── */
  const listDays = useMemo(() => {
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const evts = getEventsForDay(d);
      if (evts.length > 0) {
        days.push({ day: d, events: evts });
      }
    }
    return days;
  }, [daysInMonth, getEventsForDay]);

  /* ── event icon helper ── */
  const EventIcon = ({ type, size = 12 }) => {
    switch (type) {
      case 'birthday':
        return <Cake size={size} />;
      case 'training':
        return <BookOpen size={size} />;
      case 'leave':
        return <TreePalm size={size} />;
      case 'holiday':
        return <PartyPopper size={size} />;
      case 'anniversary':
        return <Award size={size} />;
      default:
        return null;
    }
  };

  /* ── render ── */
  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="flex items-center gap-2">
              <CalendarDays size={28} />
              Team Calendar
            </h1>
            <p>Unified view of leaves, holidays, birthdays, training &amp; milestones</p>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white/20 text-white shadow-inner'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="Grid view"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white/20 text-white shadow-inner'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <CalendarDays size={100} className="text-white" />
        </div>
      </div>

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up">
        <div className="card flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <TreePalm size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.onLeaveToday}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">On leave today</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400">
            <PartyPopper size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.holidaysThisMonth}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Holidays this month</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center text-pink-600 dark:text-pink-400">
            <Cake size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.birthdaysThisMonth}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Birthdays this month</p>
          </div>
        </div>
      </div>

      {/* ── Calendar Card ── */}
      <div className="card animate-slide-up" style={{ animationDelay: '80ms' }}>
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={goToPrevMonth} className="btn-secondary p-2 rounded-lg">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={goToToday}
              className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition"
            >
              Today
            </button>
          </div>
          <button onClick={goToNextMonth} className="btn-secondary p-2 rounded-lg">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-5 text-xs">
          {Object.entries(EVENT_STYLES).map(([key, s]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400 dark:text-gray-500">
            <Clock size={20} className="animate-spin mr-2" />
            Loading calendar...
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Grid View ── */
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-xs font-semibold uppercase tracking-wider py-2 hidden sm:block ${
                    i === 0 || i === 6 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {d}
                </div>
              ))}
              {DAYS_SHORT.map((d, i) => (
                <div
                  key={`short-${i}`}
                  className={`text-center text-xs font-semibold uppercase tracking-wider py-2 sm:hidden ${
                    i === 0 || i === 6 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              {calendarCells.map((cell, idx) => {
                const events = cell.isCurrentMonth ? getEventsForDay(cell.day) : [];
                const todayCell = cell.isCurrentMonth && isToday(cell.day);
                const weekend = isWeekend(idx);
                const selected = cell.isCurrentMonth && selectedDay === cell.day;

                return (
                  <div
                    key={idx}
                    onClick={() => cell.isCurrentMonth && setSelectedDay(selectedDay === cell.day ? null : cell.day)}
                    className={`
                      relative min-h-[80px] sm:min-h-[110px] border-r border-b border-gray-200 dark:border-gray-700
                      transition-all duration-150 cursor-pointer group
                      ${!cell.isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}
                      ${weekend && cell.isCurrentMonth ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                      ${cell.isCurrentMonth ? 'hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10' : ''}
                      ${selected ? 'ring-2 ring-inset ring-indigo-500 dark:ring-indigo-400 bg-indigo-50/30 dark:bg-indigo-900/20' : ''}
                    `}
                  >
                    {/* Day number */}
                    <div className="flex items-center justify-between p-1.5 sm:p-2">
                      <span
                        className={`
                          inline-flex items-center justify-center text-sm font-medium
                          w-7 h-7 rounded-full transition-colors
                          ${!cell.isCurrentMonth ? 'text-gray-400 dark:text-gray-600' : ''}
                          ${cell.isCurrentMonth && !todayCell ? 'text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400' : ''}
                          ${todayCell ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300 dark:shadow-indigo-900' : ''}
                        `}
                      >
                        {cell.day}
                      </span>
                      {events.length > 0 && (
                        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 hidden sm:inline">
                          {events.length} event{events.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Event pills (desktop) */}
                    <div className="hidden sm:flex flex-col gap-0.5 px-1.5 pb-1.5 overflow-hidden">
                      {events.slice(0, 3).map((e, i) => (
                        <div
                          key={i}
                          className={`
                            text-[10px] leading-tight font-medium px-1.5 py-0.5 rounded truncate
                            ${EVENT_STYLES[e.type].bg} ${EVENT_STYLES[e.type].text}
                          `}
                        >
                          {e.type === 'birthday' && <Cake size={9} className="inline mr-0.5 -mt-px" />}
                          {e.title}
                        </div>
                      ))}
                      {events.length > 3 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 pl-1">
                          +{events.length - 3} more
                        </span>
                      )}
                    </div>

                    {/* Event dots (mobile) */}
                    <div className="flex sm:hidden flex-wrap gap-0.5 px-1.5 pb-1">
                      {events.slice(0, 5).map((e, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${EVENT_STYLES[e.type].dot}`} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* ── List View ── */
          <div className="space-y-3">
            {listDays.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
                <p>No events this month</p>
              </div>
            ) : (
              listDays.map(({ day, events }) => {
                const todayCell = isToday(day);
                const dayOfWeek = new Date(currentYear, currentMonth, day).toLocaleDateString('en-US', { weekday: 'short' });
                return (
                  <div
                    key={day}
                    className={`
                      flex gap-4 p-4 rounded-xl border transition-all
                      ${todayCell
                        ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="flex-shrink-0 text-center w-14">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{dayOfWeek}</p>
                      <p
                        className={`text-2xl font-bold ${
                          todayCell ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {day}
                      </p>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      {events.map((e, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${EVENT_STYLES[e.type].bg} ${EVENT_STYLES[e.type].text}`}
                        >
                          <EventIcon type={e.type} size={14} />
                          <span className="font-medium truncate">{e.title}</span>
                          <span className="text-[11px] opacity-70 ml-auto flex-shrink-0">{e.subtitle}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Slide-out Detail Panel ── */}
      {selectedDay !== null && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 transition-opacity"
            onClick={() => setSelectedDay(null)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatDisplayDate(currentYear, currentMonth, selectedDay)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {selectedEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <CalendarDays size={36} className="mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No events</p>
                  <p className="text-sm mt-1">Nothing scheduled for this day</p>
                </div>
              ) : (
                selectedEvents.map((e, i) => {
                  const style = EVENT_STYLES[e.type];
                  return (
                    <div
                      key={i}
                      className={`
                        flex items-start gap-3 p-4 rounded-xl border-l-4 ${style.border} ${style.bg}
                        transition-all hover:scale-[1.01]
                      `}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <div className={`flex-shrink-0 mt-0.5 ${style.text}`}>
                        <EventIcon type={e.type} size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm ${style.text}`}>{e.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{e.subtitle}</p>
                      </div>
                      <span
                        className={`ml-auto flex-shrink-0 text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
                      >
                        {style.label}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Custom animation keyframes ── */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
