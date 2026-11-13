package com.gtec.mall.member.controller;



import com.gtec.mall.config.LoginSession;
import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.dto.*;
import com.gtec.mall.member.service.MemberService;
import com.gtec.mall.security.JwtAuth;
import com.gtec.mall.security.JwtProvider;
import com.gtec.mall.security.OAuthTicketService;
import com.gtec.mall.security.TokenService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
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

    //로그인 여부 확인
//    private boolean isLogin(HttpSession session) {
//        return LoginSession.isLoggedIn(session);
//    }

    //로그인
    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        Member member = memberService.login(request.getLoginId(), request.getPassword());
        return tokenService.issue(member, response);
    }
//    @PostMapping("/login")
//    @ResponseStatus(HttpStatus.OK)
//    public MemberResponse login(@Valid @RequestBody LoginRequest request, HttpSession session) {
//        Member member = memberService.login(request.getLoginId(), request.getPassword());
//        LoginSession.login(session, member);
//        return MemberResponse.from(member);
//    }

    // 토큰 리프레쉬 HttpOnly 리프레시 쿠키를 사용하므로 브라우저 요청임을 나타내는 헤더를 요구합니다.
    @PostMapping("/refresh")
    public TokenResponse refresh(
            @CookieValue(value = TokenService.REFRESH_COOKIE, required = false) String refreshToken,
            @RequestHeader(value = "X-Requested-With", required = false) String requestedWith,
            HttpServletResponse response) {
        requireAjaxHeader(requestedWith);
        return tokenService.refresh(refreshToken, response);
    }

    //로그아웃
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @CookieValue(value = TokenService.REFRESH_COOKIE, required = false) String refreshToken,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestHeader(value = "X-Requested-With", required = false) String requestedWith,
            HttpServletResponse response) {
        requireAjaxHeader(requestedWith);
        tokenService.logout(refreshToken, authorization, response);
    }
//    @PostMapping("/logout")
//    @ResponseStatus(HttpStatus.OK)
//    public void logout(HttpSession session) {
//        if(!isLogin(session)) {
//            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
//        }
//        session.invalidate();
//    }

    // OAuth 성공 후 프론트가 한 번만 사용할 수 있는 인증 코드 교환
    @PostMapping("/social-exchange")
    public SocialExchangeResponse socialExchange(@Valid @RequestBody SocialExchangeRequest request,
                                                 HttpServletResponse response) {
        return oauthTickets.exchange(request.code(), response);
    }
    // 소셜 회원가입
    @PostMapping("/social-signup")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse socialSignup(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @Valid @RequestBody SocialSignupRequest request, HttpServletResponse response) {
        JwtProvider.SocialInfo info = jwtProvider.requireSocialSignupInfo(authorization);
        Member member = memberService.socialSignup(info.provider(), info.oauthId(), info.email(), request);
        return tokenService.issue(member, response);
    }

    //회원 가입
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public MemberResponse register(@Valid @RequestBody SignupRequest request) {
        return memberService.register(request);
    }

    //마이 페이지
    @GetMapping("/me")
    @ResponseStatus(HttpStatus.OK)
    public MemberResponse myPage(HttpSession session) {
//        if(!isLogin(session)) {
//            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
//        }
//        Member member = (Member) session.getAttribute("loginMember");
//        return memberService.findById(member.getId());
        return memberService.findById(JwtAuth.memberId());
    }

    //회원 정보 수정
    @PutMapping("/me")
    @ResponseStatus(HttpStatus.OK)
    public MemberResponse update(@Valid @RequestBody MemberUpdateRequest request, HttpSession session) {
//        if(!isLogin(session)) {
//            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
//        }
//        Member member = (Member) session.getAttribute("loginMember");
//        return memberService.update(member.getId(), request);
        return memberService.update(JwtAuth.memberId(), request);
    }

    //회원 탈퇴
    @PostMapping("/inactive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void inActive(@CookieValue(value = TokenService.REFRESH_COOKIE, required = false) String refreshToken,
                         @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authorization,
                         HttpServletResponse response) {
//        if(!isLogin(session)) {
//            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
//        }
//        Member member = (Member) session.getAttribute("loginMember");
//        memberService.inActive(member.getId());
//        session.invalidate();
        memberService.inActive(JwtAuth.memberId());
        tokenService.logout(refreshToken, authorization, response);

    }

    //비밀번호 변경
    @PutMapping("/password")
    @ResponseStatus(HttpStatus.OK)
    public void changePassword(@Valid @RequestBody PasswordChangeRequest request) {
//        if(!isLogin(session)) {
//            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
//        }
//        Member member = (Member) session.getAttribute("loginMember");
//        memberService.passwordChange(member.getId(), request);
        memberService.passwordChange(JwtAuth.memberId(), request);
    }

    private void requireAjaxHeader(String value) {
        if (!"XMLHttpRequest".equals(value)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "요청 헤더를 확인해 주세요.");
        }
    }
}
