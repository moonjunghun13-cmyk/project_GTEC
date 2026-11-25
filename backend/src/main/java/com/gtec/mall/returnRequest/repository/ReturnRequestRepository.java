
package com.gtec.mall.returnRequest.repository;

import com.gtec.mall.returnRequest.domain.ReturnRequest;
import com.gtec.mall.returnRequest.domain.ReturnStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {

    // [사용자] 본인 주문의 반품 신청 내역 조회
    List<ReturnRequest> findAllByOrderIdAndOrderMemberIdOrderByRequestedAtDesc(
            Long orderId,
            Long memberId
    );

    // [사용자] 본인 반품 신청 단건 조회
    Optional<ReturnRequest> findByIdAndOrderMemberId(
            Long id,
            Long memberId
    );

    // [관리자] 전체 반품 신청 조회
    List<ReturnRequest> findAllByOrderByRequestedAtDesc();

    // 주문 상품별 반품 신청 내역 조회
    List<ReturnRequest> findAllByOrderItemId(Long orderItemId);

    // [관리자] 반품 상태별 조회
    List<ReturnRequest> findAllByStatusOrderByRequestedAtDesc(
            ReturnStatus status
    );
}
