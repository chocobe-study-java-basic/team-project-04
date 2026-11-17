package com.outpick.domain.member.repository;

import com.outpick.domain.member.entity.Member;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {

    boolean existsByEmail(String email);

    Optional<Member> findByEmail(String email);

    boolean existsByIdAndAuthVersionAndStatus(Long id, long authVersion, String status);
}
