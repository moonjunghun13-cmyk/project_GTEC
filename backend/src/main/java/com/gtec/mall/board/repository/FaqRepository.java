package com.gtec.mall.board.repository;


import com.gtec.mall.board.domain.Faq;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaqRepository extends JpaRepository<Faq, Long> {
    List<Faq> findAllByOrderByCreatedAtDesc();
    List<Faq> findByTitleContainingOrderByCreatedAtDesc(String title);
    List<Faq> findByContentContainingOrderByCreatedAtDesc(String content);
    List<Faq> findByTitleContainingOrContentContainingOrderByCreatedAtDesc(String title, String content);
}
