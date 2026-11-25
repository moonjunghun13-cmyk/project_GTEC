package com.gtec.mall.returnRequest.dto;

public record ReturnRequestCreateRequest(
        Long orderItemId,
        int quantity,
        String reason
) {}