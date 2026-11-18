package com.gtec.mall.ai.controller;

import com.gtec.mall.ai.client.CustomerAiClient;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/ai/customers")
@PreAuthorize("hasRole('ADMIN')")
public class CustomerAiController {

    private final CustomerAiClient customerAiClient;

    public CustomerAiController(CustomerAiClient customerAiClient) {
        this.customerAiClient = customerAiClient;
    }

    @GetMapping("/summary")
    public ResponseEntity<String> summary() {
        return customerAiClient.summary();
    }

    @GetMapping("/repurchase-summary")
    public ResponseEntity<String> repurchaseSummary() {
        return customerAiClient.repurchaseSummary();
    }

    @GetMapping("/monthly-retention")
    public ResponseEntity<String> monthlyRetention() {
        return customerAiClient.monthlyRetention();
    }

    @GetMapping("/repurchase-predictions")
    public ResponseEntity<String> repurchasePredictions() {
        return customerAiClient.repurchasePredictions();
    }

    @GetMapping("/model-training-status")
    public ResponseEntity<String> modelTrainingStatus() {
        return customerAiClient.modelTrainingStatus();
    }
}