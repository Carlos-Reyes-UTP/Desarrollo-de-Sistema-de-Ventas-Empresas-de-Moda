import { useState, useEffect } from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';

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

const ConfirmModal = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}: ConfirmModalProps) => {
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
      case 'danger':  return <Trash2 className="w-6 h-6 text-white" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-white" />;
      case 'info':    return <Info className="w-6 h-6 text-white" />;
    }
  };

  const modalTitle = title || (variant === 'danger' ? 'Confirmar eliminación' : 'Confirmar acción');

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onCancel}
    >
      <div
        className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl transform transition-all duration-300 overflow-hidden ${
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
            {modalTitle}
          </h3>
        </div>

        {/* Body */}
        <div className="px-8 py-7">
          <p className="text-sm text-gray-500 font-medium leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-4 bg-[#f8f8f8] border border-gray-100 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 hover:bg-gray-100 transition-all"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 bg-black text-white rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-gray-800 transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-[0.97]"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
