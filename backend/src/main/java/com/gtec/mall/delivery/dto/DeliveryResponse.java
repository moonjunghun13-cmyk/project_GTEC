
package com.gtec.mall.delivery.dto;

import com.gtec.mall.delivery.domain.Delivery;
import com.gtec.mall.delivery.domain.DeliveryStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record DeliveryResponse(
        Long deliveryId,
        Long orderId,
        String carrierCode,
        String carrierName,
        String invoiceNumber,
        DeliveryStatus status,
        String shippingName,
        String shippingPhone,
        String shippingZipcode,
        String shippingAddress1,
        String shippingAddress2,
        String deliveryMemo,
        LocalDateTime shippedAt,
        LocalDateTime deliveredAt,
        LocalDate estimatedAt
) {
    public static DeliveryResponse from(Delivery delivery) {
        return new DeliveryResponse(
                delivery.getId(),
                delivery.getOrder().getId(),
                delivery.getCarrierCode(),
                delivery.getCarrierName(),
                delivery.getInvoiceNumber(),
                delivery.getStatus(),
                delivery.getShippingName(),
                delivery.getShippingPhone(),
                delivery.getShippingZipcode(),
                delivery.getShippingAddress1(),
                delivery.getShippingAddress2(),
                delivery.getDeliveryMemo(),
                delivery.getShippedAt(),
                delivery.getDeliveredAt(),
                delivery.getEstimatedAt()
        );
    }
}
