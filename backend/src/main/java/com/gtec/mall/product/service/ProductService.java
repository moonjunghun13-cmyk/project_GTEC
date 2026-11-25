
package com.gtec.mall.product.service;

import com.gtec.mall.product.domain.Image;
import com.gtec.mall.product.domain.Product;
import com.gtec.mall.product.domain.Status;
import com.gtec.mall.product.dto.ImageRequest;
import com.gtec.mall.product.dto.ProductRequest;
import com.gtec.mall.product.dto.ProductResponse;
import com.gtec.mall.product.dto.ProductStatusRequest;
import com.gtec.mall.product.dto.ProductUpdateRequest;
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

    // 고객용 상품 목록: INACTIVE만 제외하고 SOLD_OUT은 노출
    @Transactional(readOnly = true)
    public List<ProductResponse> list() {
        return productRepository
                .findByStatusNotOrderByCreatedAtDesc(Status.INACTIVE)
                .stream()
                .map(ProductResponse::from)
                .toList();
    }

    // 관리자용 전체 상품 목록
    @Transactional(readOnly = true)
    public List<ProductResponse> adminList() {
        return productRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(ProductResponse::from)
                .toList();
    }

    // 상품 상세 조회: SOLD_OUT 상품도 조회 가능
    @Transactional(readOnly = true)
    public ProductResponse detail(Long id) {
        Product product = findProduct(id);

        if (product.getStatus() == Status.INACTIVE) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "해당 상품을 찾을 수 없습니다."
            );
        }

        return ProductResponse.from(product);
    }

    // 관리자용 상세 조회: INACTIVE 상품도 조회 가능
    @Transactional(readOnly = true)
    public ProductResponse adminDetail(Long id) {
        return ProductResponse.from(findProduct(id));
    }

    // 상품 등록
    public ProductResponse register(ProductRequest request) {
        Product product = new Product();

        product.setName(request.getName());
        product.setCategory(request.getCategory());
        product.setStock(request.getStock());
        product.setDescription(request.getDescription());
        product.setSpecification(request.getSpecification());
        product.setPrice(request.getPrice());
        product.setThumbnailUrl(request.getThumbnailUrl());

        addImages(product, request.getImages());

        Product savedProduct = productRepository.save(product);

        return ProductResponse.from(savedProduct);
    }

    // 상품 정보 수정
    public ProductResponse update(Long id, ProductUpdateRequest request) {
        Product product = findProduct(id);

        if (request.getName() != null) {
            if (request.getName().isBlank()) {
                throw badRequest("상품명은 비워둘 수 없습니다.");
            }
            product.setName(request.getName());
        }

        if (request.getCategory() != null) {
            product.setCategory(request.getCategory());
        }

        if (request.getStock() != null) {
            product.setStock(request.getStock());
        }

        if (request.getDescription() != null) {
            if (request.getDescription().isBlank()) {
                throw badRequest("상품 설명은 비워둘 수 없습니다.");
            }
            product.setDescription(request.getDescription());
        }

        if (request.getSpecification() != null) {
            if (request.getSpecification().isBlank()) {
                throw badRequest("상품 사양은 비워둘 수 없습니다.");
            }
            product.setSpecification(request.getSpecification());
        }

        if (request.getPrice() != null) {
            product.setPrice(request.getPrice());
        }

        if (request.getThumbnailUrl() != null) {
            if (request.getThumbnailUrl().isBlank()) {
                throw badRequest("썸네일 URL은 비워둘 수 없습니다.");
            }
            product.setThumbnailUrl(request.getThumbnailUrl());
        }

        // 이미지 목록이 전달된 경우에만 전체 교체
        if (request.getImages() != null) {
            product.clearImages();
            addImages(product, request.getImages());
        }

        return ProductResponse.from(product);
    }

    // 상품 판매 상태 변경
    public ProductResponse statusUpdate(
            Long id,
            ProductStatusRequest request
    ) {
        Product product = findProduct(id);

        // 재고가 0인 상품은 Entity에서 SOLD_OUT으로 보정
        product.setStatus(request.getStatus());

        return ProductResponse.from(product);
    }

    // 상품 삭제: 실제 삭제 대신 판매 중지
    public void delete(Long id) {
        Product product = findProduct(id);
        product.setStatus(Status.INACTIVE);
    }

    // 상품 조회 공통 메서드
    private Product findProduct(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "해당 상품을 찾을 수 없습니다."
                ));
    }

    // 이미지 등록 공통 메서드
    private void addImages(Product product, List<ImageRequest> imageRequests) {
        if (imageRequests == null) {
            return;
        }

        int order = 0;

        for (ImageRequest request : imageRequests) {
            if (request == null
                    || request.getImageUrl() == null
                    || request.getImageUrl().isBlank()) {
                throw badRequest("이미지 URL을 확인해 주세요.");
            }

            Image image = Image.builder()
                    .imageUrl(request.getImageUrl())
                    .isPrimary(order == 0)
                    .sortOrder(order++)
                    .build();

            product.addImage(image);
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                message
        );
    }
}
