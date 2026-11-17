
package com.gtec.mall.payment.service;

import com.gtec.mall.order.domain.Order;
import com.gtec.mall.order.domain.OrderStatus;
import com.gtec.mall.order.repository.OrderRepository;
import com.gtec.mall.order.service.OrderService;
import com.gtec.mall.payment.domain.Payment;
import com.gtec.mall.payment.domain.PaymentStatus;
import com.gtec.mall.payment.dto.PaymentConfirmRequest;
import com.gtec.mall.payment.dto.PaymentRequest;
import com.gtec.mall.payment.dto.PaymentResponse;
import com.gtec.mall.payment.repository.PaymentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final RestClient restClient;
    private final String secretKey;

    private static final String TOSS_API_URL =
            "https://api.tosspayments.com";

    public PaymentService(
            PaymentRepository paymentRepository,
            OrderRepository orderRepository,
            OrderService orderService,
            RestClient.Builder restClientBuilder,
            @Value("${toss.payments.secret-key}") String secretKey
    ) {
        this.paymentRepository = paymentRepository;
        this.orderRepository = orderRepository;
        this.orderService = orderService;
        this.restClient = restClientBuilder
                .baseUrl(TOSS_API_URL)
                .build();
        this.secretKey = secretKey;
    }

    // 1. 결제 준비
    @Transactional
    public PaymentResponse readyPayment(
            Long memberId,
            PaymentRequest request
    ) {

        Order order = orderRepository
                .findByOrderNumberAndMemberId(
                        request.orderNumber(),
                        memberId
                )
                .orElseThrow(() ->
                        new IllegalArgumentException("주문을 찾을 수 없습니다.")
                );

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new IllegalStateException(
                    "결제 대기 상태의 주문만 결제할 수 있습니다."
            );
        }

        // 기존 결제 정보가 있다면 재사용
        return paymentRepository
                .findByOrderId(order.getId())
                .map(payment -> {
                    if (payment.getStatus() != PaymentStatus.READY) {
                        throw new IllegalStateException(
                                "현재 결제 상태에서는 결제를 준비할 수 없습니다."
                        );
                    }

                    return PaymentResponse.from(payment);
                })
                .orElseGet(() -> {
                    Payment payment = Payment.builder()
                            .order(order)
                            .amount(order.getTotalAmount())
                            .status(PaymentStatus.READY)
                            .build();

                    return PaymentResponse.from(
                            paymentRepository.save(payment)
                    );
                });
    }

    // 2. Toss 결제 승인
    @Transactional
    public PaymentResponse confirmPayment(
            Long memberId,
            PaymentConfirmRequest request
    ) {

        Order order = orderRepository
                .findByOrderNumberAndMemberId(
                        request.orderId(),
                        memberId
                )
                .orElseThrow(() ->
                        new IllegalArgumentException("주문을 찾을 수 없습니다.")
                );

        Payment payment = paymentRepository
                .findByOrderId(order.getId())
                .orElseThrow(() ->
                        new IllegalArgumentException("결제 정보를 찾을 수 없습니다.")
                );

        if (order.getStatus() != OrderStatus.PENDING) {
            throw new IllegalStateException(
                    "결제 대기 상태의 주문만 승인할 수 있습니다."
            );
        }

        if (payment.getStatus() != PaymentStatus.READY) {
            throw new IllegalStateException(
                    "결제 대기 상태에서만 승인할 수 있습니다."
            );
        }

        // DB에 저장된 주문 금액과 결제 금액 비교
        if (payment.getAmount() != order.getTotalAmount()
                || payment.getAmount() != request.amount()) {
            throw new IllegalArgumentException(
                    "결제 금액이 주문 금액과 일치하지 않습니다."
            );
        }

        // Toss 결제 승인 API 호출
        TossPaymentResponse tossResponse = restClient.post()
                .uri("/v1/payments/confirm")
                .headers(headers -> headers.setBasicAuth(secretKey, ""))
                .contentType(MediaType.APPLICATION_JSON)
                .body(new TossConfirmRequest(
                        request.paymentKey(),
                        request.orderId(),
                        request.amount()
                ))
                .retrieve()
                .body(TossPaymentResponse.class);

        if (tossResponse == null
                || !"DONE".equals(tossResponse.status())
                || tossResponse.totalAmount() == null
                || tossResponse.totalAmount() != payment.getAmount()) {
            throw new IllegalStateException(
                    "토스 결제 승인 결과가 올바르지 않습니다."
            );
        }

        String receiptUrl = tossResponse.receipt() != null
                ? tossResponse.receipt().url()
                : null;

        // Payment 결제 완료
        payment.completePayment(
                request.paymentKey(),
                tossResponse.method(),
                receiptUrl
        );

        // Order 결제 완료
        order.markAsPaid();

        return PaymentResponse.from(payment);
    }

    // 3. 회원 결제 조회
    public PaymentResponse getMyPayment(
            Long memberId,
            String orderNumber
    ) {

        Order order = orderRepository
                .findByOrderNumberAndMemberId(orderNumber, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException("주문을 찾을 수 없습니다.")
                );

        Payment payment = paymentRepository
                .findByOrderId(order.getId())
                .orElseThrow(() ->
                        new IllegalArgumentException("결제 정보를 찾을 수 없습니다.")
                );

        return PaymentResponse.from(payment);
    }

    // 4. 결제 취소
    @Transactional
    public PaymentResponse cancelPayment(
            Long memberId,
            String orderNumber,
            String cancelReason
    ) {

        if (cancelReason == null || cancelReason.isBlank()) {
            throw new IllegalArgumentException("취소 사유가 필요합니다.");
        }

        Order order = orderRepository
                .findByOrderNumberAndMemberId(orderNumber, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException("주문을 찾을 수 없습니다.")
                );

        Payment payment = paymentRepository
                .findByOrderId(order.getId())
                .orElseThrow(() ->
                        new IllegalArgumentException("결제 정보를 찾을 수 없습니다.")
                );

        if (order.getStatus() != OrderStatus.PAID) {
            throw new IllegalStateException(
                    "결제가 완료된 주문만 취소할 수 있습니다."
            );
        }

        if (payment.getStatus() != PaymentStatus.DONE) {
            throw new IllegalStateException(
                    "승인 완료된 결제만 취소할 수 있습니다."
            );
        }

        if (payment.getPaymentKey() == null) {
            throw new IllegalStateException("결제 키가 존재하지 않습니다.");
        }

        // Toss 결제 취소 API 호출
        TossCancelResponse tossResponse = restClient.post()
                .uri(
                        "/v1/payments/{paymentKey}/cancel",
                        payment.getPaymentKey()
                )
                .headers(headers -> headers.setBasicAuth(secretKey, ""))
                .contentType(MediaType.APPLICATION_JSON)
                .body(new TossCancelRequest(cancelReason))
                .retrieve()
                .body(TossCancelResponse.class);

        if (tossResponse == null
                || !"CANCELED".equals(tossResponse.status())) {
            throw new IllegalStateException(
                    "토스 결제 취소 결과가 올바르지 않습니다."
            );
        }

        // Payment 취소 완료
        payment.cancelPayment();

        // Order 취소 및 재고 복구
        orderService.cancelPaidOrder(order);

        return PaymentResponse.from(payment);
    }

    // Toss 결제 승인 요청 DTO
    private record TossConfirmRequest(
            String paymentKey,
            String orderId,
            Long amount
    ) {
    }

    // Toss 결제 승인 응답 DTO
    private record TossPaymentResponse(
            String status,
            Long totalAmount,
            String method,
            TossReceipt receipt
    ) {
    }

    private record TossReceipt(
            String url
    ) {
    }

    // Toss 결제 취소 요청 DTO
    private record TossCancelRequest(
            String cancelReason
    ) {
    }

    // Toss 결제 취소 응답 DTO
    private record TossCancelResponse(
            String status
    ) {
    }
}
