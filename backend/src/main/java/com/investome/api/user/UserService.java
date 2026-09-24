package com.investome.api.user;

import com.investome.api.config.JwtTokenProvider;
import com.investome.api.exception.AuthenticationFailedException;
import com.investome.api.exception.ConflictException;
import com.investome.api.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    public User signup(String email, String password, String nickname) {

        userRepository.findByEmail(email).ifPresent(user -> {
            throw new ConflictException("이미 존재하는 이메일입니다.");
        });

        userRepository.findByNickname(nickname).ifPresent(user -> {
            throw new ConflictException("이미 존재하는 닉네임입니다.");
        });

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname);

        return userRepository.save(user);
    }

    public LoginResponse login(String email, String password) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("이메일이 존재하지 않습니다."));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new AuthenticationFailedException("비밀번호가 틀렸습니다.");
        }

        String accessToken = jwtTokenProvider.createToken(
                user.getId(),
                user.getEmail(),
                user.getRole()
        );

        return new LoginResponse(
                accessToken,
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                user.getRole()
        );
    }
}
