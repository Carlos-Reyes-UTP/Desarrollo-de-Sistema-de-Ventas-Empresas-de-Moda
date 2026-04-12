import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      timeoutId = setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [open]);

  if (!open) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="w-8 h-8 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-yellow-600" />;
      case 'info':
        return <Info className="w-8 h-8 text-blue-600" />;
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'info':
        return 'bg-blue-100';
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-red-500/50';
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700 shadow-lg hover:shadow-yellow-500/50';
      case 'info':
        return 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/50';
    }
  };

  const modalTitle = title || (variant === 'danger' ? 'Confirmar eliminación' : 'Confirmar acción');

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onCancel}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm m-4 relative border border-gray-200 transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className={`${getIconBg()} p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
            {getIcon()}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{modalTitle}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors duration-200 w-full"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 w-full ${getConfirmButtonClass()}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
