package com.outpick.domain.member.service;

import com.outpick.domain.member.dto.SignupRequest;
import com.outpick.domain.member.dto.SignupResponse;
import com.outpick.domain.member.entity.Member;
import com.outpick.domain.member.exception.MemberErrorCode;
import com.outpick.domain.member.repository.MemberRepository;
import com.outpick.global.error.BusinessException;
import java.util.Locale;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    public MemberService(MemberRepository memberRepository, PasswordEncoder passwordEncoder) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public SignupResponse register(SignupRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);

        if (memberRepository.existsByEmail(email)) {
            throw new BusinessException(MemberErrorCode.EMAIL_ALREADY_EXISTS.getErrorCode());
        }

        String passwordHash = passwordEncoder.encode(request.password());
        Member member = memberRepository.save(
                new Member(email, request.nickname().trim(), passwordHash)
        );

        return new SignupResponse(member.getId(), member.getEmail(), member.getNickname());
    }
}