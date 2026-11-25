
package com.gtec.mall.member.controller;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.dto.*;
import com.gtec.mall.member.service.MemberService;
import com.gtec.mall.security.JwtAuth;
import com.gtec.mall.security.JwtProvider;
import com.gtec.mall.security.OAuthTicketService;
import com.gtec.mall.security.TokenService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/members")
public class MemberRestController {

    private final MemberService memberService;
    private final JwtProvider jwtProvider;
    private final TokenService tokenService;
    private final OAuthTicketService oauthTickets;

    // 로그인
    @PostMapping("/login")
    public TokenResponse login(
            @Valid @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        Member member = memberService.login(
                request.getLoginId(),
                request.getPassword()
        );

        return tokenService.issue(member, response);
    }

    // JWT 토큰 재발급
    @PostMapping("/refresh")
    public TokenResponse refresh(
            @CookieValue(
                    value = TokenService.REFRESH_COOKIE,
                    required = false
            ) String refreshToken,
            @RequestHeader(
                    value = "X-Requested-With",
                    required = false
            ) String requestedWith,
            HttpServletResponse response
    ) {
        requireAjaxHeader(requestedWith);

        return tokenService.refresh(refreshToken, response);
    }

    // 로그아웃
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @CookieValue(
                    value = TokenService.REFRESH_COOKIE,
                    required = false
            ) String refreshToken,
            @RequestHeader(
                    value = HttpHeaders.AUTHORIZATION,
                    required = false
            ) String authorization,
            @RequestHeader(
                    value = "X-Requested-With",
                    required = false
            ) String requestedWith,
            HttpServletResponse response
    ) {
        requireAjaxHeader(requestedWith);

        tokenService.logout(refreshToken, authorization, response);
    }

    // OAuth 인증 코드 교환
    @PostMapping("/social-exchange")
    public SocialExchangeResponse socialExchange(
            @Valid @RequestBody SocialExchangeRequest request,
            HttpServletResponse response
    ) {
        return oauthTickets.exchange(request.code(), response);
    }

    // 소셜 회원가입
    @PostMapping("/social-signup")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse socialSignup(
            @RequestHeader(
                    value = HttpHeaders.AUTHORIZATION,
                    required = false
            ) String authorization,
            @Valid @RequestBody SocialSignupRequest request,
            HttpServletResponse response
    ) {
        JwtProvider.SocialInfo info =
                jwtProvider.requireSocialSignupInfo(authorization);

        Member member = memberService.socialSignup(
                info.provider(),
                info.oauthId(),
                info.email(),
                request
        );

        return tokenService.issue(member, response);
    }

    // 회원가입
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse register(
            @Valid @RequestBody SignupRequest request
    ) {
        return memberService.register(request);
    }

    // 마이페이지
    @GetMapping("/me")
    public MemberResponse myPage() {
        Long memberId = JwtAuth.memberId();

        return memberService.findById(memberId);
    }

    // 회원 정보 수정
    @PutMapping("/me")
    public MemberResponse update(
            @Valid @RequestBody MemberUpdateRequest request
    ) {
        Long memberId = JwtAuth.memberId();

        return memberService.update(memberId, request);
    }

    // 회원 탈퇴
    @PostMapping("/inactive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void inActive(
            @CookieValue(
                    value = TokenService.REFRESH_COOKIE,
                    required = false
            ) String refreshToken,
            @RequestHeader(
                    value = HttpHeaders.AUTHORIZATION,
                    required = false
            ) String authorization,
            HttpServletResponse response
    ) {
        Long memberId = JwtAuth.memberId();

        memberService.inActive(memberId);

        tokenService.logout(refreshToken, authorization, response);
    }

    // 비밀번호 변경
    @PutMapping("/password")
    public void changePassword(
            @Valid @RequestBody PasswordChangeRequest request
    ) {
        Long memberId = JwtAuth.memberId();

        memberService.passwordChange(memberId, request);
    }

    // AJAX 요청 확인
    private void requireAjaxHeader(String value) {
        if (!"XMLHttpRequest".equals(value)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "요청 헤더를 확인해 주세요."
            );
        }
    }
}
