package com.gtec.mall.product.dto;

import com.gtec.mall.product.domain.Category;
import com.gtec.mall.product.domain.Image;
import com.gtec.mall.product.domain.Product;
import com.gtec.mall.product.domain.Status;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class ProductResponse {

    private Long id;
    private String name;
    private Category category;
    private long stock;
    private String description;
    private String specification;
    private long price;
    private Status status;
    private LocalDateTime createdAt;
    private String thumbnailUrl;
    private List<String> imageUrls;

    public static ProductResponse from(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .category(product.getCategory())
                .stock(product.getStock())
                .description(product.getDescription())
                .specification(product.getSpecification())
                .price(product.getPrice())
                .status(product.getStatus())
                .createdAt(product.getCreatedAt())
                .thumbnailUrl(product.getThumbnailUrl())
                .imageUrls(product.getImages().stream().map(Image::getImageUrl).toList())
                .build();
    }
}
