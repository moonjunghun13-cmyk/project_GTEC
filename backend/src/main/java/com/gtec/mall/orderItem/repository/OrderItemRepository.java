package com.gtec.mall.orderItem.repository;

import com.gtec.mall.orderItem.domain.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    // [주문] 특정 주문에 포함된 상품 전체 조회
    List<OrderItem> findAllByOrderId(Long orderId);

    // [주문] 특정 주문에 포함된 상품 전체 조회 (생성순)
    List<OrderItem> findAllByOrderIdOrderByCreatedAtAsc(Long orderId);

    // [사용자] 본인 주문에 포함된 특정 상품 조회
    Optional<OrderItem> findByIdAndOrderMemberId(
            Long id,
            Long memberId
    );

    // [사용자] 특정 주문에 포함된 상품 단건 조회
    Optional<OrderItem> findByIdAndOrderId(
            Long id,
            Long orderId
    );

    // 특정 주문에 상품이 포함되어 있는지 확인
    boolean existsByOrderIdAndProductId(
            Long orderId,
            Long productId
    );

    // 특정 주문의 주문 상품 개수 확인
    long countByOrderId(Long orderId);

    // 특정 상품의 주문 이력 존재 여부 확인
    boolean existsByProductId(Long productId);
}
