package com.gtec.mall.board.service;


import com.gtec.mall.board.domain.Faq;
import com.gtec.mall.board.dto.FaqResponse;
import com.gtec.mall.board.repository.FaqRepository;
import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FaqService {
    private final FaqRepository faqRepository;
    private final MemberRepository memberRepository;

    //목록
    public List<FaqResponse> findAll(){
        return faqRepository.findAllByOrderByCreatedAtDesc().stream().map(FaqResponse::from).toList();
    }

    //게시글 찾기
    public Faq findById(Long id){
       return faqRepository.findById(id).orElseThrow(()->new IllegalArgumentException("게시글이 존재 하지 않습니다."));
    }

    //게시글 단건 조회
    public FaqResponse findByFaq(Long id){
        return FaqResponse.from(findById(id));
    }
    
    //게시글 검색
    public List<FaqResponse> findByKeyword(String type, String keyword){
        List<Faq> faqs;
        if ("TITLE".equals(type)) {faqs =  faqRepository.findByTitleContainingOrderByCreatedAtDesc(keyword);}
        else if ("CONTENT".equals(type)) {faqs = faqRepository.findByContentContainingOrderByCreatedAtDesc(keyword);}
        else {faqs = faqRepository.findByTitleContainingOrContentContainingOrderByCreatedAtDesc(keyword,keyword);}
        return faqs.stream().map(FaqResponse::from).toList();
    }

    //등록 - 등록하거나 수정은 member의 상태와 권한 따져야함
    @Transactional
    public FaqResponse create(String title, String content, Long memberId) {
        Member member = memberRepository.findById(memberId).orElseThrow(()->new IllegalArgumentException("잘못된 아이디 입니다."));
        Faq faq =  Faq.builder()
                        .title(title)
                        .content(content)
                        .member(member)
                        .build();
        return FaqResponse.from(faqRepository.save(faq));
    }
    
    //수정
    @Transactional
    public FaqResponse update(Long id, String title, String content, Long memberId){
        Member member = memberRepository.findById(memberId).orElseThrow(()->new IllegalArgumentException("잘못된 아이디 입니다."));
        Faq faq = findById(id);
        faq.setTitle(title);
        faq.setContent(content);
        faq.setMember(member);
        return FaqResponse.from(faq);
    }

    //삭제
    @Transactional
    public void delete(Long id){
        Faq notice = findById(id);
        faqRepository.delete(notice);
    }
}
