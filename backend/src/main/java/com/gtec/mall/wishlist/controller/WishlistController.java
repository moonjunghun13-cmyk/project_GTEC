
package com.gtec.mall.wishlist.controller;

import com.gtec.mall.security.JwtAuth;
import com.gtec.mall.wishlist.dto.WishlistResponse;
import com.gtec.mall.wishlist.service.WishlistService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    // 1. 내 찜 목록 조회
    @GetMapping
    public ResponseEntity<List<WishlistResponse>> getMyWishlist() {

        Long memberId = JwtAuth.memberId();

        return ResponseEntity.ok(
                wishlistService.getMyWishlist(memberId)
        );
    }

    // 2. 찜 등록
    @PostMapping("/{productId}")
    public ResponseEntity<WishlistResponse> addWishlist(
            @PathVariable Long productId
    ) {
        Long memberId = JwtAuth.memberId();

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(wishlistService.addWishlist(memberId, productId));
    }

    // 3. 찜 취소
    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> removeWishlist(
            @PathVariable Long productId
    ) {
        Long memberId = JwtAuth.memberId();

        wishlistService.removeWishlist(memberId, productId);

        return ResponseEntity.noContent().build();
    }
}
