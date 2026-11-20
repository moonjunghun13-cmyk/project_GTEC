
package com.gtec.mall.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

// 기존 LoginSession의 기능을 대체
public final class JwtAuth {

    private JwtAuth() {
    }

    // 현재 로그인한 회원 ID 반환
    public static Long memberId() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (!isValidAuthentication(authentication)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "로그인이 필요합니다."
            );
        }

        try {
            return Long.parseLong(authentication.getName());

        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "로그인 정보를 확인할 수 없습니다."
            );
        }
    }

    // 로그인 여부 확인
    public static boolean isLoggedIn() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (!isValidAuthentication(authentication)) {
            return false;
        }

        try {
            Long.parseLong(authentication.getName());
            return true;

        } catch (NumberFormatException ex) {
            return false;
        }
    }

    // 관리자 여부 확인
    public static boolean isAdmin() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (!isValidAuthentication(authentication)) {
            return false;
        }

        return authentication.getAuthorities().stream()
                .anyMatch(authority ->
                        "ROLE_ADMIN".equals(authority.getAuthority())
                );
    }

    // 유효한 인증 정보인지 확인
    private static boolean isValidAuthentication(
            Authentication authentication
    ) {

        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }
}
