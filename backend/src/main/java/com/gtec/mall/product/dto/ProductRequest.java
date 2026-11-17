package com.gtec.mall.product.dto;

import com.gtec.mall.product.domain.Category;
import com.gtec.mall.product.domain.Image;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class ProductRequest {

    @NotBlank
    private String name;

    @NotNull
    private Category category;

    @NotNull
    @PositiveOrZero
    private Long stock;

    @NotBlank
    private String description;

    @NotBlank
    private String specification;

    @NotNull
    @PositiveOrZero
    private Long price;

    @NotBlank
    private String thumbnailUrl;

    @Valid
    @NotEmpty
    private List<ImageRequest> images;
}
