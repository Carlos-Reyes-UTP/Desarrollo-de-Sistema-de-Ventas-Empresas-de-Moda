import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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
        <label className="block text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-3">
          {label}
        </label>
      )}
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full px-5 py-4 bg-[#f8f8f8] border-transparent rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all text-left flex items-center justify-between ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#f0f0f0]'
        }`}
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span className={selectedOption ? 'text-black' : 'text-gray-400'}>
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute z-[200] mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden ${
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
                    ? 'bg-black text-white'
                    : 'text-gray-900 hover:bg-gray-50'
                } ${index === 0 ? '' : 'border-t border-gray-50'}`}
              >
                <span>{option.label}</span>
                {option.value === value && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComboBox;
