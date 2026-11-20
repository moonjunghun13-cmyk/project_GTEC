
package com.gtec.mall.order.controller;

import com.gtec.mall.order.domain.OrderStatus;
import com.gtec.mall.order.dto.request.OrderCancelRequest;
import com.gtec.mall.order.dto.request.OrderRequest;
import com.gtec.mall.order.dto.response.OrderResponse;
import com.gtec.mall.order.service.OrderService;
import com.gtec.mall.security.JwtAuth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    // I. 사용자 주문 API
    // 1. 주문 생성
    @PostMapping("/orders")
    public ResponseEntity<OrderResponse> createOrder(
            @Valid @RequestBody OrderRequest request
    ) {
        Long memberId = JwtAuth.memberId();
        OrderResponse response =
            orderService.createOrder(memberId, request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(response);
    }

    // 2. 내 주문 목록 조회
    @GetMapping("/orders")
    public ResponseEntity<Page<OrderResponse>> getMyOrders(
            @PageableDefault(
                size = 10,
                sort = "createdAt",
                direction = Sort.Direction.DESC
            ) Pageable pageable
    ) {
        Long memberId = JwtAuth.memberId();
        return ResponseEntity.ok(
            orderService.getMyOrders(memberId, pageable)
        );
    }

    // 3. 내 주문 상세 조회
    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderResponse> getMyOrder(
            @PathVariable Long orderId
    ) {
        Long memberId = JwtAuth.memberId();
        return ResponseEntity.ok(
            orderService.getMyOrder(memberId, orderId)
        );
    }

    // 구매 확정
    @PatchMapping("/orders/{orderId}/complete")
    public ResponseEntity<Void> completeMyOrder(
            @PathVariable Long orderId
    ) {
        Long memberId = JwtAuth.memberId();
        orderService.completeMyOrder(memberId, orderId);
        return ResponseEntity.noContent().build();
    }

    // 4. 주문 취소 요청
    @PatchMapping("/orders/{orderId}/cancel")
    public ResponseEntity<Void> requestCancellation(
            @PathVariable Long orderId,
            @Valid @RequestBody OrderCancelRequest request
    ) {
        Long memberId = JwtAuth.memberId();
        orderService.requestCancellation(
            memberId,
            orderId,
            request
        );
        return ResponseEntity.noContent().build();
    }


    // II. 관리자 주문 API
    // 관리자 권한 확인
    private void requireAdmin() {
        if (!JwtAuth.isAdmin()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "관리자 권한이 필요합니다."
            );
        }
    }

    // 5. 전체 주문 조회
    @GetMapping("/admin/orders")
    public ResponseEntity<Page<OrderResponse>> getAllOrders(
        @PageableDefault(
            size = 10,
            sort = "createdAt",
            direction = Sort.Direction.DESC
        ) Pageable pageable
    ) {
        requireAdmin();
        return ResponseEntity.ok(
            orderService.getAllOrders(pageable)
        );
    }

    // 6. 주문 상태별 조회
    @GetMapping("/admin/orders/status")
    public ResponseEntity<Page<OrderResponse>> getOrdersByStatus(
        @RequestParam OrderStatus status,
        @PageableDefault(
            size = 10,
            sort = "createdAt",
            direction = Sort.Direction.DESC
        ) Pageable pageable
    ) {
        requireAdmin();
        return ResponseEntity.ok(
            orderService.getOrdersByStatus(status, pageable)
        );
    }

    @PatchMapping("/admin/orders/{orderId}/prepare")
    public ResponseEntity<Void> startPreparing(
            @PathVariable Long orderId
    ) {
        requireAdmin();
        orderService.startPreparing(orderId);
        return ResponseEntity.noContent().build();
    }
}
