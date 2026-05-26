import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface WebSocketMessage {
    type: string;
    message: string;
    [key: string]: unknown;
}

export function useWebSocket(topic: string = '/topic/notifications') {
    const [messages, setMessages] = useState<WebSocketMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const stompClientRef = useRef<Client | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        const client = new Client({
            // Endpoint del servidor backend
            webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
            connectHeaders: {
                Authorization: token ? `Bearer ${token}` : '',
            },
            debug: (str) => {
                console.log('[STOMP]:', str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        client.onConnect = () => {
            setIsConnected(true);
            
            // Suscribirse al tópico
            client.subscribe(topic, (message) => {
                if (message.body) {
                    try {
                        const parsedMessage = JSON.parse(message.body);
                        setMessages((prev) => [...prev, parsedMessage]);
                    } catch {
                        setMessages((prev) => [...prev, { type: 'TEXT', message: message.body }]);
                    }
                }
            });
        };

        client.onStompError = (frame) => {
            console.error('STOMP Broker error:', frame.headers['message']);
            console.error('Detalles:', frame.body);
        };

        client.onWebSocketClose = () => {
            setIsConnected(false);
        };

        // Activar la conexión
        client.activate();
        stompClientRef.current = client;

        // Cleanup al desmontar
        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
        };
    }, [topic]);

    const sendMessage = (destination: string, body: unknown) => {
        if (stompClientRef.current && isConnected) {
            stompClientRef.current.publish({
                destination,
                body: JSON.stringify(body),
            });
        } else {
            console.warn('Cannot send message, WebSocket is not connected');
        }
    };

    return { messages, isConnected, sendMessage };
}
