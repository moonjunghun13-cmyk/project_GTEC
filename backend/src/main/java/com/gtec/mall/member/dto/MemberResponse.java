package com.gtec.mall.member.dto;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.domain.MemberRole;
import com.gtec.mall.member.domain.MemberStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class MemberResponse {

    private Long id;
    private String loginId;
    private String name;
    private String email;
    private String tel;
    private LocalDateTime createdAt;
    private MemberStatus status;
    private MemberRole role;

    public static MemberResponse from(Member member) {
        return MemberResponse.builder()
                .id(member.getId())
                .loginId(member.getLoginId())
                .name(member.getName())
                .email(member.getEmail())
                .tel(member.getTel())
                .createdAt(member.getCreatedAt())
                .status(member.getStatus())
                .role(member.getRole())
                .build();
    }
}
