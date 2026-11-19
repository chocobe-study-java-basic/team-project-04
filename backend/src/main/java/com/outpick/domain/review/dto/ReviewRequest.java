package com.outpick.domain.review.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewRequest(
        @NotBlank(message = "후기 내용을 입력해 주세요.")
        @Size(max = 2000, message = "후기는 2,000자 이내로 입력해 주세요.") String body) {}
