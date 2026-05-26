package com.tienda.ropa.controller;

import com.tienda.ropa.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @Autowired
    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Endpoint temporal para probar el envío de notificaciones en tiempo real desde postman/frontend.
     */
    @PostMapping("/test")
    public ResponseEntity<?> testNotification(@RequestBody Map<String, Object> payload) {
        notificationService.sendNotificationObject(payload);
        return ResponseEntity.ok(Map.of("success", true, "message", "Notificación enviada al WebSocket"));
    }
}
