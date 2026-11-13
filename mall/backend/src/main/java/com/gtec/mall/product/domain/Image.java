package com.gtec.mall.product.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name="images")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Image {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false, length = 500)
    private String imageUrl;

    private boolean isPrimary;  // 대표 이미지 여부

    @Column(nullable = false)
    private int sortOrder = 0;  // 이미지 표시 순서
}
