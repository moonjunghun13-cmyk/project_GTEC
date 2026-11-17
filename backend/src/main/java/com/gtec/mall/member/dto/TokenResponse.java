package com.gtec.mall.member.dto;

public record TokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn
) {}
