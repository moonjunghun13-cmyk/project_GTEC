
package com.gtec.mall.cart.controller;

import com.gtec.mall.cart.domain.Cart;
import com.gtec.mall.cart.dto.CartAddRequest;
import com.gtec.mall.cart.dto.CartQuantityRequest;
import com.gtec.mall.cart.dto.CartResponse;
import com.gtec.mall.cart.service.CartService;
import com.gtec.mall.security.JwtAuth;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    // 1. 내 장바구니 조회
    @GetMapping
    public ResponseEntity<List<CartResponse>> getMyCart() {

        Long memberId = JwtAuth.memberId();

        List<CartResponse> response = cartService
                .getMyCart(memberId)
                .stream()
                .map(CartResponse::from)
                .toList();

        return ResponseEntity.ok(response);
    }

    // 2. 장바구니 상품 추가
    @PostMapping("/items")
    public ResponseEntity<CartResponse> addCart(
            @Valid @RequestBody CartAddRequest request
    ) {
        Long memberId = JwtAuth.memberId();

        Cart cart = cartService.addCart(
                memberId,
                request.getProductId(),
                request.getQuantity()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(CartResponse.from(cart));
    }

    // 3. 장바구니 상품 수량 변경
    @PatchMapping("/items/{cartItemId}")
    public ResponseEntity<CartResponse> updateQuantity(
            @PathVariable Long cartItemId,
            @Valid @RequestBody CartQuantityRequest request
    ) {
        Long memberId = JwtAuth.memberId();

        Cart cart = cartService.updateQuantity(
                memberId,
                cartItemId,
                request.getQuantity()
        );

        return ResponseEntity.ok(CartResponse.from(cart));
    }

    // 4. 장바구니 상품 삭제
    @DeleteMapping("/items/{cartItemId}")
    public ResponseEntity<Void> removeCart(
            @PathVariable Long cartItemId
    ) {
        Long memberId = JwtAuth.memberId();

        cartService.removeCart(memberId, cartItemId);

        return ResponseEntity.noContent().build();
    }
}
