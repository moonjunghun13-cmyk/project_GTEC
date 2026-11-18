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

/** 고객 분석 FastAPI(:8001)를 호출하는 전담 Client. Python 코드 변경 없음. */
@Component
public class CustomerAiClient {

    private final RestClient restClient;

    public CustomerAiClient(RestClient.Builder builder,
                            @Value("${ai.customer.base-url}") String baseUrl) {
        this.restClient = builder.clone().baseUrl(baseUrl).build();
    }

    public ResponseEntity<String> summary() {
        return get("/api/ai/customers/summary");
    }

    public ResponseEntity<String> repurchaseSummary() {
        return get("/api/ai/customers/repurchase-summary");
    }

    public ResponseEntity<String> monthlyRetention() {
        return get("/api/ai/customers/monthly-retention");
    }

    public ResponseEntity<String> repurchasePredictions() {
        return get("/api/ai/customers/repurchase-predictions");
    }

    public ResponseEntity<String> modelTrainingStatus() {
        return get("/api/ai/customers/model-training-status");
    }

    private ResponseEntity<String> get(String path) {
        try {
            return restClient.get().uri(path).retrieve().toEntity(String.class);
        } catch (RestClientResponseException e) {
            return upstreamError(e);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "고객 분석 AI 서버에 연결할 수 없습니다.");
        }
    }

    private ResponseEntity<String> upstreamError(RestClientResponseException e) {
        // FastAPI의 오류 상태 코드와 응답 본문을 최대한 그대로 전달합니다.
        ResponseEntity.BodyBuilder response = ResponseEntity.status(e.getStatusCode());
        if (e.getResponseHeaders() != null && e.getResponseHeaders().getContentType() != null) {
            response.contentType(e.getResponseHeaders().getContentType());
        }
        return response.body(e.getResponseBodyAsString(StandardCharsets.UTF_8));
    }

    // POST /model-refresh 는 의도적으로 제외했습니다.
    // FastAPI가 loopback에서만 허용하므로 분리 컨테이너에서 그대로 호출할 수 없습니다.
}
