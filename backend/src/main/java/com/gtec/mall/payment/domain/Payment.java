
package com.gtec.mall.payment.domain;

import com.gtec.mall.order.domain.Order;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "payments",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_payment_order",
                        columnNames = "order_id"
                ),
                @UniqueConstraint(
                        name = "uk_payment_key",
                        columnNames = "payment_key"
                )
        }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 주문과 결제는 1:1 관계
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    // Toss Payments 결제 고유 키
    // 결제 승인 전에는 null
    @Column(name = "payment_key", unique = true, length = 200)
    private String paymentKey;

    // Toss Payments 결제 수단
    @Column(length = 50)
    private String method;

    // 실제 결제 금액
    @Column(nullable = false)
    private long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private PaymentStatus status = PaymentStatus.READY;

    // 결제 요청 시각
    @Column(nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    // 결제 승인 시각
    private LocalDateTime approvedAt;

    // 결제 취소 시각
    private LocalDateTime canceledAt;

    // Toss 영수증 URL
    @Column(length = 500)
    private String receiptUrl;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();

        if (requestedAt == null) {
            requestedAt = now;
        }

        if (createdAt == null) {
            createdAt = now;
        }

        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Toss 결제 승인 성공 시 호출
    public void completePayment(
            String paymentKey,
            String method,
            String receiptUrl
    ) {
        if (this.status != PaymentStatus.READY) {
            throw new IllegalStateException(
                    "결제 대기 상태에서만 결제를 승인할 수 있습니다."
            );
        }

        if (paymentKey == null || paymentKey.isBlank()) {
            throw new IllegalArgumentException(
                    "결제 키가 필요합니다."
            );
        }

        this.paymentKey = paymentKey;
        this.method = method;
        this.receiptUrl = receiptUrl;
        this.status = PaymentStatus.DONE;
        this.approvedAt = LocalDateTime.now();
    }

    // Toss 결제 취소 성공 시 호출
    public void cancelPayment() {
        if (this.status != PaymentStatus.DONE) {
            throw new IllegalStateException(
                    "승인 완료된 결제만 취소할 수 있습니다."
            );
        }

        this.status = PaymentStatus.CANCELED;
        this.canceledAt = LocalDateTime.now();
    }

    // 결제 실패 처리
    public void failPayment() {
        if (this.status != PaymentStatus.READY) {
            throw new IllegalStateException(
                    "결제 대기 상태에서만 실패 처리할 수 있습니다."
            );
        }

        this.status = PaymentStatus.FAILED;
    }
}
