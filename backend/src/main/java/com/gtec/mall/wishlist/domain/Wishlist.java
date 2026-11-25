
package com.gtec.mall.wishlist.domain;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.product.domain.Product;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AccessLevel;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "wishlists",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_wishlist_member_product",
                        columnNames = {"member_id", "product_id"}
                )
        }
)
public class Wishlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public static Wishlist create(Member member, Product product) {
        Wishlist wishlist = new Wishlist();
        wishlist.member = member;
        wishlist.product = product;
        return wishlist;
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
