import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEPT_COLORS = {
  Engineering: 'bg-blue-500',
  Marketing: 'bg-green-500',
  Sales: 'bg-yellow-500',
  HR: 'bg-purple-500',
  Finance: 'bg-orange-500',
  Operations: 'bg-teal-500',
  Design: 'bg-pink-500',
  Support: 'bg-cyan-500',
  default: 'bg-indigo-500',
};

function getDeptColor(dept) {
  return DEPT_COLORS[dept] || DEPT_COLORS.default;
}

function formatDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isSameDay(dateStr, year, month, day) {
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

function isDateInRange(fromDate, toDate, year, month, day) {
  const target = new Date(year, month, day);
  target.setHours(0, 0, 0, 0);
  const from = new Date(fromDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toDate);
  to.setHours(0, 0, 0, 0);
  return target >= from && target <= to;
}

export default function LeaveCalendar() {
  const { user } = useAuth();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCalendar();
  }, [currentMonth, currentYear]);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/leaves/calendar/${currentYear}/${currentMonth + 1}`);
      setLeaves(res.data.leaves || []);
      setHolidays(res.data.holidays || []);
    } catch (err) {
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(null);
  };

  // Calendar grid computation
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarCells = [];

  // Leading days from previous month
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarCells.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isPrev: true });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push({ day: d, isCurrentMonth: true });
  }

  // Trailing days from next month
  const remaining = 42 - calendarCells.length;
  for (let d = 1; d <= remaining; d++) {
    calendarCells.push({ day: d, isCurrentMonth: false, isNext: true });
  }

  function getLeavesForDay(day) {
    return leaves.filter(l => isDateInRange(l.fromDate, l.toDate, currentYear, currentMonth, day));
  }

  function getHolidaysForDay(day) {
    return holidays.filter(h => isSameDay(h.date, currentYear, currentMonth, day));
  }

  function isToday(day) {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  }

  function isWeekend(cellIndex) {
    return cellIndex % 7 === 0 || cellIndex % 7 === 6;
  }

  const handleDayClick = (day, isCurrentMonth) => {
    if (!isCurrentMonth) return;
    setSelectedDay(selectedDay === day ? null : day);
  };

  const selectedLeaves = selectedDay ? getLeavesForDay(selectedDay) : [];
  const selectedHolidays = selectedDay ? getHolidaysForDay(selectedDay) : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h1>Leave Calendar</h1>
            <p>View team leaves and holidays at a glance</p>
          </div>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <CalendarDays size={100} className="text-white" />
        </div>
      </div>

      {/* Calendar Card */}
      <div className="card animate-slide-up">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={goToPrevMonth} className="btn-secondary p-2 rounded-xl">
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={goToToday}
              className="text-xs font-medium px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition"
            >
              Today
            </button>
          </div>
          <button onClick={goToNextMonth} className="btn-secondary p-2 rounded-xl">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS_OF_WEEK.map((d, i) => (
            <div
              key={d}
              className={`text-center text-xs font-semibold uppercase tracking-wider py-2 ${
                i === 0 || i === 6
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-7 border-t border-l border-slate-200 dark:border-slate-700">
            {calendarCells.map((cell, idx) => {
              const weekend = isWeekend(idx);
              const todayCell = cell.isCurrentMonth && isToday(cell.day);
              const dayLeaves = cell.isCurrentMonth ? getLeavesForDay(cell.day) : [];
              const dayHolidays = cell.isCurrentMonth ? getHolidaysForDay(cell.day) : [];
              const hasHoliday = dayHolidays.length > 0;
              const isSelected = cell.isCurrentMonth && selectedDay === cell.day;

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(cell.day, cell.isCurrentMonth)}
                  className={`
                    relative min-h-[90px] p-1.5 border-b border-r border-slate-200 dark:border-slate-700 transition-colors
                    ${cell.isCurrentMonth ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : 'cursor-default'}
                    ${!cell.isCurrentMonth ? 'bg-slate-50/50 dark:bg-slate-900/30' : ''}
                    ${cell.isCurrentMonth && weekend && !hasHoliday ? 'bg-slate-100/80 dark:bg-slate-800/40' : ''}
                    ${cell.isCurrentMonth && hasHoliday ? 'bg-rose-50 dark:bg-rose-900/20' : ''}
                    ${isSelected ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : ''}
                  `}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`
                        inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full
                        ${!cell.isCurrentMonth ? 'text-slate-300 dark:text-slate-600' : ''}
                        ${cell.isCurrentMonth && !todayCell ? 'text-slate-700 dark:text-slate-300' : ''}
                        ${todayCell ? 'bg-indigo-600 text-white ring-2 ring-indigo-300 dark:ring-indigo-500' : ''}
                      `}
                    >
                      {cell.day}
                    </span>
                    {hasHoliday && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title={dayHolidays[0].name} />
                    )}
                  </div>

                  {/* Holiday Name */}
                  {hasHoliday && (
                    <div className="mb-0.5">
                      <span className="text-[10px] leading-tight font-medium text-rose-600 dark:text-rose-400 line-clamp-1">
                        {dayHolidays[0].name}
                      </span>
                    </div>
                  )}

                  {/* Leave Dots */}
                  {cell.isCurrentMonth && dayLeaves.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {dayLeaves.slice(0, 4).map((leave, li) => (
                        <span
                          key={li}
                          className={`w-2 h-2 rounded-full ${getDeptColor(leave.department)} shrink-0`}
                          title={`${leave.employeeName} (${leave.department})`}
                        />
                      ))}
                      {dayLeaves.length > 4 && (
                        <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-none ml-0.5">
                          +{dayLeaves.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Detail Popup */}
      {selectedDay && (
        <div className="card animate-slide-up" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
              {isToday(selectedDay) && (
                <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  Today
                </span>
              )}
            </h3>
            <button onClick={() => setSelectedDay(null)} className="btn-secondary p-1.5 rounded-xl">
              <X size={16} />
            </button>
          </div>

          {/* Holidays for selected day */}
          {selectedHolidays.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Holidays
              </h4>
              <div className="space-y-2">
                {selectedHolidays.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800"
                  >
                    <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{h.name}</p>
                      <p className="text-xs text-rose-500 dark:text-rose-400 capitalize">{h.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leaves for selected day */}
          {selectedLeaves.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Employees on Leave ({selectedLeaves.length})
              </h4>
              <div className="space-y-2">
                {selectedLeaves.map((l, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                  >
                    <span className={`w-3 h-3 rounded-full ${getDeptColor(l.department)} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {l.employeeName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {l.department} &middot; {l.leaveType}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(l.fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {' - '}
                      {new Date(l.toDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            selectedHolidays.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No leaves or holidays on this day.</p>
            )
          )}
        </div>
      )}

      {/* Legend */}
      <div className="card animate-slide-up" style={{ animationDelay: '100ms' }}>
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Legend
        </h4>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Leave</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-3 rounded bg-slate-200 dark:bg-slate-700" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Weekend</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold ring-2 ring-indigo-300">
              {today.getDate()}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
}
