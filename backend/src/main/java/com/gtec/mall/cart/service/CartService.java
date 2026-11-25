
package com.gtec.mall.cart.service;

import com.gtec.mall.cart.domain.Cart;
import com.gtec.mall.cart.repository.CartRepository;
import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.repository.MemberRepository;
import com.gtec.mall.product.domain.Product;
import com.gtec.mall.product.domain.Status;
import com.gtec.mall.product.repository.ProductRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CartService {

    private final CartRepository cartRepository;
    private final MemberRepository memberRepository;
    private final ProductRepository productRepository;

    // 내 장바구니 조회
    public List<Cart> getMyCart(Long memberId) {
        return cartRepository
                .findAllByMemberIdOrderByCreatedAtDesc(memberId);
    }

    // 장바구니 상품 추가
    @Transactional
    public Cart addCart(Long memberId, Long productId, int quantity) {
        validateQuantity(quantity);

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException("회원을 찾을 수 없습니다.")
                );

        Product product = productRepository.findById(productId)
                .orElseThrow(() ->
                        new IllegalArgumentException("상품을 찾을 수 없습니다.")
                );

        validateProduct(product, quantity);

        // 이미 장바구니에 있는 상품이면 기존 수량에 합산
        return cartRepository
                .findByMemberIdAndProductId(memberId, productId)
                .map(cart -> {
                    int newQuantity;

                    try {
                        newQuantity = Math.addExact(
                                cart.getQuantity(),
                                quantity
                        );
                    } catch (ArithmeticException e) {
                        throw new IllegalArgumentException(
                                "장바구니 수량이 허용 범위를 초과했습니다."
                        );
                    }

                    validateProduct(product, newQuantity);
                    cart.changeQuantity(newQuantity);

                    return cart;
                })
                .orElseGet(() ->
                        cartRepository.save(
                                Cart.create(member, product, quantity)
                        )
                );
    }

    // 장바구니 상품 수량 변경
    @Transactional
    public Cart updateQuantity(
            Long memberId,
            Long cartId,
            int quantity
    ) {
        validateQuantity(quantity);

        Cart cart = cartRepository
                .findByIdAndMemberId(cartId, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "장바구니 상품을 찾을 수 없습니다."
                        )
                );

        validateProduct(cart.getProduct(), quantity);

        cart.changeQuantity(quantity);

        return cart;
    }

    // 장바구니 상품 삭제
    @Transactional
    public void removeCart(Long memberId, Long cartId) {
        Cart cart = cartRepository
                .findByIdAndMemberId(cartId, memberId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "장바구니 상품을 찾을 수 없습니다."
                        )
                );

        cartRepository.delete(cart);
    }

    // 장바구니 비우기
    @Transactional
    public void clearCart(Long memberId) {
        cartRepository.deleteAllByMemberId(memberId);
    }

    // 수량 검증
    private void validateQuantity(int quantity) {
        if (quantity < 1) {
            throw new IllegalArgumentException(
                    "장바구니 수량은 1개 이상이어야 합니다."
            );
        }
    }

    // 상품 판매 상태 및 재고 검증
    private void validateProduct(Product product, int quantity) {
        if (product.getStatus() == Status.SOLD_OUT) {
            throw new IllegalStateException(
                    "품절된 상품입니다: " + product.getName()
            );
        }

        if (product.getStatus() == Status.INACTIVE) {
            throw new IllegalStateException(
                    "판매 중지된 상품입니다: " + product.getName()
            );
        }

        if (product.getStock() < quantity) {
            throw new IllegalStateException(
                    "상품 재고가 부족합니다: " + product.getName()
            );
        }
    }
}
