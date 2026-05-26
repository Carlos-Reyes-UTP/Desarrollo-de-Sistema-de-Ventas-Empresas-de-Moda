import { useState, useEffect } from 'react';
import { MaterialIcon } from './MaterialIcon';
import ModalPortal from './ModalPortal';
import { useModalBodyScrollLock } from './useModalBodyScrollLock';

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

  useModalBodyScrollLock(open);

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
      case 'success': return <MaterialIcon icon="check_circle" className="w-6 h-6 text-[var(--app-modal-header-fg)]" fill />;
      case 'error':   return <MaterialIcon icon="cancel" className="w-6 h-6 text-[var(--app-modal-header-fg)]" fill />;
      case 'warning': return <MaterialIcon icon="warning" className="w-6 h-6 text-[var(--app-modal-header-fg)]" fill />;
      case 'info':    return <MaterialIcon icon="info" className="w-6 h-6 text-[var(--app-modal-header-fg)]" fill />;
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
    <ModalPortal>
      <div
        className={`app-modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      >
        <div
          className={`app-modal-panel rounded-[2.5rem] border border-[var(--app-border-strong)] shadow-2xl w-full max-w-sm transform transition-all duration-300 overflow-hidden ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="app-modal-header px-8 py-6 flex items-center gap-4">
            <div className="app-modal-header-icon-wrap w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0">
              {getIcon()}
            </div>
            <h3 className="text-[11px] font-bold tracking-[0.3em] uppercase leading-tight">
              {getDefaultTitle()}
            </h3>
          </div>

          <div className="px-8 py-7">
            <p className="text-sm app-modal-body-muted font-medium leading-relaxed">{message}</p>
          </div>

          <div className="px-8 pb-8">
            <button
              onClick={onClose}
              className="w-full py-4 app-modal-btn-primary rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.3em] transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-[0.97]"
            >
              Aceptar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

export default AlertModal;
