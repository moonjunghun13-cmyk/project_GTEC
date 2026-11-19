
package com.gtec.mall.review.controller;

import com.gtec.mall.review.dto.AdminReviewResponse;
import com.gtec.mall.review.dto.ReviewCreateRequest;
import com.gtec.mall.review.dto.ReviewResponse;
import com.gtec.mall.review.dto.ReviewUpdateRequest;
import com.gtec.mall.review.service.ReviewService;
import com.gtec.mall.security.JwtAuth;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // I. 사용자

    // 1. 내 리뷰 목록 조회
    @GetMapping("/reviews/me")
    public ResponseEntity<List<ReviewResponse>> getMyReviews() {
        Long memberId = JwtAuth.memberId();

        return ResponseEntity.ok(
                reviewService.getMyReviews(memberId)
        );
    }

    // 2. 상품별 리뷰 목록 조회
    @GetMapping("/products/{productId}/reviews")
    public ResponseEntity<Page<ReviewResponse>> getProductReviews(
            @PathVariable Long productId,
            @PageableDefault(
                    size = 10,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            ) Pageable pageable
    ) {

        return ResponseEntity.ok(
                reviewService.getProductReviews(productId, pageable)
        );
    }

    // 3. 리뷰 작성
    @PostMapping("/products/{productId}/reviews")
    public ResponseEntity<ReviewResponse> createReview(
            @PathVariable Long productId,
            @Valid @RequestBody ReviewCreateRequest request
    ) {
        Long memberId = JwtAuth.memberId();

        ReviewResponse response = reviewService.createReview(
                memberId,
                productId,
                request
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    // 4. 리뷰 수정
    @PatchMapping("/reviews/{reviewId}")
    public ResponseEntity<ReviewResponse> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewUpdateRequest request
    ) {
        Long memberId = JwtAuth.memberId();

        ReviewResponse response = reviewService.updateReview(
                memberId,
                reviewId,
                request
        );

        return ResponseEntity.ok(response);
    }

    // 5. 리뷰 삭제
    @DeleteMapping("/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReview(
            @PathVariable Long reviewId
    ) {
        Long memberId = JwtAuth.memberId();

        reviewService.deleteReview(memberId, reviewId);

        return ResponseEntity.noContent().build();
    }

    // II. 관리자

    // 1. 전체 리뷰 목록 조회
    @GetMapping("/admin/reviews")
    public ResponseEntity<Page<AdminReviewResponse>> getAllReviews(
            @PageableDefault(
                    size = 10,
                    sort = "createdAt",
                    direction = Sort.Direction.DESC
            ) Pageable pageable
    ) {

        checkAdmin();

        return ResponseEntity.ok(
                reviewService.getAllReviews(pageable)
        );
    }

    // 2. 리뷰 상세 조회
    @GetMapping("/admin/reviews/{reviewId}")
    public ResponseEntity<AdminReviewResponse> getReview(
            @PathVariable Long reviewId
    ) {

        checkAdmin();

        return ResponseEntity.ok(
                reviewService.getReview(reviewId)
        );
    }

    // 3. 관리자 리뷰 삭제
    @DeleteMapping("/admin/reviews/{reviewId}")
    public ResponseEntity<Void> deleteReviewByAdmin(
            @PathVariable Long reviewId
    ) {

        checkAdmin();

        reviewService.deleteReviewByAdmin(reviewId);

        return ResponseEntity.noContent().build();
    }

    // III. 관리자 권한 확인
    private void checkAdmin() {
        if (!JwtAuth.isAdmin()) {
            throw new IllegalStateException("관리자 권한이 필요합니다.");
        }
    }
}
