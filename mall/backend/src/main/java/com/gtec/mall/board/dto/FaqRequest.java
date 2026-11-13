package com.gtec.mall.board.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FaqRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String content;
}
