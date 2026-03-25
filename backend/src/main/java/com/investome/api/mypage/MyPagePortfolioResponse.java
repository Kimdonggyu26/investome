package com.investome.api.mypage;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
public class MyPagePortfolioResponse {
    private List<Map<String, Object>> holdings;
    private Long targetAmount;
    private LocalDateTime updatedAt;
}
