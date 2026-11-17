
package com.gtec.mall.product.controller;

import com.gtec.mall.product.dto.ProductRequest;
import com.gtec.mall.product.dto.ProductResponse;
import com.gtec.mall.product.dto.ProductStatusRequest;
import com.gtec.mall.product.dto.ProductUpdateRequest;
import com.gtec.mall.product.service.ProductService;
import com.gtec.mall.security.JwtAuth;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/products")
@RequiredArgsConstructor
public class AdminProductRestController {

    private final ProductService productService;

    // 관리자 권한 확인
    private void requireAdmin() {
        if (!JwtAuth.isAdmin()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "관리자 권한이 필요합니다."
            );
        }
    }

    // 상품 등록
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse register(
            @Valid @RequestBody ProductRequest request
    ) {
        requireAdmin();
        return productService.register(request);
    }

    // 상품 정보 수정
    @PatchMapping("/{productId}")
    @ResponseStatus(HttpStatus.OK)
    public ProductResponse update(
            @PathVariable Long productId,
            @Valid @RequestBody ProductUpdateRequest request
    ) {
        requireAdmin();
        return productService.update(productId, request);
    }

    // 상품 판매 상태 변경
    @PatchMapping("/{productId}/status")
    @ResponseStatus(HttpStatus.OK)
    public ProductResponse updateStatus(
            @PathVariable Long productId,
            @Valid @RequestBody ProductStatusRequest request
    ) {
        requireAdmin();
        return productService.statusUpdate(productId, request);
    }

    // 상품 삭제 (논리 삭제)
    @DeleteMapping("/{productId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            @PathVariable Long productId
    ) {
        requireAdmin();
        productService.delete(productId);
    }
}
