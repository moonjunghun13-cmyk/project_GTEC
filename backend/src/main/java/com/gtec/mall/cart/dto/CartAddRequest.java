
package com.gtec.mall.cart.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CartAddRequest {

    @NotNull
    private Long productId;

    @Min(1)
    private int quantity;
}
