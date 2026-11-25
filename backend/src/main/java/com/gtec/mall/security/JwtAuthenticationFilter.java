
package com.gtec.mall.security;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.domain.MemberStatus;
import com.gtec.mall.member.repository.MemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtProvider jwtProvider;
    private final MemberRepository memberRepository;
    private final TokenService tokenService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain
    ) throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {

            String accessToken = header.substring(7);

            // Access Token 유효성 검증
            Long memberId = jwtProvider.getAccessMemberId(accessToken);

            if (memberId != null && !tokenService.isBlacklisted(accessToken)) {

                // DB에서 최신 회원 정보 조회
                Member member = memberRepository.findById(memberId)
                        .orElse(null);

                // 활성 회원이며 권한 정보가 존재하는 경우에만 인증
                if (member != null
                        && member.getStatus() == MemberStatus.ACTIVE
                        && member.getRole() != null) {

                    List<SimpleGrantedAuthority> authorities = List.of(
                            new SimpleGrantedAuthority(
                                    "ROLE_" + member.getRole().name()
                            )
                    );

                    // JwtAuth.memberId()에서 회원 ID를 가져올 수 있도록
                    // Authentication의 principal을 회원 ID 문자열로 설정
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    memberId.toString(),
                                    null,
                                    authorities
                            );

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(request)
                    );

                    SecurityContext context =
                            SecurityContextHolder.createEmptyContext();

                    context.setAuthentication(authentication);

                    SecurityContextHolder.setContext(context);
                }
            }
        }

        chain.doFilter(request, response);
    }
}
