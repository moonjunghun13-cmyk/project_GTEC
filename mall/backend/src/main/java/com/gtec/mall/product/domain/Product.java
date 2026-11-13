package com.gtec.mall.product.domain;


import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name="products")
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
    private String name;    // 상품명

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;    // 카테고리

    @Column(nullable = false)
    private long stock;     // 재고 수

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description; // 상세 설명

    @Column(nullable = false, columnDefinition = "TEXT")
    private String specification;    // 스펙

    @Column(nullable = false)
    private long price;     // 가격

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.ACTIVE;  // 판매 상태

    @Column(nullable = false, name = "created_at", updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();    // 게시일

    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();    // 수정일

    @OneToMany(
            mappedBy = "product",
            cascade = CascadeType.ALL,
            orphanRemoval = true
    )
    @OrderBy("sortOrder ASC")
    private final List<Image> images = new ArrayList<>();

    @Column(name = "thumbnail_url", length = 500)
    private String thumbnailUrl;

    public void addImage(Image image) {
        this.images.add(image);
        image.setProduct(this);
    }

    public void clearImages() {
        this.images.clear();
    }

    @PrePersist
    public void prePersist() {
        if (status == null) {
            status = Status.ACTIVE;
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
