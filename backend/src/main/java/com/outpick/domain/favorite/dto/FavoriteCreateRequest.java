package com.outpick.domain.favorite.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record FavoriteCreateRequest(
        @NotNull(message = "장소 ID를 입력해 주세요.")
        @Positive(message = "장소 ID는 1 이상이어야 합니다.") Long placeId
) {
}
