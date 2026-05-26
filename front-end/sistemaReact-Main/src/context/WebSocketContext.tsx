import { createContext, useContext, type ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface WebSocketContextType {
    messages: unknown[];
    isConnected: boolean;
    sendMessage: (destination: string, body: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const webSocketData = useWebSocket('/topic/notifications');

    return (
        <WebSocketContext.Provider value={webSocketData}>
            {children}
        </WebSocketContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGlobalWebSocket() {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useGlobalWebSocket debe usarse dentro de un WebSocketProvider');
    }
    return context;
}
