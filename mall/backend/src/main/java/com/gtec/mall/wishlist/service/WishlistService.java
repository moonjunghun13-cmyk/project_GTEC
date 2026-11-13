package com.gtec.mall.wishlist.service;

import com.gtec.mall.wishlist.domain.Wishlist;
import com.gtec.mall.wishlist.dto.WishlistResponse;
import com.gtec.mall.wishlist.repository.WishlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WishlistService {
    private final WishlistRepository wishlistRepository;

    // 1. 목록 조회
    public List<WishlistResponse> findByMemberId(Long memberId) {
        return wishlistRepository.findByMemberId(memberId)
                .stream()
                .map(WishlistResponse::from)
                .toList();
    }

    // 2. 찜 등록
    @Transactional
    public WishlistResponse addWishlist(Long memberId, Long productId) {
        // 이미 찜한 상품인지 확인
        return wishlistRepository
            .findByMemberIdAndProductId(memberId, productId)
            .map(WishlistResponse::from)
            .orElseGet(() -> {Wishlist wishlist = Wishlist.builder()
                .memberId(memberId)
                .productId(productId)
                .build();

                Wishlist savedWishlist =
                    wishlistRepository.save(wishlist);
                    return WishlistResponse.from(savedWishlist);
                });
    }

    // 3. 찜 취소
    @Transactional
    public void removeWishlist(Long memberId, Long productId) {
        wishlistRepository.deleteByMemberIdAndProductId(memberId, productId);
    }

    // 4. 찜 여부 확인
    public boolean isWished(Long memberId, Long productId) {
        return wishlistRepository.existsByMemberIdAndProductId(memberId, productId);
    }

    // 5. 회원별 찜 개수 조회
    public long countByMemberId(Long memberId) {
        return wishlistRepository.countByMemberId(memberId);
    }
}
