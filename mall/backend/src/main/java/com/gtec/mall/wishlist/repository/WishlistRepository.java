package com.gtec.mall.wishlist.repository;

import com.gtec.mall.wishlist.domain.Wishlist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Long> {
    // 목록 조회
    List<Wishlist> findByMemberId(Long memberId);

    // 찜 내역 조회
    Optional<Wishlist> findByMemberIdAndProductId(Long memberId, Long productId);

    // 찜 여부 확인
    boolean existsByMemberIdAndProductId(Long memberId, Long productId);

    // 찜 삭제
    void deleteByMemberIdAndProductId(Long memberId, Long ProductId);

    // 회원별 찜 개수 조회
    long countByMemberId(Long memberId);
}
