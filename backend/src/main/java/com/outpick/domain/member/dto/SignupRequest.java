package com.outpick.domain.member.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignupRequest(
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Size(min = 8, max = 64, message = "비밀번호는 8~64자로 입력해 주세요.") String password,
        @NotBlank @Size(max = 50) String nickname
) {
}
