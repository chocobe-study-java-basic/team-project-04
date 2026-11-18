package com.outpick.domain.favorite.exception;

import com.outpick.global.error.ErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum FavoriteErrorCode {
    FAVORITE_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 관심 장소에 저장된 장소입니다.");

    private final ErrorCode errorCode;

    FavoriteErrorCode(HttpStatus status, String message) {
        errorCode = new ErrorCode(status, name(), message);
    }
}
