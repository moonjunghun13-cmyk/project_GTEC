package com.gtec.mall.review.dto;

import java.time.LocalDateTime;

public record ReviewResponse(
        Long id,
        Long productId,
        String productName,
        String productImage,
        int rating,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
