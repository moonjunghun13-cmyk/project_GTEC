
package com.gtec.mall.delivery.domain;

import com.gtec.mall.order.domain.Order;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "deliveries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    private String carrierCode;
    private String carrierName;
    private String invoiceNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private DeliveryStatus status = DeliveryStatus.PREPARING;

    // 주문 당시 배송지 정보
    @Column(nullable = false, length = 50)
    private String shippingName;

    @Column(nullable = false, length = 20)
    private String shippingPhone;

    @Column(nullable = false, length = 10)
    private String shippingZipcode;

    @Column(nullable = false, length = 255)
    private String shippingAddress1;

    @Column(length = 255)
    private String shippingAddress2;

    @Column(name = "delivery_memo", length = 255)
    private String deliveryMemo;

    @Column(name = "shipped_at")
    private LocalDateTime shippedAt;

    @Column(name = "delivered_at")
    private LocalDateTime deliveredAt;

    @Column(name = "estimated_at")
    private LocalDate estimatedAt;

    public void updateDeliveryInfo(
            String carrierCode,
            String carrierName,
            String invoiceNumber
    ) {
        this.carrierCode = carrierCode;
        this.carrierName = carrierName;
        this.invoiceNumber = invoiceNumber;
    }

    public void updateEstimatedAt(LocalDate estimatedAt) {
        this.estimatedAt = estimatedAt;
    }

    public void startDelivery() {
        if (this.status != DeliveryStatus.PREPARING) {
            throw new IllegalStateException("상품 준비 중인 배송만 배송을 시작할 수 있습니다.");
        }
        if (carrierCode == null || carrierCode.isBlank()
                || carrierName == null || carrierName.isBlank()
                || invoiceNumber == null || invoiceNumber.isBlank()) {
            throw new IllegalStateException("배송 시작을 위해 택배사 및 운송장 정보가 필요합니다.");
        }

        this.status = DeliveryStatus.DELIVERING;
        this.shippedAt = LocalDateTime.now();
    }

    public void completeDelivery() {
        if (this.status != DeliveryStatus.DELIVERING) {
            throw new IllegalStateException("배송 중인 상품만 배송 완료 처리할 수 있습니다.");
        }

        this.status = DeliveryStatus.COMPLETED;
        this.deliveredAt = LocalDateTime.now();
    }
}
