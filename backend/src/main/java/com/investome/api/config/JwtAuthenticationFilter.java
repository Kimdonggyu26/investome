package com.investome.api.config;

import com.investome.api.exception.AuthenticationFailedException;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (authorization == null || authorization.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            if (!authorization.startsWith("Bearer ")) {
                throw new AuthenticationFailedException("인증 토큰 형식이 올바르지 않습니다.");
            }

            Claims claims = jwtTokenProvider.parseClaims(authorization.substring(7).trim());
            Long userId = Long.parseLong(claims.getSubject());
            String email = claims.get("email", String.class);
            String role = claims.get("role", String.class);
            String authority = role == null || role.isBlank() ? "ROLE_USER" : "ROLE_" + role;
            AuthenticatedUser principal = new AuthenticatedUser(userId, email, role);
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    principal, null, List.of(new SimpleGrantedAuthority(authority))
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (Exception exception) {
            SecurityContextHolder.clearContext();
            authenticationEntryPoint.commence(request, response,
                    new org.springframework.security.core.AuthenticationException(
                            "유효하지 않거나 만료된 토큰입니다.", exception) {});
            return;
        }

        filterChain.doFilter(request, response);
    }
}
