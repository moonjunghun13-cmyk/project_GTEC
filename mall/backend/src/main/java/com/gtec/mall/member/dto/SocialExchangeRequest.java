package com.gtec.mall.member.dto;

import jakarta.validation.constraints.NotBlank;

public record SocialExchangeRequest(
        @NotBlank
        String code
) {}
