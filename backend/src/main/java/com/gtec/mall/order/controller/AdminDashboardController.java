package com.gtec.mall.order.controller;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {
    private final JdbcTemplate jdbc;
    public AdminDashboardController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public Map<String, Object> summary() {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        LocalDate start = today.withDayOfMonth(1).minusMonths(5);
        LocalDate end = today.plusDays(1);
        Map<LocalDate, long[]> days = new LinkedHashMap<>();
        for (LocalDate d = start; d.isBefore(end); d = d.plusDays(1)) days.put(d, new long[3]);

        jdbc.query("SELECT CAST(created_at AS date) d, COUNT(*) n FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY CAST(created_at AS date)",
            rs -> { long[] row = days.get(rs.getDate("d").toLocalDate()); if (row != null) row[0] = rs.getLong("n"); }, start.atStartOfDay(), end.atStartOfDay());
        jdbc.query("SELECT CAST(COALESCE(paid_at, created_at) AS date) d, SUM(total_amount) n FROM orders WHERE status IN ('PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED') AND COALESCE(paid_at, created_at) >= ? AND COALESCE(paid_at, created_at) < ? GROUP BY CAST(COALESCE(paid_at, created_at) AS date)",
            rs -> { long[] row = days.get(rs.getDate("d").toLocalDate()); if (row != null) row[1] = rs.getLong("n"); }, start.atStartOfDay(), end.atStartOfDay());
        jdbc.query("SELECT CAST(r.refunded_at AS date) d, SUM(r.refund_amount) n FROM return_requests r JOIN orders o ON o.id = r.order_id WHERE r.status = 'REFUNDED' AND o.status IN ('PAID','PREPARING','SHIPPED','DELIVERED','COMPLETED') AND r.refunded_at >= ? AND r.refunded_at < ? GROUP BY CAST(r.refunded_at AS date)",
            rs -> { long[] row = days.get(rs.getDate("d").toLocalDate()); if (row != null) row[1] -= rs.getLong("n"); }, start.atStartOfDay(), end.atStartOfDay());
        jdbc.query("SELECT CAST(created_at AS date) d, COUNT(*) n FROM members WHERE role = 'USER' AND created_at >= ? AND created_at < ? GROUP BY CAST(created_at AS date)",
            rs -> { long[] row = days.get(rs.getDate("d").toLocalDate()); if (row != null) row[2] = rs.getLong("n"); }, start.atStartOfDay(), end.atStartOfDay());
        Long shipping = jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE status IN ('PAID','PREPARING') AND cancel_requested_at IS NULL", Long.class);
        List<Map<String, Object>> result = new ArrayList<>();
        days.forEach((date, row) -> result.add(Map.of("date", date.toString(), "orders", row[0], "revenue", row[1], "members", row[2])));
        return Map.of("daily", result, "shippingWaiting", shipping == null ? 0 : shipping);
    }
}
