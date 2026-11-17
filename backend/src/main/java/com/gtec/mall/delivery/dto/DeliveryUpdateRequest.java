
package com.gtec.mall.delivery.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record DeliveryUpdateRequest(

        @NotBlank(message = "택배사 코드는 필수입니다.")
        @Size(max = 30)
        String carrierCode,

        @NotBlank(message = "택배사 이름은 필수입니다.")
        @Size(max = 50)
        String carrierName,

        @NotBlank(message = "운송장 번호는 필수입니다.")
        @Size(max = 50)
        String invoiceNumber,

        LocalDate estimatedAt

) {}
