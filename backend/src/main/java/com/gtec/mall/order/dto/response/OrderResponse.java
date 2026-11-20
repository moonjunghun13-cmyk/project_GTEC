
package com.gtec.mall.order.dto.response;

import com.gtec.mall.delivery.domain.Delivery;
import com.gtec.mall.order.domain.Order;
import com.gtec.mall.order.domain.OrderStatus;
import com.gtec.mall.order.domain.PaymentMethod;
import com.gtec.mall.orderItem.dto.OrderItemResponse;

import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(

        Long orderId,
        String orderNumber,
        OrderStatus status,

        Long subTotal,
        Long shippingFee,
        Long discountAmount,
        Long totalAmount,

        PaymentMethod paymentMethod,
        LocalDateTime paidAt,
        LocalDateTime createdAt,

        String shippingName,
        String shippingPhone,
        String shippingZipcode,
        String shippingAddress1,
        String shippingAddress2,

        List<OrderItemResponse> items

) {

    public static OrderResponse from(Order order) {

        Delivery delivery = order.getDelivery();

        return new OrderResponse(
                order.getId(),
                order.getOrderNumber(),
                order.getStatus(),

                order.getSubTotal(),
                order.getShippingFee(),
                order.getDiscountAmount(),
                order.getTotalAmount(),

                order.getPaymentMethod(),
                order.getPaidAt(),
                order.getCreatedAt(),

                delivery != null ? delivery.getShippingName() : null,
                delivery != null ? delivery.getShippingPhone() : null,
                delivery != null ? delivery.getShippingZipcode() : null,
                delivery != null ? delivery.getShippingAddress1() : null,
                delivery != null ? delivery.getShippingAddress2() : null,

                order.getOrderItems().stream()
                        .map(OrderItemResponse::from)
                        .toList()
        );
    }
}
