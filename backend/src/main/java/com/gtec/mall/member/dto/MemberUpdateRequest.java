package com.gtec.mall.member.dto;

import jakarta.validation.constraints.Email;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemberUpdateRequest {

    private String name;

    @Email
    private String email;

    private String tel;
}