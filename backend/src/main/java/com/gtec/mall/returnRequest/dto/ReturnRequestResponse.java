package com.gtec.mall.returnRequest.dto;

import com.gtec.mall.returnRequest.domain.ReturnRequest;
import com.gtec.mall.returnRequest.domain.ReturnStatus;

import java.time.LocalDateTime;

public record ReturnRequestResponse(
        Long id,
        Long orderId,
        Long orderItemId,
        String productName,
        int quantity,
        String reason,
        ReturnStatus status,
        Long refundAmount,
        LocalDateTime requestedAt,
        LocalDateTime processedAt,
        LocalDateTime refundedAt
) {
    public static ReturnRequestResponse from(ReturnRequest request) {
        return new ReturnRequestResponse(
                request.getId(),
                request.getOrder().getId(),
                request.getOrderItem().getId(),
                request.getOrderItem().getProductName(),
                request.getQuantity(),
                request.getReason(),
                request.getStatus(),
                request.getRefundAmount(),
                request.getRequestedAt(),
                request.getProcessedAt(),
                request.getRefundedAt()
        );
    }
}