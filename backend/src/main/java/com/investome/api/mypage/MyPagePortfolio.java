package com.investome.api.mypage;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@Table(name = "mypage_portfolios")
public class MyPagePortfolio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long userId;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String holdingsJson = "[]";

    @Column(nullable = false)
    private Long targetAmount = 50000000L;

    @Column(nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
}
