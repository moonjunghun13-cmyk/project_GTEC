
package com.gtec.mall.delivery.dto;

import com.gtec.mall.delivery.domain.DeliveryStatus;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record DeliveryStatusRequest(

        @NotNull(message = "배송 상태는 필수입니다.")
        DeliveryStatus status,

        LocalDate estimatedAt

) {}
