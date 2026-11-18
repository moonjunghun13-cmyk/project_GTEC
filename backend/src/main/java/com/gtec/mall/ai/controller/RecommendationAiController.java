package com.gtec.mall.ai.controller;

import com.gtec.mall.ai.client.RecommendationAiClient;
import com.gtec.mall.security.JwtAuth;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/ai/recommendations")
public class RecommendationAiController {

    private final RecommendationAiClient recommendationAiClient;

    public RecommendationAiController(RecommendationAiClient recommendationAiClient) {
        this.recommendationAiClient = recommendationAiClient;
    }

    @GetMapping("/me")
    public ResponseEntity<String> myRecommendations(
            @RequestParam(name = "top_n", defaultValue = "5") int topN) {
        long memberId = JwtAuth.memberId();

        if (topN < 1 || topN > 20) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "top_n은 1~20 사이여야 합니다."
            );
        }

        return recommendationAiClient.recommend(memberId, topN);
    }
}