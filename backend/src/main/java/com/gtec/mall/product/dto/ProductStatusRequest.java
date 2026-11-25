package com.gtec.mall.product.dto;

import com.gtec.mall.product.domain.Status;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductStatusRequest {

    @NotNull
    private Status status;
}
