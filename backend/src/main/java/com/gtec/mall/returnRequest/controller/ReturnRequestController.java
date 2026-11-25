
package com.gtec.mall.returnRequest.controller;

import com.gtec.mall.returnRequest.dto.ReturnRequestCreateRequest;
import com.gtec.mall.returnRequest.dto.ReturnRequestProcessRequest;
import com.gtec.mall.returnRequest.dto.ReturnRequestResponse;
import com.gtec.mall.returnRequest.service.ReturnRequestService;
import com.gtec.mall.security.JwtAuth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ReturnRequestController {

    private final ReturnRequestService returnRequestService;

    // 1. 반품 신청
    @PostMapping("/orders/{orderId}/returns")
    public ResponseEntity<ReturnRequestResponse> requestReturn(
            @PathVariable Long orderId,
            @Valid @RequestBody ReturnRequestCreateRequest request
    ) {
        Long memberId = JwtAuth.memberId();

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(returnRequestService.requestReturn(
                        memberId,
                        orderId,
                        request
                ));
    }

    // 2. 내 주문의 반품 내역 조회
    @GetMapping("/orders/{orderId}/returns")
    public ResponseEntity<List<ReturnRequestResponse>> getMyReturns(
            @PathVariable Long orderId
    ) {
        Long memberId = JwtAuth.memberId();

        return ResponseEntity.ok(
                returnRequestService.getMyReturns(memberId, orderId)
        );
    }

    // 관리자 권한 확인
    private void requireAdmin() {
        if (!JwtAuth.isAdmin()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "관리자 권한이 필요합니다."
            );
        }
    }

    // 3. 관리자 전체 반품 내역 조회
    @GetMapping("/admin/returns")
    public ResponseEntity<List<ReturnRequestResponse>> getAllReturns() {
        requireAdmin();

        return ResponseEntity.ok(
                returnRequestService.getAllReturns()
        );
    }

    // 4. 반품 승인·거절·환불 처리
    @PatchMapping("/admin/returns/{returnId}")
    public ResponseEntity<ReturnRequestResponse> processReturn(
            @PathVariable Long returnId,
            @Valid @RequestBody ReturnRequestProcessRequest request
    ) {
        requireAdmin();

        return ResponseEntity.ok(
                returnRequestService.processReturn(returnId, request)
        );
    }
}
