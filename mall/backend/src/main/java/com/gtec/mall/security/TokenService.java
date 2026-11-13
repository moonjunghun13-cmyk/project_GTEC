package com.gtec.mall.security;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.domain.MemberStatus;
import com.gtec.mall.member.dto.TokenResponse;
import com.gtec.mall.member.repository.MemberRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class TokenService {
    public static final String REFRESH_COOKIE = "REFRESH_TOKEN";
    private static final String REFRESH_PREFIX = "auth:refresh:";
    private static final String BLACKLIST_PREFIX = "auth:blocked:";

    private final JwtProvider jwtProvider;
    private final StringRedisTemplate redis;
    private final MemberRepository memberRepository;

    @Value("${app.cookie-secure:false}")
    private boolean cookieSecure;

    public TokenResponse issue(Member member, HttpServletResponse response) {
        String accessToken = jwtProvider.createAccessToken(member);
        String refreshToken = jwtProvider.createRefreshToken(member);
        redis.opsForValue().set(refreshKey(refreshToken), member.getId().toString(),
                Duration.ofSeconds(jwtProvider.getRefreshSeconds()));
        setRefreshCookie(refreshToken, response);
        return new TokenResponse(accessToken, "Bearer", jwtProvider.getAccessSeconds());
    }

    // 리프레시 토큰을 한 번만 사용하도록 getAndDelete로 소비합니다(회전 방식).
    public TokenResponse refresh(String refreshToken, HttpServletResponse response) {
        Long memberId = jwtProvider.getRefreshMemberId(refreshToken);
        if (memberId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "리프레시 토큰이 만료되었거나 유효하지 않습니다.");
        }
        String storedMemberId = redis.opsForValue().getAndDelete(refreshKey(refreshToken));
        if (!memberId.toString().equals(storedMemberId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이미 사용했거나 취소된 리프레시 토큰입니다.");
        }
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원이 없습니다."));
        if (member.getStatus() != MemberStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "이용할 수 없는 회원입니다.");
        }
        return issue(member, response);
    }

    // 현재 브라우저에서 사용 중인 Refresh Token + 전달된 Access Token을 무효화합니다.
    public void logout(String refreshToken, String authorization, HttpServletResponse response) {
        Long refreshMemberId = jwtProvider.getRefreshMemberId(refreshToken);
        if (refreshMemberId != null) {
            redis.delete(refreshKey(refreshToken));
        }
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String accessToken = authorization.substring(7);
            Long accessMemberId = jwtProvider.getAccessMemberId(accessToken);
            if (accessMemberId != null && (refreshMemberId == null || refreshMemberId.equals(accessMemberId))) {
                long ttl = jwtProvider.getRemainingSeconds(accessToken);
                if (ttl > 0) {
                    redis.opsForValue().set(BLACKLIST_PREFIX + sha256(accessToken), "1", Duration.ofSeconds(ttl));
                }
            }
        }
        clearRefreshCookie(response);
    }

    public boolean isBlacklisted(String accessToken) {
        return Boolean.TRUE.equals(redis.hasKey(BLACKLIST_PREFIX + sha256(accessToken)));
    }

    private static String refreshKey(String token) { return REFRESH_PREFIX + sha256(token); }

    private void setRefreshCookie(String token, HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, token)
                .httpOnly(true).secure(cookieSecure).sameSite("Lax")
                .path("/api/members").maxAge(Duration.ofSeconds(jwtProvider.getRefreshSeconds())).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true).secure(cookieSecure).sameSite("Lax")
                .path("/api/members").maxAge(Duration.ZERO).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private static String sha256(String raw) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", e);
        }
    }
}
