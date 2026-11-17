package com.outpick.domain.member.dto;

public record SignupResponse(
        Long id,
        String email,
        String nickname
) {
}