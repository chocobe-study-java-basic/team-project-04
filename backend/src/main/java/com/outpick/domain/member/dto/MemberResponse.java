package com.outpick.domain.member.dto;

import com.outpick.domain.member.entity.Member;

public record MemberResponse(Long id, String email, String nickname, String role) {
    public static MemberResponse from(Member member) {
        return new MemberResponse(member.getId(), member.getEmail(), member.getNickname(), member.getRole());
    }
}
