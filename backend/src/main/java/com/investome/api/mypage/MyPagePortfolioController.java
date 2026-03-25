package com.investome.api.mypage;

import com.investome.api.config.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mypage")
public class MyPagePortfolioController {

    private final MyPagePortfolioService service;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/portfolio")
    public MyPagePortfolioResponse getPortfolio(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization
    ) {
        return service.getByUserId(extractUserId(authorization));
    }

    @PutMapping("/portfolio")
    public MyPagePortfolioResponse savePortfolio(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody MyPagePortfolioRequest request
    ) {
        return service.save(extractUserId(authorization), request);
    }

    private Long extractUserId(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        try {
            String token = authorization.substring(7).trim();
            return jwtTokenProvider.getUserId(token);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
        }
    }
}
