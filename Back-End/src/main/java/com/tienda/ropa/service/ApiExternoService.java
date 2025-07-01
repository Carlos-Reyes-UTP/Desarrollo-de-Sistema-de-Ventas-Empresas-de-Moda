package com.tienda.ropa.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import com.tienda.ropa.dto.ReniecResponseDTO;
import com.tienda.ropa.dto.SunatResponseDTO;
import com.tienda.ropa.entity.Cliente;

import reactor.core.publisher.Mono;

@Service
public class ApiExternoService {

    private final WebClient webClient;
    private final String token;

    public ApiExternoService(@Value("${apis.token:apis-token-16600.G5yI4kJzZjqHK4n7b21P39R5M8Oi8VFK}") String token) {
        this.token = token;
        this.webClient = WebClient.builder()
                .baseUrl("https://api.apis.net.pe")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Consulta información de un DNI en RENIEC
     */
    public Mono<ReniecResponseDTO> consultarDni(String dni) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/reniec/dni")
                        .queryParam("numero", dni)
                        .build())
                .header("Authorization", token)
                .retrieve()
                .bodyToMono(ReniecResponseDTO.class)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    if (ex.getStatusCode() == HttpStatus.NOT_FOUND) {
                        return Mono.empty();
                    }
                    return Mono.error(ex);
                });
    }

    /**
     * Consulta información de un RUC en SUNAT
     */
    public Mono<SunatResponseDTO> consultarRuc(String ruc) {
        return webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/v2/sunat/ruc")
                        .queryParam("numero", ruc)
                        .build())
                .header("Authorization", token)
                .retrieve()
                .bodyToMono(SunatResponseDTO.class)
                .onErrorResume(WebClientResponseException.class, ex -> {
                    if (ex.getStatusCode() == HttpStatus.NOT_FOUND) {
                        return Mono.empty();
                    }
                    return Mono.error(ex);
                });
    }

    /**
     * Crea un cliente a partir de los datos de RENIEC
     */
    public Cliente crearClienteDesdeReniec(ReniecResponseDTO reniecResponse) {
        Cliente cliente = new Cliente();
        cliente.setNumeroDocumento(reniecResponse.getNumeroDocumento());
        // Formatear nombre completo
        cliente.setNombreCliente(reniecResponse.getNombreCompleto());
        // Por defecto, asumimos que es un cliente normal
        cliente.setTipoCliente("NORMAL");
        return cliente;
    }

    /**
     * Crea un cliente a partir de los datos de SUNAT
     */
    public Cliente crearClienteDesdeSunat(SunatResponseDTO sunatResponse) {
        Cliente cliente = new Cliente();
        cliente.setNumeroDocumento(sunatResponse.getNumeroDocumento());
        cliente.setNombreCliente(sunatResponse.getRazonSocial());
        // Por defecto, asumimos que es un cliente empresa
        cliente.setTipoCliente("EMPRESA");
        return cliente;
    }
}
