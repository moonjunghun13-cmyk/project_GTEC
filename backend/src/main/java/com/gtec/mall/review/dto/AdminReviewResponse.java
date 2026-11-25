
package com.gtec.mall.review.dto;

import com.gtec.mall.review.domain.Sentiment;

import java.time.LocalDateTime;
import java.math.BigDecimal;

public record AdminReviewResponse(
        Long id,
        Long memberId,
        Long productId,
        String productName,
        String productImage,
        String content,
        Sentiment sentiment,
        BigDecimal sentimentScore,
        LocalDateTime sentimentAnalyzedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
