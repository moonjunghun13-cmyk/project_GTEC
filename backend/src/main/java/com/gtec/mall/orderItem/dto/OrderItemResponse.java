package com.gtec.mall.orderItem.dto;

import com.gtec.mall.orderItem.domain.OrderItem;

public record OrderItemResponse(

        Long orderItemId,
        Long productId,
        Integer quantity,
        Long unitPrice,
        Long totalPrice

) {
    public static OrderItemResponse from(OrderItem orderItem) {
        return new OrderItemResponse(
                orderItem.getId(),
                orderItem.getProduct().getId(),
                orderItem.getQuantity(),
                orderItem.getUnitPrice(),
                orderItem.getTotalPrice()
        );
    }
}
