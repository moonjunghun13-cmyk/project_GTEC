
package com.gtec.mall.cart.domain;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.product.domain.Product;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AccessLevel;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "carts",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_cart_member_product",
                        columnNames = {"member_id", "product_id"}
                )
        }
)
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Min(1)
    @Column(nullable = false)
    private int quantity;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static Cart create(
            Member member,
            Product product,
            int quantity
    ) {
        Cart cart = new Cart();
        cart.member = member;
        cart.product = product;
        cart.quantity = quantity;
        return cart;
    }

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();

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

    // 수량 변경
    public void changeQuantity(int quantity) {
        if (quantity < 1) {
            throw new IllegalArgumentException(
                    "장바구니 수량은 1개 이상이어야 합니다."
            );
        }

        this.quantity = quantity;
    }
}
