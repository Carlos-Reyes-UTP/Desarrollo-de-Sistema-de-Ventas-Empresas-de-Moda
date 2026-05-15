import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

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
        className={`bg-white rounded-[2.5rem] shadow-md w-full ${maxWidthClass[maxWidth]} mx-4 max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 ${panelAnim}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-black px-8 py-6 flex items-center gap-4 flex-shrink-0">
          {icon && (
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-[11px] font-bold tracking-[0.3em] text-white uppercase leading-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-widest mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-all flex-shrink-0"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {belowHeader}

        <div className="p-6 overflow-y-auto flex-1 bg-white">{children}</div>

        {footer && (
          <div className="px-6 pb-6 pt-4 flex-shrink-0 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppModal;
