import { AlertCircle, X } from 'lucide-react';

interface NotificationToastProps {
  title: string;
  message: string;
  variant: 'error' | 'info';
  onClose: () => void;
  topClassName: string;
}

const STYLES = {
  error: {
    container:
      'bg-red-50 bg-opacity-95 border border-red-200 text-red-800',
    iconContainer: 'bg-red-100',
    icon: 'text-red-600',
    title: 'text-red-900',
    message: 'text-red-700',
    close:
      'text-red-400 hover:text-red-600 hover:bg-red-100',
  },
  info: {
    container:
      'bg-blue-50 bg-opacity-95 border border-blue-200 text-blue-800',
    iconContainer: 'bg-blue-100',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    message: 'text-blue-700',
    close:
      'text-blue-400 hover:text-blue-600 hover:bg-blue-100',
  },
} as const;

export const NotificationToast = ({
  title,
  message,
  variant,
  onClose,
  topClassName,
}: NotificationToastProps) => {
  const style = STYLES[variant];

  return (
    <div
      className={`fixed right-4 z-[100] mb-4 p-4 backdrop-blur-sm text-sm shadow-xl rounded-xl w-auto max-w-md animate-fadeIn ${topClassName} ${style.container}`}
    >
      <div className="flex items-start">
        <div className={`p-1 rounded-lg mr-3 flex-shrink-0 ${style.iconContainer}`}>
          <AlertCircle className={`h-4 w-4 ${style.icon}`} />
        </div>
        <div className="flex-grow">
          <h4 className={`font-medium mb-1 ${style.title}`}>{title}</h4>
          <span className={style.message}>{message}</span>
        </div>
        <button
          onClick={onClose}
          className={`ml-2 flex-shrink-0 p-1 rounded-lg transition-colors ${style.close}`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

