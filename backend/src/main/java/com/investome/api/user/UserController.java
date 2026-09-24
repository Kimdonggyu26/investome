package com.investome.api.user;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class UserController {

    private final UserService userService;
    private final TurnstileVerifier turnstileVerifier;

    @PostMapping("/signup")
    public String signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest) {
        turnstileVerifier.verify(request.getTurnstileToken(), httpRequest.getRemoteAddr());
        userService.signup(
                request.getEmail(),
                request.getPassword(),
                request.getNickname()
        );
        return "회원가입 성공";
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        turnstileVerifier.verify(request.getTurnstileToken(), httpRequest.getRemoteAddr());
        return userService.login(
                request.getEmail(),
                request.getPassword()
        );
    }
}
