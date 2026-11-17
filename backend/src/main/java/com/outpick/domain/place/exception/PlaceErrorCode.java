package com.outpick.domain.place.exception;

import com.outpick.global.error.ErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum PlaceErrorCode {
    PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다.");

    private final ErrorCode errorCode;

    PlaceErrorCode(HttpStatus status, String message) {
        errorCode = new ErrorCode(status, name(), message);
    }
}
