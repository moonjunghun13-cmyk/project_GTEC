
package com.gtec.mall.returnRequest.domain;

import com.gtec.mall.order.domain.Order;
import com.gtec.mall.orderItem.domain.OrderItem;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "return_requests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class ReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 주문 정보
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // 주문 상품 정보
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @Column(nullable = false)
    private int quantity;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReturnStatus status = ReturnStatus.REQUESTED;

    @Column(name = "refund_amount")
    private Long refundAmount;

    // 반품 신청 시각
    @Column(name = "requested_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime requestedAt = LocalDateTime.now();

    // 관리자 처리 시각
    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    // 환불 완료 시각
    @Column(name = "refunded_at")
    private LocalDateTime refundedAt;

    // 승인 처리
    public void approve(long refundAmount) {
        if (this.status != ReturnStatus.REQUESTED) {
            throw new IllegalStateException("처리 대기 중인 반품만 승인할 수 있습니다.");
        }

        if (refundAmount < 0) {
            throw new IllegalArgumentException("환불 금액은 음수일 수 없습니다.");
        }

        this.status = ReturnStatus.APPROVED;
        this.refundAmount = refundAmount;
        this.processedAt = LocalDateTime.now();
    }

    // 거절 처리
    public void reject() {
        if (this.status != ReturnStatus.REQUESTED) {
            throw new IllegalStateException("처리 대기 중인 반품만 거절할 수 있습니다.");
        }

        this.status = ReturnStatus.REJECTED;
        this.processedAt = LocalDateTime.now();
    }

    // 환불 완료 처리
    public void markAsRefunded() {
        if (this.status != ReturnStatus.APPROVED) {
            throw new IllegalStateException("승인된 반품만 환불할 수 있습니다.");
        }

        this.status = ReturnStatus.REFUNDED;
        this.refundedAt = LocalDateTime.now();
    }
}
