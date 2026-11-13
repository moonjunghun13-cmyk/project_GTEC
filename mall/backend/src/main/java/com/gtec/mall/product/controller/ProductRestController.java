package com.gtec.mall.product.controller;

import com.gtec.mall.config.LoginSession;
import com.gtec.mall.product.dto.ProductRequest;
import com.gtec.mall.product.dto.ProductResponse;
import com.gtec.mall.product.dto.ProductStatusRequest;
import com.gtec.mall.product.dto.ProductUpdateRequest;
import com.gtec.mall.product.service.ProductService;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductRestController {
    private final ProductService productService;

    //관리자 여부 확인
    private boolean isAdmin(HttpSession session) {
        return LoginSession.isAdmin(session);
    }
    // 목록 조회
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ProductResponse> list() {
        return productService.list();
    }
    // 상세 조회
    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public ProductResponse detail(@PathVariable("id") Long id) {
        return productService.detail(id);
    }
    // 상품 등록
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse register(@Valid @RequestBody ProductRequest request, HttpSession session) {
        if (!LoginSession.isAdmin(session)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
        return productService.register(request);
    }

    // 수정
    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public ProductResponse update(@PathVariable("id") Long id, @Valid @RequestBody ProductUpdateRequest request, HttpSession session) {
        if (!LoginSession.isAdmin(session)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
        return productService.update(id, request);
    }

    // 상태 변경
    @PatchMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public ProductResponse update(@PathVariable("id") Long id, @Valid @RequestBody ProductStatusRequest request, HttpSession session) {
        if (!LoginSession.isAdmin(session)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
        return productService.statusUpdate(id, request);
    }


    // 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") Long id, HttpSession session) {
        if (!LoginSession.isAdmin(session)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 접근할 수 있습니다.");
        }
        productService.delete(id);
    }
}
