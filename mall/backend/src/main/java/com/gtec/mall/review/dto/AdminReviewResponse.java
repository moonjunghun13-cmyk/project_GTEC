package com.gtec.mall.review.dto;

import java.time.LocalDateTime;

public record AdminReviewResponse(
        Long id,
        Long memberId,
        Long productId,
        String productName,
        String productImage,
        int rating,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
