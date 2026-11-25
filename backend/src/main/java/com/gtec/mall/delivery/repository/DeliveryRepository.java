
package com.gtec.mall.delivery.repository;

import com.gtec.mall.delivery.domain.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DeliveryRepository extends JpaRepository<Delivery, Long> {

    // [사용자] 본인 주문의 배송 정보 조회
    Optional<Delivery> findByOrderIdAndOrderMemberId(
            Long orderId,
            Long memberId
    );

    // [관리자] 주문 ID로 배송 정보 조회
    Optional<Delivery> findByOrderId(Long orderId);

    // 주문별 배송 정보 존재 여부 확인
    boolean existsByOrderId(Long orderId);

}
