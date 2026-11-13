package com.gtec.mall.config;


import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.domain.MemberRole;
import com.gtec.mall.member.domain.MemberStatus;
import com.gtec.mall.member.repository.MemberRepository;
import com.gtec.mall.security.JwtAuthenticationFilter;
import com.gtec.mall.security.JwtProvider;
import com.gtec.mall.security.OAuth2LoginSuccessHandler;
import com.gtec.mall.security.TokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity//메소드 단위의 권한 검사를 사용할 수 있게 함
public class SpringSecurity {

    private final PasswordEncoder passwordEncoder;
    private final MemberRepository memberRepository;
    private final JwtProvider jwtProvider;
    private final TokenService tokenService;
    private final OAuth2LoginSuccessHandler oauthSuccessHandler;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${ADMIN_INITIAL_PASSWORD:}")
    private String initialAdminPassword;

    public SpringSecurity(PasswordEncoder passwordEncoder, MemberRepository memberRepository,
                          JwtProvider jwtProvider, TokenService tokenService, OAuth2LoginSuccessHandler oauthSuccessHandler) {
        this.passwordEncoder = passwordEncoder;
        this.memberRepository = memberRepository;
        this.jwtProvider = jwtProvider;
        this.tokenService = tokenService;
        this.oauthSuccessHandler = oauthSuccessHandler;
    }


    @Bean
    CommandLineRunner initAdmin() {
        return args -> {
            if (!memberRepository.existsByLoginId("admin")) {
                memberRepository.save(Member.builder()
                        .loginId("admin")
                        .password(passwordEncoder.encode("1111"))
                        .name("관리자")
                        .tel("010-xxxx-xxxx")
                        .email("admin@example.com")
                        .role(MemberRole.ADMIN)
                        .status(MemberStatus.ACTIVE)
                        .termsAgreed(true)
                        .privacyAgreed(true)
                        .build());
            }
        };
    }

    // 일반 로그인 기능
    @Bean
    @Order(1)
    SecurityFilterChain apiSecurity(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/api/**")
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) -> {
                            res.setStatus(401);
                            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            res.setCharacterEncoding("UTF-8");
                            res.getWriter().write("{\"message\":\"로그인이 필요합니다.\"}");
                        })
                        .accessDeniedHandler((req, res, e) -> {
                            res.setStatus(403);
                            res.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            res.setCharacterEncoding("UTF-8");
                            res.getWriter().write("{\"message\":\"접근 권한이 없습니다.\"}");
                        }))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/members/login", "/api/members/signup",
                                "/api/members/social-signup", "/api/members/social-exchange",
                                "/api/members/refresh", "/api/members/logout").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products/**", "/api/faqs/**", "/api/notices/**")
                        .permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/products/**", "/api/faqs/**", "/api/notices/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .addFilterBefore(new JwtAuthenticationFilter(jwtProvider, memberRepository, tokenService),
                        UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    // Spring OAuth2 Client의 인가코드/state 왕복에는 임시 세션이 필요할 수 있습니다.
    // 이 세션을 애플리케이션 로그인 세션으로 사용하지는 않습니다.
    @Bean
    @Order(2)
    SecurityFilterChain oauthSecurity(HttpSecurity http) throws Exception {
        return http
                .securityMatcher("/oauth2/**", "/login/oauth2/**")
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .oauth2Login(oauth -> oauth
                        .successHandler(oauthSuccessHandler)
                        .failureHandler((request, response, error) ->
                                response.sendRedirect(frontendUrl + "/login?error=oauth-failed")))
                .build();
    }

    // Swagger, 정적 리소스 등 기존 기타 화면 경로의 동작은 유지합니다.
    @Bean
    @Order(3)
    SecurityFilterChain otherSecurity(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(frontendUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-Requested-With"));
        config.setAllowCredentials(true); // HttpOnly Refresh 쿠키를 Vue에서 전송
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }


//    @Bean
//    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
//        http
//                // SPA: XSRF-TOKEN 쿠키 발급 및 X-XSRF-TOKEN 헤더 검증
//                .csrf(csrf -> csrf.disable())
//
//                //인가 방법
//                .authorizeHttpRequests(auth -> auth
//                        //모든 사용자에 대한 접근 => permitAll()
//                        .requestMatchers("/", "/login", "/members/register", "/css/**", "/js/**", "/error", "/favicon.ico")
//                        .permitAll()
//                        //최고 관리자(ADMIN)에 대한 접근 => hasRole("ADMIN")
//                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
//                        //회원에 대한 접근 => hasRole("USER"): anyRequest().permitAll()
//                        .requestMatchers("/boards/new", "/boards/edit/*", "/boards/delete/*").authenticated()
//                        .anyRequest().permitAll()
//                )
//                .oauth2Login(oauth2 -> oauth2
//                        .loginPage("/login")
//                )
//                //로그인 방법
//                .formLogin(form -> form
//                        .loginPage("/login")//매핑 방식이 다른 것 -> get, post가 다르듯이
//                        .loginProcessingUrl("/login")
//                        .defaultSuccessUrl("/")//로그인 성공하면 홈페이지로 보내기
//                        .failureUrl("/login?error=true")//로그인 실패했을 때 다시 로그인 띄우기. 근데 eroor도 띄워야 함.
//                        .permitAll()
//                )
//                //로그아웃 방법
//                .logout(logout -> logout
//                        .logoutUrl("/logout")
//                        .logoutSuccessUrl("/")
//                        .invalidateHttpSession(true)//로그아웃할 때 기존 세션 무효화
//                        .deleteCookies("JSESSIONID")//로그아웃할 때 JSESSIONID 쿠키 삭제
//                )
//                //예외 페이지(403 페이지)
//                .exceptionHandling(ex -> ex
//                        .accessDeniedHandler((request, response, exception) -> {
//                            response.setStatus(403);
//                            response.setContentType("application/json;charset=UTF-8");
//                            response.getWriter().write("{\"message\":\"요청이 거부되었습니다. 새로고침 후 다시 시도해 주세요.\"}");
//                        }));
//        return http.build();
//    }


}
