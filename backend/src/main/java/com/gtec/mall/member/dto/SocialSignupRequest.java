package com.gtec.mall.member.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SocialSignupRequest {

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String name;

    @AssertTrue
    private boolean termsAgreed;

    @AssertTrue
    private boolean privacyAgreed;
}
