package com.gtec.mall.review.service;

import com.gtec.mall.order.domain.OrderStatus;
import com.gtec.mall.orderItem.domain.OrderItem;
import com.gtec.mall.review.domain.Review;
import com.gtec.mall.review.dto.AdminReviewResponse;
import com.gtec.mall.review.dto.ReviewCreateRequest;
import com.gtec.mall.review.dto.ReviewResponse;
import com.gtec.mall.review.dto.ReviewUpdateRequest;
import com.gtec.mall.review.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {
    private final ReviewRepository reviewRepository;
    private final OrderItemRepository orderItemRepository;


    // I. 사용자
    // 1. 리뷰 목록 조회
    public List<ReviewResponse> getMyReviews(Long memberId) {
        return reviewRepository
                .findAllByMemberIdOrderByCreatedAtDesc(memberId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 2. 리뷰 작성
    @Transactional
    public ReviewResponse createReview(Long memberId, ReviewCreateRequest request) {
        // 구매 상품 조회
        OrderItem orderItem = orderItemRepository.findById(request.orderItemId())
                .orElseThrow(() -> new IllegalArgumentException("구매 상품을 찾을 수 없습니다."));

        // 로그인 회원의 구매 건인지 확인
        if (!orderItem.getOrder().getMember().getId().equals(memberId)) {
            throw new IllegalArgumentException("본인의 구매 상품에만 리뷰를 작성할 수 있습니다.");
        }

        // 주문 상태가 COMPLETED인지 확인
        if (orderItem.getOrder().getStatus() != OrderStatus.COMPLETED) {
            throw new IllegalStateException("배송 완료된 상품에만 리뷰를 작성할 수 있습니다.");
        }

        // 동일 구매 건 중복 리뷰 확인
        if (reviewRepository.existsByOrderItemId(request.orderItemId())) {
            throw new IllegalStateException("이미 리뷰를 작성한 구매 상품입니다.");
        }

        // 리뷰 생성
        Review review = Review.builder()
                .member(orderItem.getOrder().getMember())
                .product(orderItem.getProduct())
                .orderItem(orderItem)
                .rating(request.rating())
                .content(request.content())
                .build();
        Review savedReview = reviewRepository.save(review);
        return toResponse(savedReview);
    }

    // 3. 리뷰 수정
    @Transactional
    public ReviewResponse updateReview(Long memberId, Long id, ReviewUpdateRequest request) {
        // 본인 리뷰 확인
        Review review = reviewRepository
                .findByIdAndMemberId(id, memberId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없거나 수정 권한이 없습니다."));

        // 별점과 내용만 수정
        review.setRating(request.rating());
        review.setContent(request.content());
        return toResponse(review);
    }


    // 4. 리뷰 삭제
    @Transactional
    public void deleteReview(Long memberId, Long id) {
        // 본인 리뷰인지 확인
        Review review = reviewRepository
                .findByIdAndMemberId(id, memberId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없거나 삭제 권한이 없습니다."));

        // 물리 삭제
        reviewRepository.delete(review);
    }


    // II. 관리자
    // 1. 전체 리뷰 목록 조회
    public Page<AdminReviewResponse> getAllReviews(Pageable pageable) {
        return reviewRepository
                .findAllByOrderByCreatedAtDesc(pageable)
                .map(this::toAdminResponse);
    }

    // 2. 리뷰 상세 조회
    public AdminReviewResponse getReview(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다."));
        return toAdminResponse(review);
    }


    // 3. 관리자: 리뷰 삭제
    @Transactional
    public void deleteReviewByAdmin(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("리뷰를 찾을 수 없습니다."));

        // 물리 삭제
        reviewRepository.delete(review);
    }


    // III. 공통
    // ReviewResponse DTO 변환
    private ReviewResponse toResponse(Review review) {
        var product = review.getProduct();

        // 대표 이미지 우선, 없으면 정렬 순서가 빠른 이미지 선택
        String productImage = product.getImages().stream()
                .sorted(Comparator.comparing(image -> !image.isPrimary())
                        .thenComparing(image -> image.getSortOrder(), Comparator.nullsLast(Comparator.naturalOrder())))
                .map(image -> image.getImageUrl())
                .findFirst()
                .orElse(null);

        return new ReviewResponse(
                review.getId(),
                product.getId(),
                product.getName(),
                productImage,
                review.getRating(),
                review.getContent(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }

    private AdminReviewResponse toAdminResponse(Review review) {
        var product = review.getProduct();
        String productImage = product.getImages().stream()
                .sorted(Comparator.comparing(image -> !image.isPrimary())
                        .thenComparing(image -> image.getSortOrder(), Comparator.nullsLast(Comparator.naturalOrder())))
                .map(image -> image.getImageUrl())
                .findFirst()
                .orElse(null);

        return new AdminReviewResponse(
                review.getId(),
                review.getMember().getId(),
                product.getId(),
                product.getName(),
                productImage,
                review.getRating(),
                review.getContent(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}