
package com.gtec.mall.review.dto;

import java.time.LocalDateTime;
import java.math.BigDecimal;
import com.gtec.mall.review.domain.Sentiment;

public record ReviewResponse(
        Long id,
        Long orderItemId,
        Long productId,
        String productName,
        String productImage,
        int rating,
        String content,
        Sentiment sentiment,
        BigDecimal sentimentScore,
        LocalDateTime sentimentAnalyzedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
