package com.outpick.domain.member.service;

import com.outpick.domain.member.dto.PasswordResetConfirmRequest;
import com.outpick.domain.member.entity.PasswordResetToken;
import com.outpick.domain.member.exception.MemberErrorCode;
import com.outpick.domain.member.repository.MemberRepository;
import com.outpick.domain.member.repository.PasswordResetTokenRepository;
import com.outpick.global.error.BusinessException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final MemberRepository members;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final int maxRequestsPerHour;

    public PasswordResetService(MemberRepository members, PasswordResetTokenRepository tokens,
                                PasswordEncoder passwordEncoder, Clock clock,
                                @Value("${app.password-reset.max-requests-per-hour:3}") int maxRequestsPerHour) {
        this.members = members;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.maxRequestsPerHour = maxRequestsPerHour;
    }

    @Transactional
    public Optional<ResetMail> request(String rawEmail) {
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        var member = members.findByEmailForUpdate(email).orElse(null);
        if (member == null || !"ACTIVE".equals(member.getStatus())) {
            return Optional.empty();
        }
        LocalDateTime now = LocalDateTime.now(clock);
        if (tokens.countByMemberIdAndCreatedAtAfter(member.getId(), now.minusHours(1)) >= maxRequestsPerHour) {
            return Optional.empty();
        }
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.save(new PasswordResetToken(member, hash(rawToken), now));
        return Optional.of(new ResetMail(member.getEmail(), rawToken));
    }

    @Transactional
    public boolean isValid(String rawToken) {
        if (!hasValidFormat(rawToken)) {
            return false;
        }
        return tokens.findByTokenHash(hash(rawToken))
                .filter(token -> token.isUsableAt(LocalDateTime.now(clock)))
                .filter(token -> "ACTIVE".equals(token.getMember().getStatus()))
                .isPresent();
    }

    @Transactional
    public void confirm(PasswordResetConfirmRequest request) {
        if (!hasValidFormat(request.token())) {
            throw invalidLink();
        }
        var token = tokens.findByTokenHash(hash(request.token()))
                .orElseThrow(this::invalidLink);
        LocalDateTime now = LocalDateTime.now(clock);
        if (!token.isUsableAt(now) || !"ACTIVE".equals(token.getMember().getStatus())) {
            throw invalidLink();
        }
        if (!request.newPassword().equals(request.newPasswordConfirmation())) {
            throw new BusinessException(MemberErrorCode.PASSWORD_CONFIRMATION_MISMATCH.getErrorCode());
        }
        token.getMember().changePassword(passwordEncoder.encode(request.newPassword()));
        token.markUsed(now);
    }

    private BusinessException invalidLink() {
        return new BusinessException(MemberErrorCode.RESET_LINK_INVALID.getErrorCode());
    }

    private static boolean hasValidFormat(String token) {
        return token != null && token.matches("[A-Za-z0-9_-]{43}");
    }

    private static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 is not available", error);
        }
    }

    public record ResetMail(String email, String token) {
    }
}
