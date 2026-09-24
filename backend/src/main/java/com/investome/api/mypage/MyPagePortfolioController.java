package com.investome.api.mypage;

import com.investome.api.config.AuthenticatedUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mypage")
public class MyPagePortfolioController {

    private final MyPagePortfolioService service;
    @GetMapping("/portfolio")
    public MyPagePortfolioResponse getPortfolio(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.getByUserId(user.id());
    }

    @PutMapping("/portfolio")
    public MyPagePortfolioResponse savePortfolio(
            @AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody MyPagePortfolioRequest request
    ) {
        return service.save(user.id(), request);
    }
}
