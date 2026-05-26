import React, { useState, useRef, useEffect } from 'react';
import { MaterialIcon } from './MaterialIcon';


export interface ComboBoxOption {
  value: string;
  label: string;
}

export interface ComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboBoxOption[];
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const ComboBox: React.FC<ComboBoxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  label,
  icon,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 150);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (isOpen) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    handleClose();
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold tracking-[0.15em] app-text-faint uppercase mb-3">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`app-input-surface w-full px-5 py-4 border border-[var(--app-border)] rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--app-ring)] transition-all text-left flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--app-bg-muted)]'
        }`}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="app-text-muted">{icon}</span>}
          <span className={selectedOption ? 'app-heading' : 'app-text-muted'}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <MaterialIcon icon="arrow_drop_down" className={`w-5 h-5 app-text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`app-panel absolute z-[200] mt-2 w-full rounded-xl shadow-2xl border overflow-hidden ${
            isClosing ? 'animate-fadeOut' : 'animate-fadeIn'
          }`}
          style={{ maxHeight: '280px' }}
        >
          <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full px-5 py-3.5 text-left text-sm font-medium transition-all flex items-center justify-between ${
                  option.value === value
                    ? 'app-btn-primary'
                    : 'app-heading hover:bg-[var(--app-bg-muted)]'
                } ${index === 0 ? '' : 'border-t border-[var(--app-border)]'}`}
              >
                <span>{option.label}</span>
                {option.value === value && <MaterialIcon icon="done" fill className="w-5 h-5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComboBox;
