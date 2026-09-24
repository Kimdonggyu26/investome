package com.investome.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.investome.api.exception.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType("application/json;charset=UTF-8");
        String message = authException.getCause() == null
                ? "로그인이 필요합니다."
                : authException.getMessage();
        objectMapper.writeValue(response.getWriter(), ErrorResponse.of(
                HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", message, request.getRequestURI()
        ));
    }
}
