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
    private final StringRedisTemplate redis;
    private final MemberRepository memberRepository;
    private final TokenService tokenService;

    // JWT를 URL로 전달하지 않고, 1회용 코드만 URL에 실어 보냅니다.
    public String createLoginTicket(Long memberId) {
        return store("LOGIN:" + memberId);
    }

    public String createSignupTicket(String signupToken) {
        return store("SIGNUP:" + signupToken);
    }

    private String store(String value) {
        String ticket = UUID.randomUUID().toString();
        redis.opsForValue().set(PREFIX + ticket, value, Duration.ofSeconds(90));
        return ticket;
    }

    public SocialExchangeResponse exchange(String code, HttpServletResponse response) {
        String value = redis.opsForValue().getAndDelete(PREFIX + code);
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "소셜 인증 코드가 만료되었거나 이미 사용되었습니다.");
        }
        if (value.startsWith("LOGIN:")) {
            Long memberId;
            try { memberId = Long.valueOf(value.substring("LOGIN:".length())); }
            catch (NumberFormatException ex) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "잘못된 인증 코드입니다.");
            }
            Member member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원을 찾을 수 없습니다."));
            if (member.getStatus() != MemberStatus.ACTIVE) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "비활성화된 계정입니다.");
            }
            return new SocialExchangeResponse("LOGIN", tokenService.issue(member, response), null);
        }
        if (value.startsWith("SIGNUP:")) {
            return new SocialExchangeResponse("SIGNUP", null, value.substring("SIGNUP:".length()));
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "잘못된 인증 코드입니다.");
    }
}
