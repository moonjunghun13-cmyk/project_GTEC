package com.gtec.mall.order.dto.request;

import com.gtec.mall.order.domain.CancelReason;
import jakarta.validation.constraints.NotNull;

public record OrderCancelRequest(

        @NotNull
        CancelReason reason

) {
}
