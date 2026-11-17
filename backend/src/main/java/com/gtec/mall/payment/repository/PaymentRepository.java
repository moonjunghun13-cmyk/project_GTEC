
package com.gtec.mall.payment.repository;

import com.gtec.mall.payment.domain.Payment;
import com.gtec.mall.payment.domain.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // 주문 ID로 결제 정보 조회
    Optional<Payment> findByOrderId(Long orderId);

    // 주문 번호로 결제 정보 조회
    Optional<Payment> findByOrderOrderNumber(String orderNumber);

    // Toss 결제 키로 결제 정보 조회
    Optional<Payment> findByPaymentKey(String paymentKey);

    // 결제 상태별 조회
    List<Payment> findAllByStatus(PaymentStatus status);

    // 주문의 결제 정보 존재 여부
    boolean existsByOrderId(Long orderId);
}
