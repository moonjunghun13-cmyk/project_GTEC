
package com.gtec.mall.payment.dto;

import jakarta.validation.constraints.NotBlank;

public record PaymentRequest(
        @NotBlank(message = "주문 번호는 필수입니다.")
        String orderNumber
) {
}
