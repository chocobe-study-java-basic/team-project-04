package com.outpick.domain.review.exception;

import com.outpick.global.error.ErrorCode;
import org.springframework.http.HttpStatus;

public enum ReviewErrorCode {
    REVIEW_NOT_FOUND(HttpStatus.NOT_FOUND, "후기를 찾을 수 없습니다."),
    REVIEW_FORBIDDEN(HttpStatus.FORBIDDEN, "본인의 후기만 변경할 수 있습니다."),
    REPORT_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 신고한 후기입니다."),
    REPORT_NOT_FOUND(HttpStatus.NOT_FOUND, "처리할 신고를 찾을 수 없습니다."),
    ADMIN_REQUIRED(HttpStatus.FORBIDDEN, "운영자 권한이 필요합니다."),
    INVALID_PHOTO(HttpStatus.BAD_REQUEST, "JPEG 또는 PNG 사진을 5MB 이내로 올려 주세요."),
    PHOTO_LIMIT(HttpStatus.CONFLICT, "후기에는 사진을 최대 3장까지 올릴 수 있습니다."),
    PHOTO_NOT_FOUND(HttpStatus.NOT_FOUND, "사진을 찾을 수 없습니다.");

    private final ErrorCode errorCode;
    ReviewErrorCode(HttpStatus status, String message) { errorCode = new ErrorCode(status, name(), message); }
    public ErrorCode getErrorCode() { return errorCode; }
}
