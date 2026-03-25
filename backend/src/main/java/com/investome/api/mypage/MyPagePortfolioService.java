package com.investome.api.mypage;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MyPagePortfolioService {

    private static final TypeReference<List<Map<String, Object>>> HOLDINGS_TYPE =
            new TypeReference<>() {};

    private final MyPagePortfolioRepository repository;
    private final ObjectMapper objectMapper;

    public MyPagePortfolioResponse getByUserId(Long userId) {
        MyPagePortfolio saved = repository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "마이페이지 저장 정보가 없습니다."));

        return new MyPagePortfolioResponse(
                readHoldings(saved.getHoldingsJson()),
                normalizeTargetAmount(saved.getTargetAmount()),
                saved.getUpdatedAt()
        );
    }

    public MyPagePortfolioResponse save(Long userId, MyPagePortfolioRequest request) {
        MyPagePortfolio entity = repository.findByUserId(userId)
                .orElseGet(MyPagePortfolio::new);

        entity.setUserId(userId);
        entity.setHoldingsJson(writeHoldings(request.getHoldings()));
        entity.setTargetAmount(normalizeTargetAmount(request.getTargetAmount()));
        entity.setUpdatedAt(LocalDateTime.now());

        MyPagePortfolio saved = repository.save(entity);

        return new MyPagePortfolioResponse(
                readHoldings(saved.getHoldingsJson()),
                saved.getTargetAmount(),
                saved.getUpdatedAt()
        );
    }

    private String writeHoldings(List<Map<String, Object>> holdings) {
        try {
            return objectMapper.writeValueAsString(holdings == null ? Collections.emptyList() : holdings);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "보유 종목 데이터 저장에 실패했습니다.");
        }
    }

    private List<Map<String, Object>> readHoldings(String json) {
        try {
            if (json == null || json.isBlank()) {
                return Collections.emptyList();
            }
            return objectMapper.readValue(json, HOLDINGS_TYPE);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "보유 종목 데이터를 읽는 중 오류가 발생했습니다.");
        }
    }

    private Long normalizeTargetAmount(Long targetAmount) {
        return (targetAmount == null || targetAmount <= 0) ? 50000000L : targetAmount;
    }
}
