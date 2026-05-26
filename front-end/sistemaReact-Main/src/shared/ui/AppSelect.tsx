import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MaterialIcon } from './MaterialIcon';

export interface AppSelectOption {
  value: string | number;
  label: string;
}

export interface AppSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Borde más marcado en modales DK. */
  surface?: 'muted' | 'default';
}

function normalizeValue(value: string | number): string {
  if (value === '' || value === null || value === undefined) return '';
  return String(value);
}

const AppSelect: React.FC<AppSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  label,
  disabled = false,
  className = '',
  id,
  surface = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const normalizedValue = normalizeValue(value);
  const selectedOption = options.find((opt) => String(opt.value) === normalizedValue);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClose]);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((open) => !open);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    handleClose();
  };

  const triggerBorder = surface === 'muted' ? 'border-2' : 'border';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label
          htmlFor={id}
          className="block text-[10px] font-bold app-text-faint uppercase tracking-widest mb-2"
        >
          {label}
        </label>
      )}

      <div className="relative">
        <button
          id={id}
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`app-select-trigger w-full py-4 pl-4 pr-12 rounded-xl text-sm font-bold text-left transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${triggerBorder} ${
            disabled ? '' : 'cursor-pointer'
          }`}
        >
          <span className={selectedOption ? 'text-[var(--app-text)]' : 'text-[var(--app-text-faint)]'}>
            {selectedOption?.label ?? placeholder}
          </span>
        </button>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
          <MaterialIcon
            icon="arrow_drop_down"
            className={`w-5 h-5 text-[var(--app-text-muted)] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </span>
      </div>

      {isOpen && !disabled && (
        <ul
          role="listbox"
          className="app-select-dropdown absolute left-0 right-0 top-full mt-1 w-full rounded-xl overflow-hidden shadow-lg max-h-[280px] overflow-y-auto animate-fadeIn"
          style={{ zIndex: 'var(--app-z-modal-nested)' }}
        >
          {options.length === 0 ? (
            <li className="px-4 py-3 text-sm app-text-muted">Sin opciones</li>
          ) : (
            options.map((option, index) => {
              const optionValue = String(option.value);
              const isSelected = optionValue === normalizedValue;
              return (
                <li key={optionValue} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => handleSelect(optionValue)}
                    className={`app-select-option w-full px-4 py-3.5 text-left text-sm font-bold transition-colors flex items-center justify-between gap-2 ${
                      isSelected ? 'app-select-option-selected' : ''
                    } ${index > 0 ? 'border-t border-[var(--app-border)]' : ''}`}
                  >
                    <span>{option.label}</span>
                    {isSelected && (
                      <MaterialIcon icon="done" fill className="w-5 h-5 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

export default AppSelect;
