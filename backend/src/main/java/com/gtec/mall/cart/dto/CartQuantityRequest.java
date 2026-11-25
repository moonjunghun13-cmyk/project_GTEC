
package com.gtec.mall.cart.dto;

import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CartQuantityRequest {

    @Min(1)
    private int quantity;
}
