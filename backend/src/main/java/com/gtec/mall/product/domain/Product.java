
package com.gtec.mall.product.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "products")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Column(nullable = false)
    private long stock;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String specification;

    @Column(nullable = false)
    private long price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.ACTIVE;

    @Column(nullable = false, name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();

    @OneToMany(
            mappedBy = "product",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("sortOrder ASC")
    @Builder.Default
    private List<Image> images = new ArrayList<>();

    // 기존 다른 도메인과의 호환성을 위해 유지
    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    /**
     * 재고 변경 시 판매 상태 동기화
     */
    public void setStock(long stock) {
        this.stock = stock;

        if (stock <= 0) {
            if (this.status != Status.INACTIVE) {
                this.status = Status.SOLD_OUT;
            }
        } else if (this.status == Status.SOLD_OUT) {
            this.status = Status.ACTIVE;
        }
    }

    /**
     * 판매 상태 변경
     * 재고가 없는 상품은 ACTIVE로 변경할 수 없음
     */
    public void setStatus(Status status) {
        if (status == Status.ACTIVE && this.stock <= 0) {
            this.status = Status.SOLD_OUT;
            return;
        }

        this.status = status;
    }

    public void addImage(Image image) {
        this.images.add(image);
        image.setProduct(this);
    }

    public void clearImages() {
        this.images.clear();
    }

    public void increaseStock(int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException(
                    "복구할 재고 수량은 1개 이상이어야 합니다."
            );
        }

        setStock(this.stock + quantity);
    }

    public void decreaseStock(int quantity) {
        if (quantity <= 0) {
            throw new IllegalArgumentException(
                    "차감 수량은 1개 이상이어야 합니다."
            );
        }

        if (this.stock < quantity) {
            throw new IllegalStateException("상품 재고가 부족합니다.");
        }

        setStock(this.stock - quantity);
    }

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = Status.ACTIVE;
        }

        if (stock <= 0 && status != Status.INACTIVE) {
            status = Status.SOLD_OUT;
        }

        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
