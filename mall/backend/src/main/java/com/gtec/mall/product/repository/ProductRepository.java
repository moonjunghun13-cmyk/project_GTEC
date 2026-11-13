package com.gtec.mall.product.repository;

import com.gtec.mall.product.domain.Product;
import com.gtec.mall.product.domain.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByStatusNot(Status status);
}
