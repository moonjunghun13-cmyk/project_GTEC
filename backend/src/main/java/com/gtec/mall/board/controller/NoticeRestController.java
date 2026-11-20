package com.gtec.mall.board.controller;


import com.gtec.mall.board.dto.NoticeRequest;
import com.gtec.mall.board.dto.NoticeResponse;
import com.gtec.mall.board.service.NoticeService;
import com.gtec.mall.security.JwtAuth;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notices")
public class NoticeRestController {
    private final NoticeService noticeService;

    //로그인한 회원이 관리자인지 확인하는 것 - 에러 코드 분류용
    private void requireAdmin() {
        if (!JwtAuth.isAdmin()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "관리자 권한이 필요합니다."
            );
        }
    }
    //공지사항 목록
    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<NoticeResponse> list(){
        return noticeService.findAll();
    }

    //공지사항 검색
    @GetMapping("/search")
    @ResponseStatus(HttpStatus.OK)
    public List<NoticeResponse> searchList(@RequestParam String type,@RequestParam String keyword){
        return noticeService.findByKeyword(type,keyword);
    }
    
    //공지사항 상세
    @GetMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public NoticeResponse detail(@PathVariable("id") Long id){
        return noticeService.findByNotice(id);
    }
    
    //공지사항 등록 -- 로그인 되었는지, 관리자인지
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NoticeResponse create(@Valid @RequestBody NoticeRequest request) {
        requireAdmin();
        return noticeService.create(
                request.getTitle(),
                request.getContent(),
                JwtAuth.memberId()
        );
    }

    //공지사항 수정
    @PutMapping("/{id}")
    @ResponseStatus(HttpStatus.OK)
    public NoticeResponse update(
            @PathVariable("id") Long id,
            @Valid @RequestBody NoticeRequest request
    ) {
        requireAdmin();
        return noticeService.update(id, request.getTitle(), request.getContent());
    }

    //공지사항 삭제
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable("id") Long id) {
        requireAdmin();
        noticeService.delete(id);
    }
}
