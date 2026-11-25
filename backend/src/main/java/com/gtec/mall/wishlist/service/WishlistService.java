
package com.gtec.mall.wishlist.service;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.repository.MemberRepository;
import com.gtec.mall.product.domain.Product;
import com.gtec.mall.product.domain.Status;
import com.gtec.mall.product.repository.ProductRepository;
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
    private final MemberRepository memberRepository;
    private final ProductRepository productRepository;

    // 내 찜 목록 조회
    public List<WishlistResponse> getMyWishlist(Long memberId) {
        return wishlistRepository
                .findAllByMemberIdOrderByCreatedAtDesc(memberId)
                .stream()
                .map(WishlistResponse::from)
                .toList();
    }

    // 찜 등록
    @Transactional
    public WishlistResponse addWishlist(Long memberId, Long productId) {

        // 이미 찜한 상품인지 확인
        var existing = wishlistRepository
                .findByMemberIdAndProductId(memberId, productId);

        if (existing.isPresent()) {
            return WishlistResponse.from(existing.get());
        }

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException("회원을 찾을 수 없습니다.")
                );

        Product product = productRepository.findById(productId)
                .orElseThrow(() ->
                        new IllegalArgumentException("상품을 찾을 수 없습니다.")
                );

        // 판매 중지 상품은 신규 찜 등록 불가
        // 품절 상품(SOLD_OUT)은 찜 등록 가능
        if (product.getStatus() == Status.INACTIVE) {
            throw new IllegalArgumentException(
                    "판매 중지된 상품은 찜할 수 없습니다."
            );
        }

        Wishlist wishlist = Wishlist.create(member, product);

        return WishlistResponse.from(
                wishlistRepository.save(wishlist)
        );
    }

    // 찜 취소
    @Transactional
    public void removeWishlist(Long memberId, Long productId) {

        Wishlist wishlist = wishlistRepository
                .findByMemberIdAndProductId(memberId, productId)
                .orElseThrow(() ->
                        new IllegalArgumentException("찜 내역을 찾을 수 없습니다.")
                );

        wishlistRepository.delete(wishlist);
    }
}
