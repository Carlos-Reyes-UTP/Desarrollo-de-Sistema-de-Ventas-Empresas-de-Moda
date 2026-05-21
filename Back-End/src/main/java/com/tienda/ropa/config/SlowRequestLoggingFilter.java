package com.tienda.ropa.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Registra peticiones API que superan el umbral (auditoría de rendimiento en dev/prod).
 */
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class SlowRequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(SlowRequestLoggingFilter.class);

    @Value("${app.performance.slow-request-ms:1000}")
    private long slowRequestMs;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long start = System.nanoTime();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long elapsedMs = (System.nanoTime() - start) / 1_000_000L;
            String uri = request.getRequestURI();
            if (elapsedMs >= slowRequestMs && uri.startsWith("/api/")) {
                log.warn("Slow API {} {} {}ms status={}",
                        request.getMethod(),
                        uri,
                        elapsedMs,
                        response.getStatus());
            }
        }
    }
}
