import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

export interface AlertModalProps {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

const AlertModal: React.FC<AlertModalProps> = ({
  open,
  title,
  message,
  onClose,
  variant = 'info'
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
      case 'success':
        return <CheckCircle className="w-10 h-10 text-green-600" />;
      case 'error':
        return <XCircle className="w-10 h-10 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-10 h-10 text-yellow-600" />;
      case 'info':
        return <Info className="w-10 h-10 text-blue-600" />;
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-100';
      case 'error':
        return 'bg-red-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'info':
        return 'bg-blue-100';
    }
  };

  const getTitle = () => {
    if (title) return title;
    switch (variant) {
      case 'success':
        return '¡Éxito!';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Advertencia';
      case 'info':
        return 'Información';
    }
  };

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm m-4 relative border border-gray-200 transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className={`${getIconBg()} p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center`}>
            {getIcon()}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{getTitle()}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-lg bg-gray-900 hover:bg-gray-800 text-white font-medium transition-all duration-200 shadow-lg"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
