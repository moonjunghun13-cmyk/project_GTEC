package com.gtec.mall.returnRequest.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReturnRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false)
    private Long orderId;

    @Column(name = "order_item_id", nullable = false)
    private Long orderItemId;

    @Column(nullable = false)
    private int quantity;

    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ReturnStatus status = ReturnStatus.REQUESTED;

    private Long refundAmount;

    @Column(nullable = false, updatable = false, name = "requested_at")
    @Builder.Default
    private LocalDateTime requestedAt = LocalDateTime.now();

    @Column(nullable = false, name = "processed_at")
    @Builder.Default
    private LocalDateTime processedAt = LocalDateTime.now();

    @Column(nullable = false, name = "refunded_at")
    @Builder.Default
    private LocalDateTime refundedAt = LocalDateTime.now();

    @PrePersist
    public void prePersist() {
        if (requestedAt == null) {
            requestedAt = LocalDateTime.now();
        }
    }
    @PreUpdate
    public void preUpdate() {
        processedAt = LocalDateTime.now();
        refundedAt = LocalDateTime.now();
    }

}
