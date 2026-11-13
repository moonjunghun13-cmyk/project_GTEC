package com.gtec.mall.product.dto;

import com.gtec.mall.product.domain.Category;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ProductUpdateRequest {

    private String name;


    private Category category;


    @PositiveOrZero
    private Long stock;


    private String description;


    private String specification;


    @PositiveOrZero
    private Long price;


    private String thumbnailUrl;

    @Valid
    private List<ImageRequest> images;
}
