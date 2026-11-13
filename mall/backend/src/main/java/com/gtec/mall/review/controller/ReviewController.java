package com.gtec.mall.review.controller;

import com.gtec.mall.config.LoginSession;
import com.gtec.mall.review.dto.AdminReviewResponse;
import com.gtec.mall.review.dto.ReviewCreateRequest;
import com.gtec.mall.review.dto.ReviewResponse;
import com.gtec.mall.review.dto.ReviewUpdateRequest;
import com.gtec.mall.review.service.ReviewService;
import jakarta.servlet.http.HttpSession;
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
    // 1. 리뷰 조회
    @GetMapping("/reviews/me")
        public ResponseEntity<List<ReviewResponse>> getMyReviews(HttpSession session) {
        Long memberId = LoginSession.memberId(session);
        return ResponseEntity.ok(reviewService.getMyReviews(memberId));
    }

    // 2. 리뷰 작성
    @PostMapping("/reviews")
    public ResponseEntity<ReviewResponse> createReview(HttpSession session, @Valid @RequestBody ReviewCreateRequest request) {
        Long memberId = LoginSession.memberId(session);
        ReviewResponse response = reviewService.createReview(memberId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 3. 리뷰 수정
    @PutMapping("/reviews/{id}")
    public ResponseEntity<ReviewResponse> updateReview(HttpSession session, @PathVariable Long id, @Valid @RequestBody ReviewUpdateRequest request) {
        Long memberId = LoginSession.memberId(session);
        ReviewResponse response = reviewService.updateReview(memberId, id, request);
        return ResponseEntity.ok(response);
    }
    // 4. 리뷰 삭제
        @DeleteMapping("/reviews/{id}")
            public ResponseEntity<Void> deleteReview(HttpSession session,@PathVariable Long id) {
            Long memberId = LoginSession.memberId(session);
            reviewService.deleteReview(memberId, id);
            return ResponseEntity.noContent().build();
        }


    // II. 관리자
    // 1. 전체 목록 조회
        @GetMapping("/admin/reviews")
        public ResponseEntity<Page<AdminReviewResponse>> getAllReviews(HttpSession session, @PageableDefault(
            size = 10,
            sort = "createdAt",
            direction = Sort.Direction.DESC
            ) Pageable pageable) {
            checkAdmin(session);
            return ResponseEntity.ok(
                reviewService.getAllReviews(pageable)
            );
        }

    // 2. 리뷰 상세 조회
        @GetMapping("/admin/reviews/{id}")
        public ResponseEntity<AdminReviewResponse> getReview(HttpSession session, @PathVariable Long id) {
            checkAdmin(session);
            return ResponseEntity.ok(reviewService.getReview(id)
            );
        }

    // 3. 리뷰 삭제
        @DeleteMapping("/admin/reviews/{id}")
        public ResponseEntity<Void> deleteReviewByAdmin(HttpSession session, @PathVariable Long id) {
            checkAdmin(session);
            reviewService.deleteReviewByAdmin(id);
            return ResponseEntity.noContent().build();
        }

    // IV. 권한 확인
        private void checkAdmin(HttpSession session) {
            throw new UnsupportedOperationException("관리자 권한 확인 로직을 연결해야 합니다.");
        }
}
