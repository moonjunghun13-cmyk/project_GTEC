package com.gtec.mall.security;

import org.springframework.stereotype.Component;

import com.gtec.mall.member.domain.Member;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtProvider {
    private final SecretKey key;
    private final long accessSeconds;
    private final long refreshSeconds;
    private final long signupSeconds;

    public JwtProvider(@Value("${jwt.secret}") String secret,
                       @Value("${jwt.access-token-validity:1800}") long accessSeconds,
                       @Value("${jwt.refresh-token-validity:1209600}") long refreshSeconds,
                       @Value("${jwt.social-signup-token-validity:300}") long signupSeconds) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 64) {
            throw new IllegalStateException("JWT_SECRET은 HS512용 최소 64바이트여야 합니다.");
        }
        if (accessSeconds <= 0 || refreshSeconds <= 0 || signupSeconds <= 0) {
            throw new IllegalStateException("JWT 만료 시간은 양수여야 합니다.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessSeconds = accessSeconds;
        this.refreshSeconds = refreshSeconds;
        this.signupSeconds = signupSeconds;
    }

    public long getAccessSeconds() { return accessSeconds; }
    public long getRefreshSeconds() { return refreshSeconds; }

    public String createAccessToken(Member member) {
        Date now = new Date();
        return Jwts.builder()
                .subject(member.getId().toString())
                .claim("type", "ACCESS")
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessSeconds * 1000))
                .id(UUID.randomUUID().toString())
                .signWith(key, Jwts.SIG.HS512).compact();
    }

    public String createRefreshToken(Member member) {
        Date now = new Date();
        return Jwts.builder()
                .subject(member.getId().toString())
                .claim("type", "REFRESH")
                .issuedAt(now)
                .expiration(new Date(now.getTime() + refreshSeconds * 1000))
                .id(UUID.randomUUID().toString())
                .signWith(key, Jwts.SIG.HS512).compact();
    }

    // 기존 소셜 최초 가입 방식(제공자+고유 ID 확인)을 유지합니다.
    public String createSocialSignupToken(String provider, String oauthId, String email, String name) {
        Date now = new Date();
        return Jwts.builder()
                .subject(oauthId)
                .claim("type", "SOCIAL_SIGNUP")
                .claim("provider", provider)
                .claim("email", email)
                .claim("name", name)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + signupSeconds * 1000))
                .id(UUID.randomUUID().toString())
                .signWith(key, Jwts.SIG.HS512).compact();
    }

    private Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
    }

    private Long memberIdFor(String token, String requiredType) {
        if (token == null || token.isBlank()) return null;
        try {
            Claims claims = parse(token);
            if (!requiredType.equals(claims.get("type", String.class))) return null;
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException ex) {
            return null;
        }
    }

    public Long getAccessMemberId(String token) { return memberIdFor(token, "ACCESS"); }
    public Long getRefreshMemberId(String token) { return memberIdFor(token, "REFRESH"); }

    public long getRemainingSeconds(String token) {
        try {
            long remaining = parse(token).getExpiration().toInstant().getEpochSecond()
                    - Instant.now().getEpochSecond();
            return Math.max(remaining, 0);
        } catch (JwtException | IllegalArgumentException ex) {
            return 0;
        }
    }

    public SocialInfo requireSocialSignupInfo(String bearer) {
        if (bearer == null || !bearer.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "소셜 가입 토큰이 필요합니다.");
        }
        try {
            Claims claims = parse(bearer.substring(7));
            if (!"SOCIAL_SIGNUP".equals(claims.get("type", String.class))) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "잘못된 토큰 종류입니다.");
            }
            return new SocialInfo(
                    claims.get("provider", String.class), claims.getSubject(),
                    claims.get("email", String.class));
        } catch (JwtException | IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "소셜 가입 토큰이 유효하지 않습니다.");
        }
    }

    public record SocialInfo(String provider, String oauthId, String email) {}


}
