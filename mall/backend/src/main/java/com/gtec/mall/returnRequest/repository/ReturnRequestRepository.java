package com.gtec.mall.returnRequest.repository;

import com.gtec.mall.member.domain.Member;
import com.gtec.mall.returnRequest.domain.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, Long> {
    boolean existsById(Long id);
    boolean existsByOrderId(Long orderId);
    Optional<ReturnRequest> findById (Long id);
    List<ReturnRequest> findAllByCreatedAtByIdDesc();
}
