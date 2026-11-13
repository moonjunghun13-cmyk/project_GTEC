package com.gtec.mall.member.dto;

public record SocialExchangeResponse(
        String status,
        TokenResponse tokens,
        String signupToken
){}
