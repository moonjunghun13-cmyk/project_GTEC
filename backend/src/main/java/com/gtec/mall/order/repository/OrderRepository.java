package com.gtec.mall.order.repository;

import com.gtec.mall.order.domain.Order;
import com.gtec.mall.order.domain.OrderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // 주문번호로 조회
    Optional<Order> findByOrderNumber(String orderNumber);

    // 주문번호 중복 확인
    boolean existsByOrderNumber(String orderNumber);

    // [사용자] 본인의 주문 전체 조회
    List<Order> findAllByMemberIdOrderByCreatedAtDesc(Long memberId);

    Page<Order> findAllByMemberIdOrderByCreatedAtDesc(
            Long memberId,
            Pageable pageable
    );

    // [사용자] 본인의 주문 단건 조회
    Optional<Order> findByIdAndMemberId(Long id, Long memberId);

    // [사용자] 주문번호로 본인 주문 조회
    Optional<Order> findByOrderNumberAndMemberId(
            String orderNumber,
            Long memberId
    );

    // [관리자] 전체 주문 조회
    Page<Order> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // [관리자] 주문 상태별 조회
    Page<Order> findAllByStatusOrderByCreatedAtDesc(
            OrderStatus status,
            Pageable pageable
    );

    // 회원별 주문 존재 여부 확인
    boolean existsByMemberId(Long memberId);
}
