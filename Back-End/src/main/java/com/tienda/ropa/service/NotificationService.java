package com.tienda.ropa.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public NotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Enviar una notificación genérica a todos los clientes suscritos a /topic/notifications.
     */
    public void sendNotification(String message) {
        messagingTemplate.convertAndSend("/topic/notifications", message);
    }
    
    /**
     * Enviar un objeto como notificación. Spring Boot lo serializará a JSON automáticamente.
     */
    public void sendNotificationObject(Object payload) {
        messagingTemplate.convertAndSend("/topic/notifications", payload);
    }
}
