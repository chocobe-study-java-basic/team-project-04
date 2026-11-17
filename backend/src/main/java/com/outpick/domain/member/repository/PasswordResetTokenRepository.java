package com.outpick.domain.member.repository;

import com.outpick.domain.member.entity.PasswordResetToken;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    long countByMemberIdAndCreatedAtAfter(Long memberId, LocalDateTime after);
}
