package com.gtec.mall.order.domain;

import com.gtec.mall.member.domain.Member;
import jakarta.persistence.*;
import lombok.*;


import java.time.LocalDateTime;

@Entity
@Table(name="orders")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    //금액 정보
    @Column(nullable = false)
    private long subTotal;

    @Column(nullable = false)
    private long shippingFee;

    @Column(nullable = false)
    private long discountAmount;

    @Column(nullable = false)
    private long totalAmount;

    //배송지 정보
    @Column(nullable = false)
    private String shippingName;

    @Column(nullable = false, length = 50)
    private String shippingPhone;

    @Column(nullable = false)
    private String shippingZipcode;

    @Column(nullable = false)
    private String shippingAddress1;

    @Column(nullable = false)
    private String shippingAddress2;

    //결제 정보
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    private String paymentKey;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // 취소 정보
    @Column(name = "cancel_requested_at")
    private LocalDateTime cancelRequestedAt;

    @Enumerated(EnumType.STRING)
    private CancelReason cancelReason;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    //배송 정보
    private String trackingNumber;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

}
