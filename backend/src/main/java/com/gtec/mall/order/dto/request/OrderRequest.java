package com.gtec.mall.order.dto.request;

import com.gtec.mall.order.domain.PaymentMethod;
import com.gtec.mall.orderItem.dto.OrderItemRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OrderRequest(

        @NotEmpty
        List<@Valid OrderItemRequest> items,

        @NotBlank
        @Size(max = 50)
        String shippingName,

        @NotBlank
        @Size(max = 20)
        String shippingPhone,

        @NotBlank
        @Size(max = 10)
        String shippingZipcode,

        @NotBlank
        @Size(max = 255)
        String shippingAddress1,

        @Size(max = 255)
        String shippingAddress2,

        @NotNull
        PaymentMethod paymentMethod

) {}
