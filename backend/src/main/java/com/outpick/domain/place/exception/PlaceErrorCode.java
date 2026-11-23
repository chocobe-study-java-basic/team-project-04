package com.outpick.domain.place.exception;

import com.outpick.global.error.ErrorCode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum PlaceErrorCode {
    PLACE_NOT_FOUND(HttpStatus.NOT_FOUND, "장소를 찾을 수 없습니다."),
    PLACE_NOTICE_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 장소에서 공지를 찾을 수 없습니다."),
    PLACE_NOTICE_NOT_DRAFT(HttpStatus.CONFLICT, "초안 상태의 공지만 수정할 수 있습니다."),
    PLACE_NOTICE_INVALID_SOURCE(HttpStatus.BAD_REQUEST, "해당 장소에서 공지에 연결할 출처를 찾을 수 없습니다.");

    private final ErrorCode errorCode;

    PlaceErrorCode(HttpStatus status, String message) {
        errorCode = new ErrorCode(status, name(), message);
    }
}
