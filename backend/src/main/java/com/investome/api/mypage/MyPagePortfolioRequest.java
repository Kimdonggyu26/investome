package com.investome.api.mypage;

import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
public class MyPagePortfolioRequest {
    private List<Map<String, Object>> holdings;
    private Long targetAmount;
}
