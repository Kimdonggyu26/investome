package com.investome.api.user;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.investome.api.exception.BadRequestException;
import com.investome.api.exception.InternalServerException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Component
public class TurnstileVerifier {

    private static final URI VERIFY_URI = URI.create(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify"
    );

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final String secretKey;

    public TurnstileVerifier(ObjectMapper objectMapper,
                             @Value("${turnstile.secret-key:}") String secretKey) {
        this.objectMapper = objectMapper;
        this.secretKey = secretKey == null ? "" : secretKey.trim();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public void verify(String token, String remoteIp) {
        if (secretKey.isBlank()) {
            if (token == null || token.isBlank()) {
                return;
            }
            throw new InternalServerException("보안 확인 서버 설정이 완료되지 않았습니다.");
        }
        if (token == null || token.isBlank()) {
            throw new BadRequestException("보안 확인을 완료해 주세요.");
        }

        try {
            String body = "secret=" + encode(secretKey)
                    + "&response=" + encode(token)
                    + (remoteIp == null || remoteIp.isBlank() ? "" : "&remoteip=" + encode(remoteIp));
            HttpRequest request = HttpRequest.newBuilder(VERIFY_URI)
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new BadRequestException("보안 확인에 실패했습니다. 다시 시도해 주세요.");
            }

            JsonNode result = objectMapper.readTree(response.body());
            if (!result.path("success").asBoolean(false)) {
                throw new BadRequestException("보안 확인에 실패했습니다. 다시 시도해 주세요.");
            }
        } catch (BadRequestException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BadRequestException("보안 확인 중 오류가 발생했습니다. 다시 시도해 주세요.");
        }
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
