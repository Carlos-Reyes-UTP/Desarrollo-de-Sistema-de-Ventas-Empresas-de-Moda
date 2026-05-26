import { useEffect, useState, type ReactNode } from 'react';
import { MaterialIcon } from './MaterialIcon';
import ModalPortal from './ModalPortal';
import { useModalBodyScrollLock } from './useModalBodyScrollLock';


export type AppModalMaxWidth = 'sm' | 'md' | 'lg' | '2xl';

export interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  belowHeader?: ReactNode;
  maxWidth?: AppModalMaxWidth;
  closing?: boolean;
  zIndex?: number;
}

const maxWidthClass: Record<AppModalMaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
};

const AppModal = ({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  belowHeader,
  maxWidth = 'md',
  closing = false,
  zIndex,
}: AppModalProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useModalBodyScrollLock(open);

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

  const overlayAnim = closing || !isVisible ? 'opacity-0' : 'opacity-100';
  const panelAnim =
    closing || !isVisible ? 'scale-95 opacity-0' : 'scale-100 opacity-100';

  return (
    <ModalPortal>
      <div
        className={`app-modal-overlay fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ease-[var(--ease-google-decelerate)] ${overlayAnim}`}
        style={zIndex !== undefined ? { zIndex } : undefined}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          className={`app-modal-panel rounded-[2.5rem] border border-[var(--app-border-strong)] shadow-2xl w-full ${maxWidthClass[maxWidth]} mx-4 max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-400 ease-[var(--ease-google-emphasized)] ${panelAnim}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-[var(--app-surface)] px-6 pt-6 pb-2 flex items-center gap-3 flex-shrink-0">
            {icon && (
              <div className="w-9 h-9 bg-[var(--app-bg-muted)] text-[var(--app-accent)] rounded-xl flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-[var(--app-text)] uppercase tracking-tight leading-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[var(--app-text-muted)] text-[10px] font-bold uppercase tracking-widest mt-1 line-clamp-1">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 bg-[var(--app-bg-muted)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-hover-overlay)] rounded-xl flex items-center justify-center transition-all flex-shrink-0 touch-manipulation"
              aria-label="Cerrar"
            >
              <MaterialIcon icon="close" className="w-4 h-4" />
            </button>
          </div>

          {belowHeader}

          <div className="p-6 overflow-y-auto flex-1 bg-[var(--app-surface)]">{children}</div>

          {footer && (
            <div className="px-6 pb-6 pt-4 flex-shrink-0 bg-[var(--app-surface)]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};

export default AppModal;
