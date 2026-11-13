package com.gtec.mall.review.dto;

import jakarta.validation.constraints.*;

public record ReviewCreateRequest(
        @NotNull(message = "구매 상품 ID는 필수입니다.")
        @Positive(message = "구매 상품 ID는 양수여야 합니다.")
        Long orderItemId,
        @Min(value = 1, message = "별점은 최소 1점입니다.")
        @Max(value = 5, message = "별점은 최대 5점입니다.")
        int rating,
        @NotBlank(message = "리뷰 내용을 입력해주세요.")
        String content) {}

