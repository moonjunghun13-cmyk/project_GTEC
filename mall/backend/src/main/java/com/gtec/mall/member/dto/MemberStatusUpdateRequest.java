package com.gtec.mall.member.dto;

import com.gtec.mall.member.domain.MemberStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MemberStatusUpdateRequest {

    @NotNull
    private MemberStatus status;
}
