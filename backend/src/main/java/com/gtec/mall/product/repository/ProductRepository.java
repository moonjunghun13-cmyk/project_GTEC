
package com.gtec.mall.product.repository;

import com.gtec.mall.product.domain.Product;
import com.gtec.mall.product.domain.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // 고객용: 판매 중지 상품만 제외하고 품절 상품은 포함
    List<Product> findByStatusNotOrderByCreatedAtDesc(Status status);

    // 관리자용: 모든 판매 상태의 상품 조회
    List<Product> findAllByOrderByCreatedAtDesc();
}
