
package com.gtec.mall.product.controller;

import com.gtec.mall.product.dto.ProductResponse;
import com.gtec.mall.product.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductRestController {

    private final ProductService productService;

    // 상품 목록 조회
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ProductResponse> list() {
        return productService.list();
    }

    // 상품 상세 조회
    @GetMapping("/{productId}")
    @ResponseStatus(HttpStatus.OK)
    public ProductResponse detail(
            @PathVariable Long productId
    ) {
        return productService.detail(productId);
    }
}
