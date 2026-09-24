package com.investome.api.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SignupRequest {

    @NotBlank(message = "이메일을 입력해 주세요.")
    @Email(message = "올바른 이메일 형식을 입력해 주세요.")
    private String email;

    @NotBlank(message = "비밀번호를 입력해 주세요.")
    @Size(min = 8, message = "비밀번호는 8자 이상 입력해 주세요.")
    private String password;

    @NotBlank(message = "닉네임을 입력해 주세요.")
    @Size(min = 2, max = 100, message = "닉네임은 2자 이상 100자 이하로 입력해 주세요.")
    private String nickname;

    private String turnstileToken;
}
