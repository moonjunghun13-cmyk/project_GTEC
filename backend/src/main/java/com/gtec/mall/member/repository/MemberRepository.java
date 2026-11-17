package com.gtec.mall.member.repository;

import com.gtec.mall.member.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {
    boolean existsByLoginId(String loginId);
    boolean existsByEmail(String email);
    Optional<Member> findByLoginId (String loginId);
    List<Member> findAllByOrderByIdDesc();
    Optional<Member> findByOauthProviderAndOauthId(
            String oauthProvider,
            String oauthId
    );
}
