
package com.gtec.mall.cart.dto;

import com.gtec.mall.cart.domain.Cart;
import com.gtec.mall.product.domain.Status;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class CartResponse {

    private Long cartId;
    private Long productId;
    private String productName;
    private long price;
    private String thumbnailUrl;
    private int quantity;
    private long totalPrice;
    private Status productStatus;
    private LocalDateTime createdAt;

    public static CartResponse from(Cart cart) {
        return CartResponse.builder()
                .cartId(cart.getId())
                .productId(cart.getProduct().getId())
                .productName(cart.getProduct().getName())
                .price(cart.getProduct().getPrice())
                .thumbnailUrl(cart.getProduct().getThumbnailUrl())
                .quantity(cart.getQuantity())
                .totalPrice(
                        cart.getProduct().getPrice() * cart.getQuantity()
                )
                .productStatus(cart.getProduct().getStatus())
                .createdAt(cart.getCreatedAt())
                .build();
    }
}
