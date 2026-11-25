package com.gtec.mall.product.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ImageRequest {

    @NotBlank
    private String imageUrl;
}
