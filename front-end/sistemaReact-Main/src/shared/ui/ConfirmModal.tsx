import { MaterialIcon } from './MaterialIcon';
import ModalPortal from './ModalPortal';
import ModalMotionOverlay from './ModalMotionOverlay';
import { useModalBodyScrollLock } from './useModalBodyScrollLock';
import { useModalMotion } from './useModalMotion';

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
  variant = 'danger',
}: ConfirmModalProps) => {
  const { overlayClass, panelClass, shouldRender, requestClose } = useModalMotion({ open });

  useModalBodyScrollLock(open);

  const handleCancel = () => {
    requestClose(onCancel);
  };

  if (!shouldRender) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <MaterialIcon icon="delete" className="w-6 h-6 text-red-500" fill />;
      case 'warning':
        return <MaterialIcon icon="warning" className="w-6 h-6 text-amber-500" fill />;
      case 'info':
        return <MaterialIcon icon="info" className="w-6 h-6 text-blue-500" fill />;
    }
  };

  const modalTitle = title || (variant === 'danger' ? 'Confirmar eliminación' : 'Confirmar acción');

  return (
    <ModalPortal>
      <ModalMotionOverlay
        overlayClass={overlayClass}
        onClick={handleCancel}
        className="app-modal-overlay"
        scrimClassName="bg-black/50"
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`relative z-10 app-modal-panel rounded-[2.5rem] border border-[var(--app-border-strong)] shadow-2xl transform overflow-hidden ${panelClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[var(--app-surface)] px-8 pt-8 pb-2 flex items-center gap-4">
            <div className="w-10 h-10 bg-[var(--app-bg-muted)] rounded-2xl flex items-center justify-center flex-shrink-0">
              {getIcon()}
            </div>
            <h3 className="text-base font-bold text-[var(--app-text)] uppercase tracking-tight leading-tight">
              {modalTitle}
            </h3>
          </div>

          <div className="px-8 py-7">
            <p className="text-sm app-modal-body-muted font-medium leading-relaxed">{message}</p>
          </div>

          <div className="px-8 pb-8 flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-4 app-modal-cancel rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] transition-all"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-4 app-btn-primary rounded-[1.5rem] text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-[0_8px_24px_rgba(0,0,0,0.15)] active:scale-[0.97]"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </ModalMotionOverlay>
    </ModalPortal>
  );
};

export default ConfirmModal;
