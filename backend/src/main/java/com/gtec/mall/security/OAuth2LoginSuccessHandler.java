
package com.gtec.mall.security;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.domain.MemberStatus;
import com.gtec.mall.member.repository.MemberRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler implements AuthenticationSuccessHandler {

    private final MemberRepository memberRepository;
    private final JwtProvider jwtProvider;
    private final OAuthTicketService tickets;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        if (!(authentication instanceof OAuth2AuthenticationToken oauthToken)) {
            response.sendError(401, "OAuth2 인증 정보가 없습니다.");
            return;
        }

        String provider = oauthToken.getAuthorizedClientRegistrationId();
        OAuth2User user = oauthToken.getPrincipal();

        String oauthId;
        String email;
        String name;

        // Naver
        if ("naver".equals(provider)) {

            Map<?, ?> profile = asMap(user.getAttribute("response"));

            oauthId = asText(profile.get("id"));
            email = asText(profile.get("email"));

            name = firstNonblank(
                    asText(profile.get("name")),
                    asText(profile.get("nickname"))
            );

        }
        // Kakao
        else if ("kakao".equals(provider)) {

            oauthId = asText(user.getAttribute("id"));

            Map<?, ?> account = asMap(
                    user.getAttribute("kakao_account")
            );

            Map<?, ?> profile = asMap(
                    account.get("profile")
            );

            email = asText(account.get("email"));
            name = asText(profile.get("nickname"));

        }
        // Google
        else if ("google".equals(provider)) {

            oauthId = asText(user.getAttribute("sub"));
            email = asText(user.getAttribute("email"));
            name = asText(user.getAttribute("name"));

        }
        else {
            response.sendError(400, "지원하지 않는 소셜 제공자입니다.");
            return;
        }

        // 소셜 회원 식별자 검증
        if (oauthId == null || oauthId.isBlank()) {
            response.sendError(
                    401,
                    "소셜 회원 식별자를 확인하지 못했습니다."
            );
            return;
        }

        // OAuth2 인가코드 왕복용 임시 세션 제거
        HttpSession session = request.getSession(false);

        if (session != null) {
            session.invalidate();
        }

        // 기존 소셜 회원 확인
        Member member = memberRepository
                .findByOauthProviderAndOauthId(provider, oauthId)
                .orElse(null);

        if (member != null) {

            // 비활성 회원 로그인 차단
            if (member.getStatus() != MemberStatus.ACTIVE) {
                response.sendRedirect(
                        frontendUrl + "/login?error=inactive"
                );
                return;
            }

            // 기존 회원: 로그인 티켓 발급
            String ticket = tickets.createLoginTicket(member.getId());

            response.sendRedirect(
                    frontendUrl + "/oauth/callback?code=" + ticket
            );

            return;
        }

        // 신규 회원 이메일 확인
        if (email == null || email.isBlank()) {
            response.sendRedirect(
                    frontendUrl + "/login?error=email-required"
            );
            return;
        }

        // 신규 회원: 소셜 회원가입용 임시 JWT 발급
        String signupToken = jwtProvider.createSocialSignupToken(
                provider,
                oauthId,
                email,
                firstNonblank(name, "소셜회원")
        );

        // 회원가입 티켓 발급
        String ticket = tickets.createSignupTicket(signupToken);

        response.sendRedirect(
                frontendUrl + "/oauth/callback?code=" + ticket
        );
    }

    // Map 변환
    private static Map<?, ?> asMap(Object obj) {
        return obj instanceof Map<?, ?> map ? map : Map.of();
    }

    // String 변환
    private static String asText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    // 빈 문자열 대체
    private static String firstNonblank(
            String first,
            String fallback
    ) {
        return first != null && !first.isBlank()
                ? first
                : fallback;
    }
}
