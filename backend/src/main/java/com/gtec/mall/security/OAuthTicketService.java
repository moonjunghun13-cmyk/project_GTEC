
package com.gtec.mall.security;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.domain.MemberStatus;
import com.gtec.mall.member.dto.SocialExchangeResponse;
import com.gtec.mall.member.repository.MemberRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OAuthTicketService {

    private static final String PREFIX = "auth:oauth-ticket:";
    private static final long TICKET_VALIDITY_SECONDS = 90;

    private static final String LOGIN_PREFIX = "LOGIN:";
    private static final String SIGNUP_PREFIX = "SIGNUP:";

    private final StringRedisTemplate redis;
    private final MemberRepository memberRepository;
    private final TokenService tokenService;

    // 소셜 로그인용 일회용 인증 코드 생성
    public String createLoginTicket(Long memberId) {

        if (memberId == null) {
            throw new IllegalArgumentException("회원 ID가 필요합니다.");
        }

        return store(LOGIN_PREFIX + memberId);
    }

    // 소셜 회원가입용 일회용 인증 코드 생성
    public String createSignupTicket(String signupToken) {

        if (signupToken == null || signupToken.isBlank()) {
            throw new IllegalArgumentException("소셜 가입 토큰이 필요합니다.");
        }

        return store(SIGNUP_PREFIX + signupToken);
    }

    // Redis에 인증 코드 저장
    private String store(String value) {

        String ticket = UUID.randomUUID().toString();

        redis.opsForValue().set(
                PREFIX + ticket,
                value,
                Duration.ofSeconds(TICKET_VALIDITY_SECONDS)
        );

        return ticket;
    }

    // 일회용 인증 코드 교환
    public SocialExchangeResponse exchange(
            String code,
            HttpServletResponse response
    ) {

        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "소셜 인증 코드가 필요합니다."
            );
        }

        // Redis에서 코드를 원자적으로 조회하고 삭제
        String value = redis.opsForValue()
                .getAndDelete(PREFIX + code);

        if (value == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "소셜 인증 코드가 만료되었거나 이미 사용되었습니다."
            );
        }

        // 소셜 로그인 처리
        if (value.startsWith(LOGIN_PREFIX)) {

            Long memberId;

            try {
                memberId = Long.valueOf(
                        value.substring(LOGIN_PREFIX.length())
                );
            } catch (NumberFormatException ex) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "잘못된 인증 코드입니다."
                );
            }

            Member member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.UNAUTHORIZED,
                            "회원을 찾을 수 없습니다."
                    ));

            if (member.getStatus() != MemberStatus.ACTIVE) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "비활성화된 계정입니다."
                );
            }

            return new SocialExchangeResponse(
                    "LOGIN",
                    tokenService.issue(member, response),
                    null
            );
        }

        // 소셜 회원가입 처리
        if (value.startsWith(SIGNUP_PREFIX)) {

            String signupToken = value.substring(SIGNUP_PREFIX.length());

            if (signupToken.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "잘못된 회원가입 인증 코드입니다."
                );
            }

            return new SocialExchangeResponse(
                    "SIGNUP",
                    null,
                    signupToken
            );
        }

        throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "잘못된 인증 코드입니다."
        );
    }
}
