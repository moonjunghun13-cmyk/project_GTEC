
package com.gtec.mall.wishlist.repository;

import com.gtec.mall.wishlist.domain.Wishlist;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<Wishlist, Long> {

    @EntityGraph(attributePaths = "product")
    List<Wishlist> findAllByMemberIdOrderByCreatedAtDesc(Long memberId);

    @EntityGraph(attributePaths = "product")
    Optional<Wishlist> findByMemberIdAndProductId(
            Long memberId,
            Long productId
    );
}
