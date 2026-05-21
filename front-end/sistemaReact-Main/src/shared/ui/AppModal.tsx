import { useEffect, useState, type ReactNode } from 'react';
import { MaterialIcon } from './MaterialIcon';


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
  zIndex = 150,
}: AppModalProps) => {
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

  const overlayAnim = closing || !isVisible ? 'opacity-0' : 'opacity-100';
  const panelAnim =
    closing || !isVisible ? 'scale-95 opacity-0' : 'scale-100 opacity-100';

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-300 ${overlayAnim}`}
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`app-modal-panel rounded-[2.5rem] border shadow-md w-full ${maxWidthClass[maxWidth]} mx-4 max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[var(--app-accent)] px-4 py-3 sm:px-6 sm:py-4 flex items-center gap-3 flex-shrink-0">
          {icon && (
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-[var(--app-accent-fg)] leading-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest mt-0.5 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0 touch-manipulation"
            aria-label="Cerrar"
          >
            <MaterialIcon icon="close" className="w-4 h-4 text-white" />
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
  );
};

export default AppModal;
