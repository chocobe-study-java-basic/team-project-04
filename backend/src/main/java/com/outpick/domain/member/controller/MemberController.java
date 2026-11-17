package com.outpick.domain.member.controller;

import com.outpick.domain.member.dto.MemberResponse;
import com.outpick.domain.member.service.MemberService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/members")
public class MemberController {
    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping("/me")
    public MemberResponse me(Authentication authentication) {
        Long memberId = (Long) authentication.getPrincipal();
        return MemberResponse.from(memberService.findActiveMember(memberId));
    }
}
