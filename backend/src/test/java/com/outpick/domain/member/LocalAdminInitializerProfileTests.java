package com.outpick.domain.member;

import com.outpick.domain.member.config.LocalAdminInitializer;
import com.outpick.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class LocalAdminInitializerProfileTests {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withBean(MemberRepository.class, () -> mock(MemberRepository.class))
            .withBean(PasswordEncoder.class, () -> mock(PasswordEncoder.class))
            .withUserConfiguration(LocalAdminInitializer.class);

    @Test
    @DisplayName("prod만 활성화하면 운영자 초기화 컴포넌트를 등록하지 않는다")
    void excludesInitializerWithProd() {
        contextRunner.withInitializer(context -> context.getEnvironment().setActiveProfiles("prod"))
                .run(context -> assertThat(context).doesNotHaveBean(LocalAdminInitializer.class));
    }

    @Test
    @DisplayName("local과 prod를 함께 활성화해도 운영자 초기화 컴포넌트를 등록하지 않는다")
    void excludesInitializerWithLocalAndProd() {
        contextRunner.withInitializer(context -> context.getEnvironment().setActiveProfiles("local", "prod"))
                .run(context -> assertThat(context).doesNotHaveBean(LocalAdminInitializer.class));
    }
}
