
package com.gtec.mall.payment.dto;

import com.gtec.mall.payment.domain.Payment;
import com.gtec.mall.payment.domain.PaymentStatus;

import java.time.LocalDateTime;

public record PaymentResponse(
        Long paymentId,
        Long orderId,
        String orderNumber,
        String paymentKey,
        String method,
        Long amount,
        PaymentStatus status,
        LocalDateTime requestedAt,
        LocalDateTime approvedAt,
        LocalDateTime canceledAt,
        String receiptUrl
) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getOrder().getId(),
                payment.getOrder().getOrderNumber(),
                payment.getPaymentKey(),
                payment.getMethod(),
                payment.getAmount(),
                payment.getStatus(),
                payment.getRequestedAt(),
                payment.getApprovedAt(),
                payment.getCanceledAt(),
                payment.getReceiptUrl()
        );
    }
}
