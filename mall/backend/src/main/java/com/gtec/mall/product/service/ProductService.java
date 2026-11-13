package com.gtec.mall.product.service;


import com.gtec.mall.product.domain.Image;
import com.gtec.mall.product.domain.Product;
import com.gtec.mall.product.domain.Status;
import com.gtec.mall.product.dto.*;
import com.gtec.mall.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {
    private final ProductRepository productRepository;

    // 목록 조회
    @Transactional(readOnly = true)
    public List<ProductResponse> list() {
        return productRepository.findByStatusNot(Status.INACTIVE)
                .stream()
                .map(ProductResponse::from)
                .toList();
    }

    // 상세 조회
    @Transactional(readOnly = true)
    public ProductResponse detail(Long id) {
        Product product = productRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 상품을 찾을 수 없습니다."));
        if (product.getStatus() == Status.INACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "해당 상품을 찾을 수 없습니다.");
        }
        return ProductResponse.from(product);
    }

    // 상품 등록 + 이미지 등록
    public ProductResponse register(ProductRequest request) {
        Product product = new Product();
        product.setName(request.getName());
        product.setCategory(request.getCategory());
        product.setStock(request.getStock());
        product.setDescription(request.getDescription());
        product.setSpecification(request.getSpecification());
        product.setPrice(request.getPrice());
        product.setThumbnailUrl(request.getThumbnailUrl());
        // 상품 이미지 등록
        if (request.getImages() != null) {
            int order = 0;
            for (ImageRequest req : request.getImages()) {
                Image image = Image.builder()
                        .imageUrl(req.getImageUrl())
                        .isPrimary(order == 0)
                        .sortOrder(order++)
                        .build();
                product.addImage(image);
            }
        }
        return ProductResponse.from(productRepository.save(product));
    }

    // 수정
    public ProductResponse update(Long id, ProductUpdateRequest request) {
        Product product = productRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 상품을 찾을 수 없습니다."));
        if(request.getName() != null) {
            if(request.getName().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 상품을 찾을 수 없습니다.");
            }
            product.setName(request.getName());
        }
        if(request.getCategory() != null) {
            product.setCategory(request.getCategory());
        }
        if(request.getStock() != null) {
            if(request.getStock() < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "값을 다시 입력해 주세요");
            }
            product.setStock(request.getStock());
        }
        if(request.getDescription() != null) {
            if(request.getDescription().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 상품을 찾을 수 없습니다.");
            }
            product.setDescription(request.getDescription());
        }
        if(request.getSpecification() != null) {
            if(request.getSpecification().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "해당 상품을 찾을 수 없습니다.");
            }
            product.setSpecification(request.getSpecification());
        }
        if(request.getPrice() != null) {
            if(request.getPrice() < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "값을 다시 입력해 주세요");
            }
            product.setPrice(request.getPrice());
        }
        // 썸네일 수정
        if (request.getThumbnailUrl() != null) {
            product.setThumbnailUrl(request.getThumbnailUrl());
        }
        // 이미지 수정
        if (request.getImages() != null) {
            // 잘못된 이미지 URL 검사
            for (ImageRequest req : request.getImages()) {
                if (req == null || req.getImageUrl() == null
                        || req.getImageUrl().isBlank()) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST, "이미지 URL을 다시 확인해 주세요.");
                }
            }
            // 기존 이미지 제거
            product.clearImages();
            int order = 0;
            // 새 이미지 등록
            for (ImageRequest req : request.getImages()) {
                Image image = Image.builder()
                        .imageUrl(req.getImageUrl())
                        .isPrimary(order == 0)
                        .sortOrder(order++)
                        .build();
                product.addImage(image);
            }
        }
        return ProductResponse.from(product);
    }

    // 상태 변경
    public ProductResponse statusUpdate(Long id, ProductStatusRequest request) {
        Product product = productRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 상품을 찾을 수 없습니다."));
        product.setStatus(request.getStatus());
        return ProductResponse.from(product);
    }

    // 삭제
    public void delete(Long id) {
        Product product = productRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "해당 상품을 찾을 수 없습니다."));
        product.setStatus(Status.INACTIVE);
    }

}
