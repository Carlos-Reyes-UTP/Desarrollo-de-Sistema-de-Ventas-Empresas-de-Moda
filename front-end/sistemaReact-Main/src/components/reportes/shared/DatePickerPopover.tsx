import { useEffect, useRef, useState } from 'react';
import {
  DAYS_SHORT,
  MONTHS,
  formatDateShort,
  getDaysInMonth,
  getFirstDayOfMonth,
  isBefore,
  isSameDay,
  getTodayStr,
} from '@/utils/formatDate';

const slideStylesId = 'datepicker-slide-styles';
if (!document.getElementById(slideStylesId)) {
  const style = document.createElement('style');
  style.id = slideStylesId;
  style.textContent = `
    @keyframes dpSlideInLeft {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes dpSlideInRight {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-dp-slide-left {
      animation: dpSlideInLeft 180ms ease-out;
    }
    .animate-dp-slide-right {
      animation: dpSlideInRight 180ms ease-out;
    }
  `;
  document.head.appendChild(style);
}

interface DatePickerPopoverProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}

export const DatePickerPopover = ({ label, value, onChange, min, max }: DatePickerPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const todayStr = getTodayStr();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowMonthPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (slideDirection) {
      const timer = setTimeout(() => setSlideDirection(null), 200);
      return () => clearTimeout(timer);
    }
  }, [slideDirection]);

  const goPrev = () => {
    setSlideDirection('right');
    if (showMonthPicker) {
      setViewYear(viewYear - 1);
    } else {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear(viewYear - 1);
      } else {
        setViewMonth(viewMonth - 1);
      }
    }
  };

  const goNext = () => {
    setSlideDirection('left');
    if (showMonthPicker) {
      setViewYear(viewYear + 1);
    } else {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear(viewYear + 1);
      } else {
        setViewMonth(viewMonth + 1);
      }
    }
  };

  const handleMonthClick = (monthIdx: number) => {
    setViewMonth(monthIdx);
    setShowMonthPicker(false);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const handleDayClick = (day: number) => {
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const isDayDisabled = (day: number) => {
    if (!min && !max) return false;
    const monthStr = String(viewMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
    if (min && isBefore(dateStr, min)) return true;
    if (max && isBefore(max, dateStr)) return true;
    return false;
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return (
    <div className="relative" ref={pickerRef}>
      <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
        {label}
      </label>
      <div
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) setShowMonthPicker(false); }}
        className="w-full bg-app-input text-app-text rounded-xl py-3 px-4 text-sm font-bold border border-[var(--app-border)] flex items-center justify-between cursor-pointer select-none"
      >
        <span>{formatDateShort(value)}</span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-xl overflow-hidden animate-fadeIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)]">
            <button
              onClick={goPrev}
              className="p-1 rounded-lg hover:bg-app-hover-overlay text-app-text transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span
              key={viewYear + '-' + viewMonth + '-' + (showMonthPicker ? 'y' : 'ym')}
              className={`text-sm font-bold text-app-text select-none cursor-pointer hover:bg-app-hover-overlay rounded-lg px-2 py-1 transition-colors ${slideDirection ? `animate-dp-slide-${slideDirection}` : ''}`}
              onClick={() => setShowMonthPicker(!showMonthPicker)}
            >
              {showMonthPicker ? viewYear : `${MONTHS[viewMonth]} ${viewYear}`}
            </span>
            <button
              onClick={goNext}
              className="p-1 rounded-lg hover:bg-app-hover-overlay text-app-text transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div
            key={!showMonthPicker ? (viewYear + '-' + viewMonth + '-d') : undefined}
            className={!showMonthPicker && slideDirection ? `animate-dp-slide-${slideDirection}` : ''}
          >
            {showMonthPicker ? (
              <div className="grid grid-cols-3 gap-2 p-4">
                {MONTHS.map((monthName, idx) => (
                  <button
                    key={monthName}
                    onClick={() => handleMonthClick(idx)}
                    className={`text-center text-sm py-2 rounded-lg transition-colors font-medium ${
                      idx === viewMonth
                        ? 'bg-app-accent text-app-accent-fg'
                        : 'text-app-text hover:bg-app-hover-overlay'
                    }`}
                  >
                    {monthName.slice(0, 3)}
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3">
                <div className="grid grid-cols-7 mb-1">
                  {DAYS_SHORT.map((dayName) => (
                    <div
                      key={dayName}
                      className="text-center text-[10px] font-bold text-gray-400 uppercase py-1"
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {days.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`} />;
                    }

                    const monthStr = String(viewMonth + 1).padStart(2, '0');
                    const dayStr = String(day).padStart(2, '0');
                    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
                    const selected = isSameDay(dateStr, value);
                    const today = isSameDay(dateStr, todayStr);
                    const disabled = isDayDisabled(day);

                    return (
                      <button
                        key={dateStr}
                        onClick={() => !disabled && handleDayClick(day)}
                        disabled={disabled}
                        className={`text-center text-sm py-1.5 rounded-lg transition-colors font-medium ${
                          disabled
                            ? 'text-gray-300 cursor-not-allowed'
                            : selected
                              ? 'bg-app-accent text-app-accent-fg'
                              : today
                                ? 'text-app-text border border-[var(--app-border)]'
                                : 'text-app-text hover:bg-app-hover-overlay'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
