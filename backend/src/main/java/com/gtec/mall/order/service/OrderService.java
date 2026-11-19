
package com.gtec.mall.order.service;

import com.gtec.mall.delivery.domain.Delivery;
import com.gtec.mall.delivery.repository.DeliveryRepository;
import com.gtec.mall.member.domain.Member;
import com.gtec.mall.member.repository.MemberRepository;
import com.gtec.mall.order.domain.Order;
import com.gtec.mall.order.domain.OrderStatus;
import com.gtec.mall.order.dto.request.OrderCancelRequest;
import com.gtec.mall.order.dto.request.OrderRequest;
import com.gtec.mall.order.dto.response.OrderResponse;
import com.gtec.mall.order.repository.OrderRepository;
import com.gtec.mall.orderItem.domain.OrderItem;
import com.gtec.mall.orderItem.dto.OrderItemRequest;
import com.gtec.mall.orderItem.repository.OrderItemRepository;
import com.gtec.mall.product.domain.Product;
import com.gtec.mall.product.domain.Status;
import com.gtec.mall.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final MemberRepository memberRepository;
    private final ProductRepository productRepository;
    private final DeliveryRepository deliveryRepository;

    private static final long DEFAULT_SHIPPING_FEE = 0L;

    // 1. 주문 생성
    @Transactional
    public OrderResponse createOrder(Long memberId, OrderRequest request) {

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        Map<Long, Product> products = new HashMap<>();
        Map<Long, Integer> quantities = new HashMap<>();

        // 상품 조회 및 수량 합산
        for (OrderItemRequest itemRequest : request.items()) {

            Long productId = itemRequest.productId();
            int quantity = itemRequest.quantity();

            Product product = products.computeIfAbsent(
                    productId,
                    id -> productRepository.findById(id)
                            .orElseThrow(() -> new IllegalArgumentException("상품을 찾을 수 없습니다."))
            );

            validateOrderableProduct(product);
            quantities.merge(productId, quantity, Math::addExact);
        }

        // 상품별 총 주문 수량 검증
        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {

            Product product = products.get(entry.getKey());

            if (product.getStock() < entry.getValue()) {
                throw new IllegalStateException(
                        "상품 재고가 부족합니다: " + product.getName()
                );
            }
        }

        // 주문 금액 계산
        long subTotal = 0L;

        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {

            Product product = products.get(entry.getKey());

            long itemTotal = Math.multiplyExact(
                    product.getPrice(),
                    entry.getValue()
            );

            subTotal = Math.addExact(subTotal, itemTotal);
        }

        long shippingFee = DEFAULT_SHIPPING_FEE;
        long discountAmount = 0L;

        // 주문 생성
        Order order = Order.builder()
                .orderNumber(generateOrderNumber())
                .member(member)
                .status(OrderStatus.PENDING)
                .subTotal(subTotal)
                .shippingFee(shippingFee)
                .discountAmount(discountAmount)
                .totalAmount(0L)
                .paymentMethod(request.paymentMethod())
                .build();

        order.calculateTotalAmount();

        Order savedOrder = orderRepository.save(order);

        // 배송지 정보 저장
        Delivery delivery = Delivery.builder()
                .order(savedOrder)
                .shippingName(request.shippingName())
                .shippingPhone(request.shippingPhone())
                .shippingZipcode(request.shippingZipcode())
                .shippingAddress1(request.shippingAddress1())
                .shippingAddress2(request.shippingAddress2())
                .build();

        deliveryRepository.save(delivery);

        // 주문 상품 스냅샷 저장 및 재고 차감
        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {

            Product product = products.get(entry.getKey());
            int quantity = entry.getValue();

            long unitPrice = product.getPrice();
            long totalPrice = Math.multiplyExact(unitPrice, quantity);

            product.decreaseStock(quantity);

            OrderItem orderItem = OrderItem.builder()
                    .product(product)
                    .productName(product.getName())
                    .unitPrice(unitPrice)
                    .quantity(quantity)
                    .totalPrice(totalPrice)
                    .build();

            savedOrder.addOrderItem(orderItem);
            orderItemRepository.save(orderItem);
        }

        return OrderResponse.from(savedOrder);
    }

    // 2. 회원 주문 목록 조회
    public Page<OrderResponse> getMyOrders(Long memberId, Pageable pageable) {
        return orderRepository
                .findAllByMemberIdOrderByCreatedAtDesc(memberId, pageable)
                .map(OrderResponse::from);
    }

    // 3. 회원 주문 상세 조회
    public OrderResponse getMyOrder(Long memberId, Long orderId) {

        Order order = orderRepository.findByIdAndMemberId(orderId, memberId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));

        return OrderResponse.from(order);
    }

    // 3-1. 회원 구매 확정
    @Transactional
    public void completeMyOrder(Long memberId, Long orderId) {
        Order order = orderRepository.findByIdAndMemberId(orderId, memberId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));
        order.complete();
    }

    // 4. 관리자 전체 주문 조회
    public Page<OrderResponse> getAllOrders(Pageable pageable) {
        return orderRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(OrderResponse::from);
    }

    // 5. 관리자 주문 상태별 조회
    public Page<OrderResponse> getOrdersByStatus(
            OrderStatus status,
            Pageable pageable
    ) {
        return orderRepository
                .findAllByStatusOrderByCreatedAtDesc(status, pageable)
                .map(OrderResponse::from);
    }

    // 6. 주문 취소 요청
    @Transactional
    public void requestCancellation(
            Long memberId,
            Long orderId,
            OrderCancelRequest request
    ) {

        Order order = orderRepository.findByIdAndMemberId(orderId, memberId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));

        order.requestCancellation(request.reason());

        // 결제 전 주문은 즉시 취소 및 재고 복구
        if (order.getStatus() == OrderStatus.PENDING) {

            order.cancel();

            restoreStock(order);
            return;
        }

        // 결제 완료 주문은 PaymentService에서 PG 취소 성공 후 처리
        throw new IllegalStateException(
                "결제가 완료된 주문은 결제 취소 절차가 필요합니다."
        );
    }

    // 7. 결제 취소 완료 후 주문 취소 처리
    // PaymentService에서 PG 취소 성공 후 호출할 메서드
    @Transactional
    public void cancelPaidOrder(Order order) {

        if (order.getStatus() != OrderStatus.PAID) {
            throw new IllegalStateException("결제 완료 상태의 주문만 취소할 수 있습니다.");
        }

        order.cancel();
        restoreStock(order);
    }

    // 8. 재고 복구
    private void restoreStock(Order order) {
        order.getOrderItems().forEach(orderItem ->
                orderItem.getProduct().increaseStock(orderItem.getQuantity())
        );
    }

    // 9. 상품 주문 가능 여부 확인
    private void validateOrderableProduct(Product product) {

        if (product.getStatus() != Status.ACTIVE) {
            throw new IllegalStateException("현재 판매 중인 상품이 아닙니다.");
        }

        if (product.getStock() <= 0) {
            throw new IllegalStateException("상품 재고가 없습니다.");
        }
    }

    // 10. 주문번호 생성
    private String generateOrderNumber() {
        return "ORD-" + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 20)
                .toUpperCase();
    }
    @Transactional
    public void startPreparing(Long orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new IllegalArgumentException("주문을 찾을 수 없습니다."));

        order.startPreparing();
    }
}
