
package com.gtec.mall.order.domain;

import com.gtec.mall.delivery.domain.Delivery;
import com.gtec.mall.member.domain.Member;
import com.gtec.mall.orderItem.domain.OrderItem;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
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
    @Column(nullable = false, length = 30)
    @Builder.Default
    private OrderStatus status = OrderStatus.PENDING;

    @Column(nullable = false)
    private long subTotal;

    @Column(nullable = false)
    private long shippingFee;

    @Column(nullable = false)
    private long discountAmount;

    @Column(nullable = false)
    private long totalAmount;

    @OneToOne(mappedBy = "order", fetch = FetchType.LAZY)
    private Delivery delivery;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentMethod paymentMethod;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "cancel_requested_at")
    private LocalDateTime cancelRequestedAt;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private CancelReason cancelReason;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    @Builder.Default
    private List<OrderItem> orderItems = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void calculateTotalAmount() {
        if (subTotal < 0 || shippingFee < 0 || discountAmount < 0) {
            throw new IllegalArgumentException("주문 금액은 음수일 수 없습니다.");
        }

        totalAmount = Math.subtractExact(
                Math.addExact(subTotal, shippingFee),
                discountAmount
        );

        if (totalAmount < 0) {
            throw new IllegalArgumentException("최종 주문 금액은 음수일 수 없습니다.");
        }
    }

    // PaymentService에서 결제 승인 성공 후 호출
    public void markAsPaid() {
        if (status != OrderStatus.PENDING) {
            throw new IllegalStateException("결제 대기 상태의 주문만 결제할 수 있습니다.");
        }

        status = OrderStatus.PAID;
        paidAt = LocalDateTime.now();
    }

    public void startPreparing() {
        if (status != OrderStatus.PAID) {
            throw new IllegalStateException("결제가 완료된 주문만 상품을 준비할 수 있습니다.");
        }
        status = OrderStatus.PREPARING;
    }

    public void markAsShipped() {
        if (status != OrderStatus.PREPARING) {
            throw new IllegalStateException("상품 준비 중인 주문만 배송할 수 있습니다.");
        }
        status = OrderStatus.SHIPPED;
    }

    public void markAsDelivered() {
        if (status != OrderStatus.SHIPPED) {
            throw new IllegalStateException("배송 중인 주문만 배송 완료 처리할 수 있습니다.");
        }
        status = OrderStatus.DELIVERED;
    }

    public void complete() {
        if (status != OrderStatus.DELIVERED) {
            throw new IllegalStateException("배송 완료된 주문만 구매 확정할 수 있습니다.");
        }
        status = OrderStatus.COMPLETED;
    }

    public void requestCancellation(CancelReason reason) {
        if (status != OrderStatus.PENDING && status != OrderStatus.PAID) {
            throw new IllegalStateException("현재 주문은 취소할 수 없습니다.");
        }
        if (reason == null) {
            throw new IllegalArgumentException("취소 사유가 필요합니다.");
        }
        if (cancelRequestedAt != null) {
            throw new IllegalStateException("이미 취소 요청된 주문입니다.");
        }

        cancelRequestedAt = LocalDateTime.now();
        cancelReason = reason;
    }

    // 결제 전 주문 또는 결제 취소가 완료된 주문에 사용
    public void cancel() {
        if (status != OrderStatus.PENDING && status != OrderStatus.PAID) {
            throw new IllegalStateException("현재 주문은 취소할 수 없습니다.");
        }

        status = OrderStatus.CANCELLED;
        cancelledAt = LocalDateTime.now();
    }

    public void addOrderItem(OrderItem orderItem) {
        if (orderItem == null) {
            throw new IllegalArgumentException("주문 상품이 존재하지 않습니다.");
        }

        orderItems.add(orderItem);
        orderItem.assignOrder(this);
    }
}
