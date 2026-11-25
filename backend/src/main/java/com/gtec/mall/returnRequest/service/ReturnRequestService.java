
package com.gtec.mall.returnRequest.service;

import com.gtec.mall.delivery.domain.Delivery;
import com.gtec.mall.delivery.domain.DeliveryStatus;
import com.gtec.mall.delivery.repository.DeliveryRepository;
import com.gtec.mall.order.domain.Order;
import com.gtec.mall.order.domain.OrderStatus;
import com.gtec.mall.order.repository.OrderRepository;
import com.gtec.mall.orderItem.domain.OrderItem;
import com.gtec.mall.orderItem.repository.OrderItemRepository;
import com.gtec.mall.returnRequest.domain.ReturnRequest;
import com.gtec.mall.returnRequest.domain.ReturnStatus;
import com.gtec.mall.returnRequest.dto.ReturnRequestCreateRequest;
import com.gtec.mall.returnRequest.dto.ReturnRequestProcessRequest;
import com.gtec.mall.returnRequest.dto.ReturnRequestResponse;
import com.gtec.mall.returnRequest.repository.ReturnRequestRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReturnRequestService {

    private final ReturnRequestRepository returnRequestRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final DeliveryRepository deliveryRepository;

    // 1. 반품 신청
    @Transactional
    public ReturnRequestResponse requestReturn(
            Long memberId,
            Long orderId,
            ReturnRequestCreateRequest request
    ) {
        // 본인 주문 확인
        Order order = orderRepository
                .findByIdAndMemberId(orderId, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException("주문을 찾을 수 없습니다.")
                );

        // 배송 완료 여부 확인
        Delivery delivery = deliveryRepository
                .findByOrderIdAndOrderMemberId(orderId, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException("배송 정보를 찾을 수 없습니다.")
                );

        if (delivery.getStatus() != DeliveryStatus.COMPLETED
                || order.getStatus() != OrderStatus.DELIVERED) {
            throw new IllegalStateException(
                    "배송 완료된 주문만 반품 신청할 수 있습니다."
            );
        }

        // 반품 수량 확인
        if (request.quantity() <= 0) {
            throw new IllegalArgumentException(
                    "반품 수량은 1개 이상이어야 합니다."
            );
        }

        // 주문 상품 확인
        OrderItem orderItem = orderItemRepository
                .findByIdAndOrderId(request.orderItemId(), orderId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "해당 주문에 포함된 상품이 아닙니다."
                        )
                );

        // 반품 사유 확인
        if (request.reason() == null || request.reason().isBlank()) {
            throw new IllegalArgumentException(
                    "반품 사유를 입력해야 합니다."
            );
        }

        // 기존 반품 신청 수량 확인
        List<ReturnRequest> existingRequests =
                returnRequestRepository.findAllByOrderItemId(orderItem.getId());

        int alreadyRequested = existingRequests.stream()
                .filter(returnRequest ->
                        returnRequest.getStatus() != ReturnStatus.REJECTED
                )
                .mapToInt(ReturnRequest::getQuantity)
                .reduce(0, Math::addExact);

        int remainingQuantity =
                orderItem.getQuantity() - alreadyRequested;

        if (request.quantity() > remainingQuantity) {
            throw new IllegalStateException(
                    "반품 가능한 수량을 초과했습니다."
            );
        }

        ReturnRequest returnRequest = ReturnRequest.builder()
                .order(order)
                .orderItem(orderItem)
                .quantity(request.quantity())
                .reason(request.reason())
                .status(ReturnStatus.REQUESTED)
                .build();

        return ReturnRequestResponse.from(
                returnRequestRepository.save(returnRequest)
        );
    }

    // 2. 회원의 특정 주문 반품 내역 조회
    public List<ReturnRequestResponse> getMyReturns(
            Long memberId,
            Long orderId
    ) {
        orderRepository.findByIdAndMemberId(orderId, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException("주문을 찾을 수 없습니다.")
                );

        return returnRequestRepository
                .findAllByOrderIdAndOrderMemberIdOrderByRequestedAtDesc(
                        orderId,
                        memberId
                )
                .stream()
                .map(ReturnRequestResponse::from)
                .toList();
    }

    // 3. 관리자 전체 반품 내역 조회
    public List<ReturnRequestResponse> getAllReturns() {
        return returnRequestRepository
                .findAllByOrderByRequestedAtDesc()
                .stream()
                .map(ReturnRequestResponse::from)
                .toList();
    }

    // 4. 관리자 반품 상태 처리
    @Transactional
    public ReturnRequestResponse processReturn(
            Long returnId,
            ReturnRequestProcessRequest request
    ) {
        ReturnRequest returnRequest = returnRequestRepository
                .findById(returnId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "반품 신청 내역을 찾을 수 없습니다."
                        )
                );

        if (request.status() == null) {
            throw new IllegalArgumentException(
                    "변경할 반품 상태가 필요합니다."
            );
        }

        switch (request.status()) {
            case APPROVED -> {
                if (request.refundAmount() == null
                        || request.refundAmount() <= 0) {
                    throw new IllegalArgumentException(
                            "환불 금액은 1원 이상이어야 합니다."
                    );
                }

                returnRequest.approve(request.refundAmount());
            }

            case REJECTED -> returnRequest.reject();

            case REFUNDED -> returnRequest.markAsRefunded();

            default -> throw new IllegalArgumentException(
                    "변경할 수 없는 반품 상태입니다."
            );
        }

        return ReturnRequestResponse.from(returnRequest);
    }
}
