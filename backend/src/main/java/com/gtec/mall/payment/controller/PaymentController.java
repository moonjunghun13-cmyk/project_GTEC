
package com.gtec.mall.payment.controller;

import com.gtec.mall.payment.dto.PaymentConfirmRequest;
import com.gtec.mall.payment.dto.PaymentRequest;
import com.gtec.mall.payment.dto.PaymentResponse;
import com.gtec.mall.payment.service.PaymentService;
import com.gtec.mall.security.JwtAuth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // 1. 결제 준비
    @PostMapping("/ready")
    public ResponseEntity<PaymentResponse> readyPayment(
            @Valid @RequestBody PaymentRequest request
    ) {
        Long memberId = JwtAuth.memberId();

        return ResponseEntity.ok(
                paymentService.readyPayment(memberId, request)
        );
    }

    // 2. 결제 승인
    @PostMapping("/confirm")
    public ResponseEntity<PaymentResponse> confirmPayment(
            @Valid @RequestBody PaymentConfirmRequest request
    ) {
        Long memberId = JwtAuth.memberId();

        return ResponseEntity.ok(
                paymentService.confirmPayment(memberId, request)
        );
    }

    // 3. 내 결제 정보 조회
    @GetMapping("/{orderNumber}")
    public ResponseEntity<PaymentResponse> getMyPayment(
            @PathVariable String orderNumber
    ) {
        Long memberId = JwtAuth.memberId();

        return ResponseEntity.ok(
                paymentService.getMyPayment(memberId, orderNumber)
        );
    }

    // 4. 결제 취소
    @PostMapping("/{orderNumber}/cancel")
    public ResponseEntity<PaymentResponse> cancelPayment(
            @PathVariable String orderNumber,
            @RequestParam String cancelReason
    ) {
        Long memberId = JwtAuth.memberId();

        return ResponseEntity.ok(
                paymentService.cancelPayment(
                        memberId,
                        orderNumber,
                        cancelReason
                )
        );
    }
}
