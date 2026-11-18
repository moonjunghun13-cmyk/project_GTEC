package com.gtec.mall.ai.client;

import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

/** 리뷰 감정분석 FastAPI(:8003) 연동 준비용 Client.
 *  기존 Java ReviewService에는 아직 연결하지 않습니다.
 */
@Component
public class ReviewAiClient {

    private final RestClient restClient;

    public ReviewAiClient(RestClient.Builder builder,
                          @Value("${ai.review.base-url}") String baseUrl) {
        this.restClient = builder.clone().baseUrl(baseUrl).build();
    }

    public ResponseEntity<String> statistics() {
        try {
            return restClient.get().uri("/api/ai/reviews/statistics")
                    .retrieve().toEntity(String.class);
        } catch (RestClientResponseException e) {
            return upstreamError(e);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "리뷰 AI 서버에 연결할 수 없습니다.");
        }
    }

    public ResponseEntity<String> analyzeReview(long reviewId) {
        try {
            return restClient.post()
                    .uri("/api/ai/reviews/{reviewId}/analyze", reviewId)
                    .retrieve().toEntity(String.class);
        } catch (RestClientResponseException e) {
            return upstreamError(e);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "리뷰 AI 서버에 연결할 수 없습니다.");
        }
    }

    private ResponseEntity<String> upstreamError(RestClientResponseException e) {
        ResponseEntity.BodyBuilder response = ResponseEntity.status(e.getStatusCode());
        if (e.getResponseHeaders() != null && e.getResponseHeaders().getContentType() != null) {
            response.contentType(e.getResponseHeaders().getContentType());
        }
        return response.body(e.getResponseBodyAsString(StandardCharsets.UTF_8));
    }

    // 자동 분석이 이미 돌아가므로 기존 Java 리뷰 저장 로직에는 아직 호출을 추가하지 않습니다.
}
