
package com.gtec.mall.wishlist.dto;

import com.gtec.mall.product.domain.Status;
import com.gtec.mall.wishlist.domain.Wishlist;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class WishlistResponse {

    private Long wishlistId;
    private Long productId;
    private String productName;
    private long price;
    private String thumbnailUrl;
    private Status productStatus;
    private LocalDateTime createdAt;

    public static WishlistResponse from(Wishlist wishlist) {
        return WishlistResponse.builder()
                .wishlistId(wishlist.getId())
                .productId(wishlist.getProduct().getId())
                .productName(wishlist.getProduct().getName())
                .price(wishlist.getProduct().getPrice())
                .thumbnailUrl(wishlist.getProduct().getThumbnailUrl())
                .productStatus(wishlist.getProduct().getStatus())
                .createdAt(wishlist.getCreatedAt())
                .build();
    }
}
