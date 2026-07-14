import { useEffect, useRef, useState } from 'react';
import { MaterialIcon } from '@/shared/ui';
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

const slideStylesId = 'datepicker-m3-styles';
if (typeof document !== 'undefined') {
  let style = document.getElementById(slideStylesId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = slideStylesId;
    document.head.appendChild(style);
  }
  style.textContent = `
    @keyframes dpSlideInLeft {
      from { opacity: 0; transform: translateX(-12px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes dpSlideInRight {
      from { opacity: 0; transform: translateX(12px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .animate-dp-slide-left { animation: dpSlideInLeft var(--m3-duration-short4, 200ms) var(--m3-ease-standard, ease-out); }
    .animate-dp-slide-right { animation: dpSlideInRight var(--m3-duration-short4, 200ms) var(--m3-ease-standard, ease-out); }

    .dp-m3 {
      position: relative;
      min-width: min(11.5rem, 100%);
      max-width: 100%;
    }
    .dp-m3--compact {
      min-width: 0;
      width: auto;
    }
    .dp-m3--compact .dp-m3__field {
      width: auto;
      min-height: 40px;
      padding: 0 10px 0 12px;
      gap: 0.4rem;
      font-size: 13px;
      white-space: nowrap;
      justify-content: flex-start;
    }
    .dp-m3__label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--app-metric-label, #9ca3af);
      margin-bottom: 0.5rem;
    }
    .dp-m3__field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      min-height: 48px;
      padding: 0 14px 0 16px;
      border-radius: 12px;
      border: 1px solid var(--app-border);
      background: var(--app-input, var(--app-bg-muted));
      color: var(--app-text);
      font-size: 14px;
      font-weight: 650;
      cursor: pointer;
      user-select: none;
      transition: border-color 200ms var(--m3-ease-standard, ease),
        background 200ms var(--m3-ease-standard, ease),
        box-shadow 200ms var(--m3-ease-standard, ease);
    }
    .dp-m3__field:hover {
      border-color: color-mix(in srgb, var(--app-accent) 35%, var(--app-border));
    }
    .dp-m3__field--open {
      border-color: var(--app-accent);
      box-shadow: 0 0 0 1px var(--app-accent);
    }
    .dp-m3__panel {
      position: absolute;
      z-index: 80;
      top: calc(100% + 8px);
      left: 0;
      right: auto;
      box-sizing: border-box;
      width: min(20.5rem, calc(100vw - 1.5rem));
      max-width: min(20.5rem, calc(100vw - 1.5rem));
      min-width: 0;
      border-radius: 28px;
      border: 1px solid var(--app-border);
      background: var(--app-surface, var(--app-panel));
      box-shadow:
        0 1px 2px color-mix(in srgb, var(--app-text) 6%, transparent),
        0 8px 24px color-mix(in srgb, var(--app-text) 12%, transparent);
      overflow: hidden;
      padding: 12px 12px 16px;
    }
    .dp-m3__panel--end {
      left: auto;
      right: 0;
    }
    @media (max-width: 380px) {
      .dp-m3__panel {
        padding: 8px 8px 12px;
        border-radius: 20px;
      }
      .dp-m3__day {
        max-width: 36px;
        max-height: 36px;
        font-size: 13px;
      }
      .dp-m3__nav-btn {
        width: 36px;
        height: 36px;
      }
    }
    .dp-m3__nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      padding: 4px 4px 8px;
    }
    .dp-m3__nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      color: var(--app-text);
      transition: background 150ms var(--m3-ease-standard, ease);
    }
    .dp-m3__nav-btn:hover {
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .dp-m3__nav-btn:active {
      background: color-mix(in srgb, var(--app-text) 12%, transparent);
    }
    .dp-m3__title {
      flex: 1;
      text-align: center;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.01em;
      color: var(--app-heading, var(--app-text));
      border-radius: 999px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background 150ms var(--m3-ease-standard, ease);
    }
    .dp-m3__title:hover {
      background: color-mix(in srgb, var(--app-text) 6%, transparent);
    }
    .dp-m3__weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 2px;
      margin: 4px 4px 6px;
    }
    .dp-m3__weekday {
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 650;
      color: var(--app-metric-label, #9ca3af);
    }
    .dp-m3__days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px 2px;
      padding: 0 4px;
    }
    .dp-m3__day {
      width: 100%;
      aspect-ratio: 1;
      max-width: 44px;
      max-height: 44px;
      margin: 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 550;
      font-variant-numeric: tabular-nums;
      color: var(--app-text);
      transition: background 150ms var(--m3-ease-standard, ease), color 150ms ease;
    }
    .dp-m3__day:hover:not(:disabled):not(.dp-m3__day--selected) {
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .dp-m3__day--today:not(.dp-m3__day--selected) {
      box-shadow: inset 0 0 0 1px var(--app-accent);
      color: var(--app-accent);
      font-weight: 700;
    }
    .dp-m3__day--selected {
      background: var(--app-accent);
      color: var(--app-accent-fg, #fff);
      font-weight: 700;
    }
    .dp-m3__day--selected:hover {
      background: var(--app-accent);
    }
    .dp-m3__day:disabled {
      color: color-mix(in srgb, var(--app-text) 28%, transparent);
      cursor: not-allowed;
    }
    .dp-m3__months {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      padding: 8px 8px 4px;
    }
    .dp-m3__month {
      min-height: 44px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
      color: var(--app-text);
      transition: background 150ms var(--m3-ease-standard, ease);
    }
    .dp-m3__month:hover:not(.dp-m3__month--selected) {
      background: color-mix(in srgb, var(--app-text) 8%, transparent);
    }
    .dp-m3__month--selected {
      background: var(--app-accent);
      color: var(--app-accent-fg, #fff);
    }
  `;
}

interface DatePickerPopoverProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Campo compacto (sin label apilado) para toolbars / heroes. */
  compact?: boolean;
}

export const DatePickerPopover = ({
  label,
  value,
  onChange,
  min,
  max,
  compact = false,
}: DatePickerPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [panelAlign, setPanelAlign] = useState<'start' | 'end'>('start');
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
    if (!isOpen) return;

    const reposition = () => {
      const root = pickerRef.current;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const gutter = 12;
      const panelWidth = Math.min(328, window.innerWidth - gutter * 2);
      const wouldOverflowRight = rect.left + panelWidth > window.innerWidth - gutter;
      const wouldOverflowLeft = rect.right - panelWidth < gutter;
      if (wouldOverflowRight && !wouldOverflowLeft) {
        setPanelAlign('end');
      } else {
        setPanelAlign('start');
      }
    };

    reposition();
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [isOpen]);

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
    } else if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goNext = () => {
    setSlideDirection('left');
    if (showMonthPicker) {
      setViewYear(viewYear + 1);
    } else if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
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
    onChange(`${viewYear}-${monthStr}-${dayStr}`);
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
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <div className={`dp-m3 ${compact ? 'dp-m3--compact' : ''}`} ref={pickerRef}>
      {compact ? (
        <span className="sr-only">{label}</span>
      ) : (
        <label className="dp-m3__label">{label}</label>
      )}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setShowMonthPicker(false);
        }}
        className={`dp-m3__field ${isOpen ? 'dp-m3__field--open' : ''}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {compact ? (
          <MaterialIcon icon="calendar_month" className="w-4 h-4 opacity-55 shrink-0" />
        ) : null}
        <span>{formatDateShort(value)}</span>
        <MaterialIcon
          icon="expand_more"
          className={`w-5 h-5 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen ? (
        <div
          className={`dp-m3__panel ${panelAlign === 'end' ? 'dp-m3__panel--end' : ''}`}
          role="dialog"
          aria-label="Seleccionar fecha"
        >
          <div className="dp-m3__nav">
            <button type="button" onClick={goPrev} className="dp-m3__nav-btn" aria-label="Anterior">
              <MaterialIcon icon="chevron_left" className="w-5 h-5" />
            </button>
            <button
              type="button"
              key={`${viewYear}-${viewMonth}-${showMonthPicker ? 'y' : 'ym'}`}
              className={`dp-m3__title ${slideDirection ? `animate-dp-slide-${slideDirection}` : ''}`}
              onClick={() => setShowMonthPicker(!showMonthPicker)}
            >
              {showMonthPicker ? viewYear : `${MONTHS[viewMonth]} ${viewYear}`}
            </button>
            <button type="button" onClick={goNext} className="dp-m3__nav-btn" aria-label="Siguiente">
              <MaterialIcon icon="chevron_right" className="w-5 h-5" />
            </button>
          </div>

          <div
            key={!showMonthPicker ? `${viewYear}-${viewMonth}-d` : 'months'}
            className={!showMonthPicker && slideDirection ? `animate-dp-slide-${slideDirection}` : ''}
          >
            {showMonthPicker ? (
              <div className="dp-m3__months">
                {MONTHS.map((monthName, idx) => (
                  <button
                    key={monthName}
                    type="button"
                    onClick={() => handleMonthClick(idx)}
                    className={`dp-m3__month ${idx === viewMonth ? 'dp-m3__month--selected' : ''}`}
                  >
                    {monthName.slice(0, 3)}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="dp-m3__weekdays">
                  {DAYS_SHORT.map((dayName) => (
                    <div key={dayName} className="dp-m3__weekday">
                      {dayName}
                    </div>
                  ))}
                </div>
                <div className="dp-m3__days">
                  {days.map((day, idx) => {
                    if (day === null) return <div key={`empty-${idx}`} />;

                    const monthStr = String(viewMonth + 1).padStart(2, '0');
                    const dayStr = String(day).padStart(2, '0');
                    const dateStr = `${viewYear}-${monthStr}-${dayStr}`;
                    const selected = isSameDay(dateStr, value);
                    const today = isSameDay(dateStr, todayStr);
                    const disabled = isDayDisabled(day);

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => !disabled && handleDayClick(day)}
                        disabled={disabled}
                        className={[
                          'dp-m3__day',
                          selected ? 'dp-m3__day--selected' : '',
                          today ? 'dp-m3__day--today' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
