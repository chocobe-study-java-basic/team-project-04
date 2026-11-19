package com.outpick.domain.review.exception;

import com.outpick.global.error.ErrorCode;
import org.springframework.http.HttpStatus;

public enum ReviewErrorCode {
    REVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "후기를 찾을 수 없습니다."),
    REVIEW_FORBIDDEN(HttpStatus.FORBIDDEN, "본인의 후기만 변경할 수 있습니다.");

    private final ErrorCode errorCode;
    ReviewErrorCode(HttpStatus status, String message) { errorCode = new ErrorCode(status, name(), message); }
    public ErrorCode getErrorCode() { return errorCode; }
}
