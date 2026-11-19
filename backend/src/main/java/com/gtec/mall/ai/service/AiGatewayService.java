package com.gtec.mall.ai.service;

import tools.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
public class AiGatewayService {

    private final RestClient recommendClient;
    private final RestClient reviewClient;
    private final RestClient customerClient;
    private final String internalKey;

    public AiGatewayService(
            @Value("${app.ai.recommend-url}") String recommendUrl,
            @Value("${app.ai.review-url}") String reviewUrl,
            @Value("${app.ai.customer-url}") String customerUrl,
            @Value("${AI_INTERNAL_KEY:}") String internalKey
    ) {
        this.recommendClient = RestClient.builder().baseUrl(recommendUrl).build();
        this.reviewClient = RestClient.builder().baseUrl(reviewUrl).build();
        this.customerClient = RestClient.builder().baseUrl(customerUrl).build();
        this.internalKey = internalKey;
    }

    public JsonNode recommendations(Long memberId, int topN) {
        return recommendClient.get()
                .uri(uri -> uri
                        .path("/api/ai/recommendations/{memberId}")
                        .queryParam("top_n", topN)
                        .build(memberId))
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode analyzeReview(Long reviewId) {
        return reviewClient.post()
                .uri("/api/ai/reviews/{reviewId}/analyze", reviewId)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode reviewStatistics() {
        return reviewClient.get()
                .uri("/api/ai/reviews/statistics")
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode analyzeAllReviews() {
        return reviewClient.post()
                .uri("/api/ai/reviews/analyze-all")
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode customerGet(String endpoint) {
        return customerClient.get()
                .uri("/api/ai/customers/" + endpoint)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode refreshCustomerModel() {
        return customerClient.post()
                .uri("/api/ai/customers/model-refresh")
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode recommendationTrainingStatus() {
        return recommendClient.get()
                .uri("/api/internal/recommendations/status")
                .header("X-AI-Internal-Key", internalKey)
                .retrieve()
                .body(JsonNode.class);
    }

    public JsonNode retrainRecommendationModel(int days) {
        return recommendClient.post()
                .uri("/api/internal/recommendations/retrain")
                .header("X-AI-Internal-Key", internalKey)
                .body(Map.of("days", days))
                .retrieve()
                .body(JsonNode.class);
    }
}