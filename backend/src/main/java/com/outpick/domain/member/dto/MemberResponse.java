package com.outpick.domain.member.dto;

import com.outpick.domain.member.entity.Member;
import com.outpick.domain.member.entity.MemberRole;

public record MemberResponse(Long id, String email, String nickname, MemberRole role) {
    public static MemberResponse from(Member member) {
        return new MemberResponse(member.getId(), member.getEmail(), member.getNickname(), member.getRole());
    }
}
