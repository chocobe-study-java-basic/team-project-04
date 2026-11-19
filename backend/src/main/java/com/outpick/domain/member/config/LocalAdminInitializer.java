package com.outpick.domain.member.config;

import com.outpick.domain.member.entity.Member;
import com.outpick.domain.member.entity.MemberRole;
import com.outpick.domain.member.repository.MemberRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@Profile("local & !prod")
public class LocalAdminInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalAdminInitializer.class);
    private static final String ADMIN_EMAIL = "admin@example.com";
    private static final String INITIAL_PASSWORD = "12341234";

    private final MemberRepository members;
    private final PasswordEncoder passwordEncoder;

    public LocalAdminInitializer(MemberRepository members, PasswordEncoder passwordEncoder) {
        this.members = members;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * 로컬 서버를 시작할 때 운영자가 없으면 개발용 운영자를 생성합니다.
     * 이미 사용 중인 이메일을 발견하면 기존 계정을 보존하고 충돌을 알립니다.
     */
    @Override
    public void run(ApplicationArguments args) {
        if (members.existsByRole(MemberRole.ADMIN) || emailInUse()) {
            return;
        }
        try {
            members.save(Member.createAdmin(ADMIN_EMAIL, "로컬 운영자", passwordEncoder.encode(INITIAL_PASSWORD)));
        } catch (DataIntegrityViolationException exception) {
            // 동시에 시작한 서버나 회원가입이 먼저 저장했다면 이메일 유일성 제약으로 중복 생성을 막습니다.
            if (!members.existsByRole(MemberRole.ADMIN) && !emailInUse()) {
                throw exception;
            }
        }
    }

    private boolean emailInUse() {
        if (!members.existsByEmail(ADMIN_EMAIL)) {
            return false;
        }
        log.warn("로컬 운영자 초기화를 건너뜁니다. {} 이메일이 이미 사용 중입니다.", ADMIN_EMAIL);
        return true;
    }
}
