package com.investome.api.user;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    public User signup(@RequestBody SignupRequest request) {
        return userService.signup(
                request.getEmail(),
                request.getPassword(),
                request.getNickname()
        );
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return userService.login(
                request.getEmail(),
                request.getPassword()
        );
    }
}