import { useState, useEffect } from 'react';
import { MaterialIcon } from './MaterialIcon';

export interface AlertModalProps {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
  variant?: 'success' | 'error' | 'warning' | 'info';
}

const AlertModal = ({
  open,
  title,
  message,
  onClose,
  variant = 'info'
}: AlertModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      timeoutId = setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
    return () => { if (timeoutId) clearTimeout(timeoutId); };
  }, [open]);

  if (!open) return null;

  const getIcon = () => {
    switch (variant) {
      case 'success': return <MaterialIcon icon="check_circle" className="w-6 h-6 text-white" fill />;
      case 'error':   return <MaterialIcon icon="cancel" className="w-6 h-6 text-white" fill />;
      case 'warning': return <MaterialIcon icon="warning" className="w-6 h-6 text-white" fill />;
      case 'info':    return <MaterialIcon icon="info" className="w-6 h-6 text-white" fill />;
    }
  };


  const getDefaultTitle = () => {
    if (title) return title;
    switch (variant) {
      case 'success': return 'Operación exitosa';
      case 'error':   return 'Ha ocurrido un error';
      case 'warning': return 'Advertencia';
      case 'info':    return 'Información';
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
        className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-sm w-full max-w-sm transform transition-all duration-300 overflow-hidden ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header negro */}
        <div className="bg-black px-8 py-6 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
            {getIcon()}
          </div>
          <h3 className="text-[11px] font-bold tracking-[0.3em] text-white uppercase leading-tight">
            {getDefaultTitle()}
          </h3>
        </div>

        {/* Body */}
        <div className="px-8 py-7">
          <p className="text-sm text-gray-500 font-medium leading-relaxed">{message}</p>
        </div>

        {/* Action */}
        <div className="px-8 pb-8">
          <button
            onClick={onClose}
            className="w-full py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.3em] hover:bg-gray-800 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-[0.97]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
