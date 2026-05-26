import { useState, useEffect } from 'react';

import { MaterialIcon } from './MaterialIcon';

import ModalPortal from './ModalPortal';

import { useModalBodyScrollLock } from './useModalBodyScrollLock';



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

      case 'danger':  return <MaterialIcon icon="delete" className="w-6 h-6 text-red-500" fill />;

      case 'warning': return <MaterialIcon icon="warning" className="w-6 h-6 text-amber-500" fill />;

      case 'info':    return <MaterialIcon icon="info" className="w-6 h-6 text-blue-500" fill />;

    }

  };





  const modalTitle = title || (variant === 'danger' ? 'Confirmar eliminación' : 'Confirmar acción');



  return (

    <ModalPortal>

      <div

        className={`app-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center p-4 transition-opacity duration-300 ease-[var(--ease-google-decelerate)] ${

          isVisible ? 'opacity-100' : 'opacity-0'

        }`}

        onClick={onCancel}

      >

        <div

          className={`app-modal-panel rounded-[2.5rem] border border-[var(--app-border-strong)] shadow-2xl transform transition-all duration-400 ease-[var(--ease-google-emphasized)] overflow-hidden ${

            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'

          }`}

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

              onClick={onCancel}

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

      </div>

    </ModalPortal>

  );

};



export default ConfirmModal;

