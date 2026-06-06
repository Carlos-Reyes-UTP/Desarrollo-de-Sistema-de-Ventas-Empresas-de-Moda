package com.tienda.ropa.service;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;

import com.tienda.ropa.dto.PrediccionIARequestDTO;
import com.tienda.ropa.dto.PrediccionIAResponseDTO;
import com.tienda.ropa.dto.PrediccionLoteResponseDTO;

@Service
public class PrediccionIAService {

    private final WebClient webClient;

    public PrediccionIAService(@Value("${ai.prediction.base-url:http://localhost:8000}") String baseUrl) {
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public PrediccionIAResponseDTO predecirCantidadRecomendada(PrediccionIARequestDTO request) {
        try {
            PrediccionIAResponseDTO response = webClient.post()
                    .uri("/predecir")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(PrediccionIAResponseDTO.class)
                    .block(Duration.ofSeconds(20));

            if (response == null || response.getCantidadRecomendada() == null) {
                throw new IllegalStateException("El microservicio de IA no devolvió cantidad_recomendada");
            }

            return new PrediccionIAResponseDTO(response.getCantidadRecomendada());
        } catch (WebClientResponseException ex) {
            throw new IllegalStateException(
                    "Error del microservicio de IA: " + ex.getStatusCode().value() + " " + ex.getResponseBodyAsString(),
                    ex);
        }
    }

    public PrediccionLoteResponseDTO predecirLote(List<PrediccionIARequestDTO> requests) {
        try {
            PrediccionLoteResponseDTO response = webClient.post()
                    .uri("/predecir_lote")
                    .bodyValue(requests)
                    .retrieve()
                    .bodyToMono(PrediccionLoteResponseDTO.class)
                    .block(Duration.ofSeconds(30));

            if (response == null || response.getResultados() == null) {
                throw new IllegalStateException("El microservicio de IA no devolvió resultados");
            }

            return response;
        } catch (WebClientResponseException ex) {
            throw new IllegalStateException(
                    "Error del microservicio de IA: " + ex.getStatusCode().value() + " " + ex.getResponseBodyAsString(),
                    ex);
        }
    }
}