package com.gtec.mall.member.dto;

import com.gtec.mall.member.domain.MemberRole;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemberRoleUpdateRequest {

    @NotNull
    private MemberRole role;
}
