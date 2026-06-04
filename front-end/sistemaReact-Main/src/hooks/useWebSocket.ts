import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { API_BASE_URL } from '../config/apiConfig';
import { logger } from '../utils/logger';

const MAX_MESSAGES = 200;

interface WebSocketMessage {
    type: string;
    message: string;
    [key: string]: unknown;
}

function appendCappedMessage(
    prev: WebSocketMessage[],
    parsedMessage: WebSocketMessage
): WebSocketMessage[] {
    const next = [...prev, parsedMessage];
    return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
}

export function useWebSocket(topic: string = '/topic/notifications') {
    const [messages, setMessages] = useState<WebSocketMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const stompClientRef = useRef<Client | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');

        const client = new Client({
            // Endpoint del servidor backend
            webSocketFactory: () => new SockJS(`${API_BASE_URL}/ws`),
            connectHeaders: {
                Authorization: token ? `Bearer ${token}` : '',
            },
            debug: (str) => {
                logger.debug('[STOMP]:', str);
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
                        const parsedMessage = JSON.parse(message.body) as WebSocketMessage;
                        setMessages((prev) => appendCappedMessage(prev, parsedMessage));
                    } catch {
                        setMessages((prev) =>
                            appendCappedMessage(prev, { type: 'TEXT', message: message.body })
                        );
                    }
                }
            });
        };

        client.onStompError = (frame) => {
            logger.error('STOMP Broker error:', frame.headers['message']);
            logger.error('Detalles:', frame.body);
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
            logger.warn('Cannot send message, WebSocket is not connected');
        }
    };

    return { messages, isConnected, sendMessage };
}
