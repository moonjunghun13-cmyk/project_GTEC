
package com.gtec.mall.review.service;

import com.gtec.mall.order.domain.OrderStatus;
import com.gtec.mall.orderItem.domain.OrderItem;
import com.gtec.mall.orderItem.repository.OrderItemRepository;
import com.gtec.mall.product.domain.Image;
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

    // 1. 내 리뷰 목록 조회
    public List<ReviewResponse> getMyReviews(Long memberId) {
        return reviewRepository
                .findAllByMemberIdOrderByCreatedAtDesc(memberId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 2. 상품별 리뷰 목록 조회
    public Page<ReviewResponse> getProductReviews(
            Long productId,
            Pageable pageable
    ) {
        return reviewRepository
                .findAllByProductIdOrderByCreatedAtDesc(
                        productId,
                        pageable
                )
                .map(this::toResponse);
    }

    // 3. 리뷰 작성
    @Transactional
    public ReviewResponse createReview(
            Long memberId,
            Long productId,
            ReviewCreateRequest request
    ) {

        // 구매 상품 조회
        OrderItem orderItem = orderItemRepository
                .findById(request.orderItemId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "구매 상품을 찾을 수 없습니다."
                        )
                );

        // 본인의 주문 상품인지 확인
        if (!orderItem.getOrder()
                .getMember()
                .getId()
                .equals(memberId)) {

            throw new IllegalArgumentException(
                    "본인의 구매 상품에만 리뷰를 작성할 수 있습니다."
            );
        }

        // URL의 상품 ID와 구매 상품의 상품 ID 일치 여부 확인
        if (!orderItem.getProduct()
                .getId()
                .equals(productId)) {

            throw new IllegalArgumentException(
                    "구매한 상품에 대해서만 리뷰를 작성할 수 있습니다."
            );
        }

        // 주문 상태 확인
        if (orderItem.getOrder().getStatus() != OrderStatus.COMPLETED) {
            throw new IllegalStateException(
                    "구매 확정된 상품에만 리뷰를 작성할 수 있습니다."
            );
        }

        // 중복 리뷰 확인
        if (reviewRepository.existsByOrderItemId(request.orderItemId())) {
            throw new IllegalStateException(
                    "이미 리뷰를 작성한 구매 상품입니다."
            );
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

    // 4. 리뷰 수정
    @Transactional
    public ReviewResponse updateReview(
            Long memberId,
            Long reviewId,
            ReviewUpdateRequest request
    ) {

        Review review = reviewRepository
                .findByIdAndMemberId(reviewId, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "리뷰를 찾을 수 없거나 수정 권한이 없습니다."
                        )
                );

        review.setRating(request.rating());
        review.setContent(request.content());

        return toResponse(review);
    }

    // 5. 리뷰 삭제
    @Transactional
    public void deleteReview(Long memberId, Long reviewId) {

        Review review = reviewRepository
                .findByIdAndMemberId(reviewId, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "리뷰를 찾을 수 없거나 삭제 권한이 없습니다."
                        )
                );

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
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "리뷰를 찾을 수 없습니다."
                        )
                );

        return toAdminResponse(review);
    }

    // 3. 관리자 리뷰 삭제
    @Transactional
    public void deleteReviewByAdmin(Long reviewId) {

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "리뷰를 찾을 수 없습니다."
                        )
                );

        reviewRepository.delete(review);
    }

    // III. 공통

    // 일반 사용자 응답 DTO 변환
    private ReviewResponse toResponse(Review review) {

        var product = review.getProduct();

        String productImage = product.getImages().stream()
                .sorted(
                        Comparator.comparing(
                                (Image image) -> !image.isPrimary()
                        ).thenComparing(
                                (Image image) -> image.getSortOrder()
                        )
                )
                .map(Image::getImageUrl)
                .findFirst()
                .orElse(null);

        return new ReviewResponse(
                review.getId(),
                review.getOrderItem().getId(),
                product.getId(),
                product.getName(),
                productImage,
                review.getRating(),
                review.getContent(),
                review.getSentiment(),
                review.getSentimentScore(),
                review.getSentimentAnalyzedAt(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }

    // 관리자 응답 DTO 변환
    private AdminReviewResponse toAdminResponse(Review review) {

        var product = review.getProduct();

        String productImage = product.getImages().stream()
                .sorted(
                        Comparator.comparing(
                                (Image image) -> !image.isPrimary()
                        ).thenComparing(
                                (Image image) -> image.getSortOrder()
                        )
                )
                .map(Image::getImageUrl)
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
                review.getSentiment(),
                review.getSentimentScore(),
                review.getSentimentAnalyzedAt(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }
}
