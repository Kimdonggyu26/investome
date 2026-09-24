package com.investome.api.config;

public record AuthenticatedUser(Long id, String email, String role) {
}
