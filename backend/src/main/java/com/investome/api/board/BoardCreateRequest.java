package com.investome.api.board;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BoardCreateRequest {
    @Size(max = 30, message = "카테고리는 30자 이하로 입력해 주세요.")
    private String category;

    @NotBlank(message = "제목을 입력해 주세요.")
    @Size(max = 255, message = "제목은 255자 이하로 입력해 주세요.")
    private String title;

    @NotBlank(message = "내용을 입력해 주세요.")
    private String content;
    private String imageData;

    @Size(max = 255, message = "이미지 이름은 255자 이하로 입력해 주세요.")
    private String imageName;
}
