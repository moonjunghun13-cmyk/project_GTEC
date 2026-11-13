package com.gtec.mall.order.domain;

public enum OrderStatus {
    PENDING,    // 결제 대기 중
    PAID,       // 결제 완료
    PREPARING,  // 상품 준비 중
    SHIPPED,    // 배송 중
    DELIVERED,  // 배송 완료
    COMPLETED,  // 주문 완료(구매 확정)
    CANCELLED,  // 주문 취소
    REFUNDED    // 환불 완료
}
