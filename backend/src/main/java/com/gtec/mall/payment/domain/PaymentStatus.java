
package com.gtec.mall.payment.domain;

public enum PaymentStatus {
    READY,      // 결제 대기
    DONE,       // 결제 승인 완료
    FAILED,     // 결제 실패
    CANCELED    // 결제 취소 완료
}
