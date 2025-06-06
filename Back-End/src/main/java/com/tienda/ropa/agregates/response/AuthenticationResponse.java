package com.tienda.ropa.agregates.response;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

@JsonPropertyOrder({"username","message","jwt","status"})
public record AuthenticationResponse(
        String username,
        String message,
        String jwt,
        boolean status
) {
}
