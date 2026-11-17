package com.gtec.mall.product.dto;

import com.gtec.mall.product.domain.Category;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductCategoryRequest {

    @NotNull
    private Category category;
}
