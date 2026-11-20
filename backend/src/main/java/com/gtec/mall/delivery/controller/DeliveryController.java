
package com.gtec.mall.delivery.controller;

import com.gtec.mall.delivery.dto.DeliveryResponse;
import com.gtec.mall.delivery.dto.DeliveryStatusRequest;
import com.gtec.mall.delivery.dto.DeliveryUpdateRequest;
import com.gtec.mall.delivery.service.DeliveryService;
import com.gtec.mall.security.JwtAuth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class DeliveryController {

    private final DeliveryService deliveryService;


    // I. 사용자 배송 API

    // 1. 내 배송 정보 조회
    @GetMapping("/orders/{orderId}/delivery")
    public ResponseEntity<DeliveryResponse> getMyDelivery(
            @PathVariable Long orderId
    ) {
        Long memberId = JwtAuth.memberId();

        return ResponseEntity.ok(
                deliveryService.getMyDelivery(memberId, orderId)
        );
    }


    // II. 관리자 배송 API

    // 관리자 권한 확인
    private void requireAdmin() {
        if (!JwtAuth.isAdmin()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "관리자 권한이 필요합니다."
            );
        }
    }


    // 2. 배송 정보 조회
    @GetMapping("/admin/orders/{orderId}/delivery")
    public ResponseEntity<DeliveryResponse> getDelivery(
            @PathVariable Long orderId
    ) {
        requireAdmin();

        return ResponseEntity.ok(
                deliveryService.getDelivery(orderId)
        );
    }


    // 3. 택배사 및 운송장 정보 등록·수정
    @PutMapping("/admin/orders/{orderId}/delivery")
    public ResponseEntity<DeliveryResponse> updateDelivery(
            @PathVariable Long orderId,
            @Valid @RequestBody DeliveryUpdateRequest request
    ) {
        requireAdmin();

        return ResponseEntity.ok(
                deliveryService.updateDelivery(orderId, request)
        );
    }


    // 4. 배송 상태 및 예상 배송일 변경
    @PatchMapping("/admin/orders/{orderId}/delivery")
    public ResponseEntity<DeliveryResponse> updateDeliveryStatus(
            @PathVariable Long orderId,
            @Valid @RequestBody DeliveryStatusRequest request
    ) {
        requireAdmin();

        return ResponseEntity.ok(
                deliveryService.updateDeliveryStatus(orderId, request)
        );
    }

}
