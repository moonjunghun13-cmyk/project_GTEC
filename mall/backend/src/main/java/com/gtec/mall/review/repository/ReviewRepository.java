package com.gtec.mall.review.repository;

import com.gtec.mall.review.domain.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    //[사용자]리뷰 전체 조회
    @EntityGraph(attributePaths = {"product"})
    List<Review> findAllByMemberIdOrderByCreatedAtDesc(Long memberId);

    //[사용자]리뷰 단건 조회
    Optional<Review> findByIdAndMemberId (Long id, Long memberId);

    //[사용자]리뷰 존재 여부 확인
    boolean existsByProductId(Long productId);

    //[사용자]동일 구매 건 리뷰 존재 여부 확인
    boolean existsByOrderItemId(Long orderItemId);

    //[관리자] 모든 리뷰 조회
    @EntityGraph(attributePaths = {"product", "member"})
    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
