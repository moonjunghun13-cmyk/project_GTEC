
package com.gtec.mall.cart.repository;

import com.gtec.mall.cart.domain.Cart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;

import java.util.List;
import java.util.Optional;

public interface CartRepository extends JpaRepository<Cart, Long> {

    // [사용자] 본인의 장바구니 전체 조회
    @EntityGraph(attributePaths = "product")
    List<Cart> findAllByMemberIdOrderByCreatedAtDesc(Long memberId);

    // [사용자] 특정 상품의 장바구니 내역 조회
    Optional<Cart> findByMemberIdAndProductId(
            Long memberId,
            Long productId
    );

    // [사용자] 본인의 장바구니 상품 단건 조회
    Optional<Cart> findByIdAndMemberId(
            Long id,
            Long memberId
    );

    // 회원의 특정 상품 장바구니 등록 여부 확인
    boolean existsByMemberIdAndProductId(
            Long memberId,
            Long productId
    );

    // 회원별 장바구니 상품 개수 조회
    long countByMemberId(Long memberId);

    // 주문 완료 후 회원의 장바구니 비우기
    void deleteAllByMemberId(Long memberId);

}
