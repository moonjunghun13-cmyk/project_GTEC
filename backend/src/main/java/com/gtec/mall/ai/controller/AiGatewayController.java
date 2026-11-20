package com.gtec.mall.ai.controller;

import tools.jackson.databind.JsonNode;
import com.gtec.mall.ai.service.AiGatewayService;
import com.gtec.mall.security.JwtAuth;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;

@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT"
)
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api")
@Validated
public class AiGatewayController {

    private final AiGatewayService aiGatewayService;

    public AiGatewayController(AiGatewayService aiGatewayService) {
        this.aiGatewayService = aiGatewayService;
    }

    // 로그인한 회원의 추천 상품
    @GetMapping("/ai/recommendations/me")
    public JsonNode recommendations(
            @RequestParam(defaultValue = "4")
            @Min(1) @Max(20) int topN
    ) {
        return aiGatewayService.recommendations(JwtAuth.memberId(), topN);
    }

    // 관리자 리뷰 감정분석
    @PostMapping("/admin/ai/reviews/{reviewId}/analyze")
    public JsonNode analyzeReview(@PathVariable Long reviewId) {
        return aiGatewayService.analyzeReview(reviewId);
    }

    @GetMapping("/admin/ai/reviews/statistics")
    public JsonNode reviewStatistics() {
        return aiGatewayService.reviewStatistics();
    }

    @PostMapping("/admin/ai/reviews/analyze-all")
    public JsonNode analyzeAllReviews() {
        return aiGatewayService.analyzeAllReviews();
    }

    // 관리자 고객 분석
    @GetMapping("/admin/ai/customers/repurchase-predictions")
    public JsonNode repurchasePredictions() {
        return aiGatewayService.customerGet("repurchase-predictions");
    }

    @GetMapping("/admin/ai/customers/summary")
    public JsonNode customerSummary() {
        return aiGatewayService.customerGet("summary");
    }

    @GetMapping("/admin/ai/customers/repurchase-summary")
    public JsonNode repurchaseSummary() {
        return aiGatewayService.customerGet("repurchase-summary");
    }

    @GetMapping("/admin/ai/customers/monthly-retention")
    public JsonNode monthlyRetention() {
        return aiGatewayService.customerGet("monthly-retention");
    }

    @GetMapping("/admin/ai/customers/model-training-status")
    public JsonNode customerModelStatus() {
        return aiGatewayService.customerGet("model-training-status");
    }

    @PostMapping("/admin/ai/customers/model-refresh")
    public JsonNode refreshCustomerModel() {
        return aiGatewayService.refreshCustomerModel();
    }

    // 추천 모델 관리자 API
    @PostMapping("/admin/ai/demo-data/append")
    public JsonNode generateDemoAppend() {
        return aiGatewayService.generateDemoAppend();
    }

    @GetMapping("/admin/ai/recommendations/status")
    public JsonNode recommendationTrainingStatus() {
        return aiGatewayService.recommendationTrainingStatus();
    }

    public record RetrainRequest(
            @Min(30) @Max(1095) int days
    ) {}

    @PostMapping("/admin/ai/recommendations/retrain")
    public JsonNode retrainRecommendationModel(
            @Valid @RequestBody RetrainRequest request
    ) {
        return aiGatewayService.retrainRecommendationModel(request.days());
    }
}