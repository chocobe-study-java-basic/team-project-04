package com.outpick.domain.member.security;

import java.io.Serializable;

public record MemberSessionPrincipal(Long memberId, long authVersion) implements Serializable {
    private static final long serialVersionUID = 1L;
}
