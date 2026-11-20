
package com.gtec.mall.member.controller;

import com.gtec.mall.member.domain.MemberRole;
import com.gtec.mall.member.dto.MemberResponse;
import com.gtec.mall.member.dto.MemberRoleUpdateRequest;
import com.gtec.mall.member.service.MemberService;
import com.gtec.mall.security.JwtAuth;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
public class AdminRestController {

    private final MemberService memberService;

    // 관리자 권한 확인
    private void requireAdmin() {
        if (!JwtAuth.isAdmin()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "관리자 권한이 필요합니다."
            );
        }
    }

    // 회원 목록 조회
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<MemberResponse> findAll() {
        requireAdmin();

        return memberService.findAll();
    }

    // loginId로 회원 조회
    @GetMapping("/login-id/{loginId}")
    @ResponseStatus(HttpStatus.OK)
    public MemberResponse findByLoginId(
            @PathVariable("loginId") String loginId
    ) {
        requireAdmin();

        return memberService.findByLoginId(loginId);
    }

    // 회원 활성화
    @PatchMapping("/{id}/activate")
    @ResponseStatus(HttpStatus.OK)
    public void activate(
            @PathVariable("id") Long id
    ) {
        requireAdmin();

        memberService.activate(id);
    }

    // 회원 비활성화
    @PatchMapping("/{id}/inactivate")
    @ResponseStatus(HttpStatus.OK)
    public void inActivate(
            @PathVariable("id") Long id
    ) {
        requireAdmin();

        MemberResponse target = memberService.findById(id);

        if (target.getRole() == MemberRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "관리자 계정은 정지시킬 수 없습니다."
            );
        }

        memberService.inActivate(id);
    }

    // 회원 강퇴
    @PatchMapping("/{id}/kick")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void kicked(
            @PathVariable("id") Long id
    ) {
        requireAdmin();

        MemberResponse target = memberService.findById(id);

        if (target.getRole() == MemberRole.ADMIN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "관리자 계정은 강퇴할 수 없습니다."
            );
        }

        memberService.kicked(id);
    }

    // 회원 권한 변경
    @PatchMapping("/{id}/role")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changeRole(
            @PathVariable("id") Long id,
            @Valid @RequestBody MemberRoleUpdateRequest request
    ) {
        requireAdmin();

        memberService.role(id, request);
    }
}
