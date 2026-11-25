
package com.gtec.mall.delivery.service;

import com.gtec.mall.delivery.domain.Delivery;
import com.gtec.mall.delivery.domain.DeliveryStatus;
import com.gtec.mall.delivery.dto.DeliveryResponse;
import com.gtec.mall.delivery.dto.DeliveryStatusRequest;
import com.gtec.mall.delivery.dto.DeliveryUpdateRequest;
import com.gtec.mall.delivery.repository.DeliveryRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;

    // 1. 회원 배송 정보 조회
    public DeliveryResponse getMyDelivery(Long memberId, Long orderId) {

        Delivery delivery = deliveryRepository
                .findByOrderIdAndOrderMemberId(orderId, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException("배송 정보를 찾을 수 없습니다.")
                );

        return DeliveryResponse.from(delivery);
    }

    // 2. 관리자 배송 정보 조회
    public DeliveryResponse getDelivery(Long orderId) {

        Delivery delivery = deliveryRepository
                .findByOrderId(orderId)
                .orElseThrow(() ->
                        new IllegalArgumentException("배송 정보를 찾을 수 없습니다.")
                );

        return DeliveryResponse.from(delivery);
    }

    // 3. 택배사 및 운송장 정보 등록·수정
    @Transactional
    public DeliveryResponse updateDelivery(
            Long orderId,
            DeliveryUpdateRequest request
    ) {

        Delivery delivery = deliveryRepository.findByOrderId(orderId)
                .orElseThrow(() ->
                        new IllegalArgumentException("배송 정보를 찾을 수 없습니다.")
                );

        if (delivery.getStatus() != DeliveryStatus.PREPARING) {
            throw new IllegalStateException(
                    "배송 준비 중인 상태에서만 택배 정보를 수정할 수 있습니다."
            );
        }

        delivery.updateDeliveryInfo(
                request.carrierCode(),
                request.carrierName(),
                request.invoiceNumber()
        );

        if (request.estimatedAt() != null) {
            delivery.updateEstimatedAt(request.estimatedAt());
        }

        return DeliveryResponse.from(delivery);
    }

    // 4. 배송 상태 및 예상 배송일 변경
    @Transactional
    public DeliveryResponse updateDeliveryStatus(
            Long orderId,
            DeliveryStatusRequest request
    ) {

        Delivery delivery = deliveryRepository.findByOrderId(orderId)
                .orElseThrow(() ->
                        new IllegalArgumentException("배송 정보를 찾을 수 없습니다.")
                );

        DeliveryStatus newStatus = request.status();

        if (newStatus == DeliveryStatus.DELIVERING) {

            delivery.startDelivery();
            delivery.getOrder().markAsShipped();

        } else if (newStatus == DeliveryStatus.COMPLETED) {

            delivery.completeDelivery();
            delivery.getOrder().markAsDelivered();

        } else {
            throw new IllegalArgumentException(
                    "해당 배송 상태로 변경할 수 없습니다."
            );
        }

        if (request.estimatedAt() != null) {
            delivery.updateEstimatedAt(request.estimatedAt());
        }

        return DeliveryResponse.from(delivery);
    }
}
