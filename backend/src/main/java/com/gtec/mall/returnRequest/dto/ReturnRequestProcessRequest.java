package com.gtec.mall.returnRequest.dto;

import com.gtec.mall.returnRequest.domain.ReturnStatus;

public record ReturnRequestProcessRequest(
        ReturnStatus status,
        Long refundAmount
) {}