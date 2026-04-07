# Propuesta Futura: Optimización y Monitoreo de Rendimiento del Backend

*Nota: Esta es una sugerencia tecnológica diseñada para cuando el sistema alcance un punto de alto tráfico. Está pensada para implementarse cuando haya demasiadas peticiones (Alta Demanda) de usuarios o comprobaciones de inventario.*

---

## 1. El Problema a Resolver en el Futuro
Cuando hay múltiples usuarios navegando el sistema y cajeros realizando ventas al mismo tiempo:
1. **Consultas Lentas:** MySQL recibe cientos de peticiones seguidas exigiendo el catálogo de productos o ventas.
2. **Falta de Métricas:** No existe una forma nativa de saber *cuánto* tardó una consulta en el backend (ej: si listar variantes tomó 50ms o 5 segundos).

## 2. La Solución Propuesta

### A. Implementar Caché en Memoria (Caffeine)
En lugar de ir a MySQL por cada petición de lectura, Spring Boot guardará el resultado del catálogo en la Memoria RAM del servidor.
**Impacto:** Los endpoints de "Leer Catálogo", "Leer Categorías" y "Leer Variantes" responderán en tiempos de alrededor de **1 a 5 milisegundos**.
**Mecánica Base:**
- Se instala la dependencia `caffeine` y `spring-boot-starter-cache`.
- A las áreas de lectura pesadas se les pone `@Cacheable("productos")`.
- Cuando se realiza una venta o modificación, un trigger `@CacheEvict(allEntries=true)` fuerza al backend a ir de nuevo a la base de datos solo la próxima vez (para no vender sin stock).

### B. Medición y Monitoreo (AOP + Actuator)
Si el programa "se siente lento", se necesita saber qué capa específica es la lenta. Implementar Interceptores AOP y la librería de métricas de Spring.
**Mecánica Base:**
- Dependencias `spring-boot-starter-aop` y `spring-boot-starter-actuator`.
- **AOP (Aspect-Oriented Programming):** Un archivo especial que intercepta automáticamente TODAS las peticiones sin alterar tu código original. Se añade un `@Around` a los Controladores que hace iniciar un cronómetro, ejecuta el proceso y luego detiene el cronómetro imprimiendo un log: `[PERFORMANCE] ProductoController.obtenerProductos tardó 45ms`.
- **Actuator:** Libera el endpoint reservado `http://localhost:8080/actuator/metrics/http.server.requests` para poder conectarle (en un futuro lejano) páneles estadísticos visuales como Grafana.

---

## 3. Ejemplo Práctico de Implementación (Código de referencia AOP)

Para medir tiempos sin tocar los Controllers manualmente:

```java
package com.tienda.ropa.config;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class PerformanceMonitorAspect {

    // Intercepta todos los métodos dentro de la carpeta /controller
    @Around("execution(* com.tienda.ropa.controller.*.*(..))")
    public Object profileEndpoint(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        
        Object result = joinPoint.proceed(); // Deja que la api corra normal
        
        long timeTaken = System.currentTimeMillis() - startTime;
        System.out.println("[PERFORMANCE] " + joinPoint.getSignature().toShortString() + " demoró: " + timeTaken + " ms");
        
        return result;
    }
}
```

*Guarda este archivo como referencia. Cuando sientas que necesitas dar ese "salto" de optimización, el plan de trabajo es agregar estas piezas.*
