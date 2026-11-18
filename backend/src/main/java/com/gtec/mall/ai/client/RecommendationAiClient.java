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

/** 추천 FastAPI(:8002)를 호출하는 전담 Client. */
@Component
public class RecommendationAiClient {

    private final RestClient restClient;

    public RecommendationAiClient(RestClient.Builder builder,
                                  @Value("${ai.recommend.base-url}") String baseUrl) {
        this.restClient = builder.clone().baseUrl(baseUrl).build();
    }

    public ResponseEntity<String> recommend(long memberId, int topN) {
        try {
            return restClient.get()
                    .uri(uri -> uri.path("/api/ai/recommendations/{memberId}")
                            .queryParam("top_n", topN)
                            .build(memberId))
                    .retrieve()
                    .toEntity(String.class);
        } catch (RestClientResponseException e) {
            ResponseEntity.BodyBuilder response = ResponseEntity.status(e.getStatusCode());
            if (e.getResponseHeaders() != null && e.getResponseHeaders().getContentType() != null) {
                response.contentType(e.getResponseHeaders().getContentType());
            }
            return response.body(e.getResponseBodyAsString(StandardCharsets.UTF_8));
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "상품 추천 AI 서버에 연결할 수 없습니다.");
        }
    }

    // 추천 모델 관리자 API는 별도의 X-AI-Internal-Key를 요구하므로 공개하지 않습니다.
}
