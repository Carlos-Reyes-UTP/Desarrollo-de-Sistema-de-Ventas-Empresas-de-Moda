import type { CSSProperties, ReactNode } from 'react';

export interface ModalMotionOverlayProps {
  overlayClass: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  scrimClassName?: string;
  withBlur?: boolean;
  style?: CSSProperties;
}

/**
 * Overlay de modal con capas separadas: blur estático + scrim animado (opacity).
 * Evita parpadeo al animar opacity sobre backdrop-filter.
 */
const ModalMotionOverlay = ({
  overlayClass,
  children,
  onClick,
  className = '',
  scrimClassName = 'bg-black/60',
  withBlur = true,
  style,
}: ModalMotionOverlayProps) => (
  <div
    className={`fixed inset-0 flex items-center justify-center p-4 ${className}`}
    style={style}
    onClick={onClick}
  >
    {withBlur && (
      <div
        className="modal-motion-backdrop-blur absolute inset-0 backdrop-blur-sm"
        aria-hidden
      />
    )}
    <div
      className={`modal-motion-backdrop-blur absolute inset-0 ${scrimClassName} ${overlayClass}`}
      aria-hidden
    />
    {children}
  </div>
);

export default ModalMotionOverlay;
