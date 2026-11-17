package com.outpick.domain.member.exception;

import com.outpick.global.error.ErrorCode;
import org.springframework.http.HttpStatus;

public enum MemberErrorCode {

    EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.");

    private final ErrorCode errorCode;

    MemberErrorCode(HttpStatus status, String message) {
        this.errorCode = new ErrorCode(status, name(), message);
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }
}