package com.investome.api.board;

import com.investome.api.config.AuthenticatedUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/board")
public class BoardController {

    private final BoardService boardService;
    @GetMapping("/posts")
    public List<BoardPostResponse> getPosts(@AuthenticationPrincipal AuthenticatedUser user) {
        return boardService.getPosts(user != null ? user.id() : null);
    }

    @GetMapping("/posts/{postId}")
    public BoardPostResponse getPost(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "false") boolean increaseView,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return boardService.getPost(postId, increaseView, user != null ? user.id() : null);
    }

    @PostMapping("/posts")
    public BoardPostResponse createPost(
            @Valid @RequestBody BoardCreateRequest request,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return boardService.createPost(user.id(), request);
    }

    @PutMapping("/posts/{postId}")
    public BoardPostResponse updatePost(
            @PathVariable Long postId,
            @Valid @RequestBody BoardCreateRequest request,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return boardService.updatePost(user.id(), postId, request);
    }

    @DeleteMapping("/posts/{postId}")
    public void deletePost(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        boardService.deletePost(user.id(), postId);
    }

    @PostMapping("/posts/{postId}/comments")
    public BoardPostResponse addComment(
            @PathVariable Long postId,
            @Valid @RequestBody BoardCommentCreateRequest request,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return boardService.addComment(user.id(), postId, request);
    }

    @DeleteMapping("/posts/{postId}/comments/{commentId}")
    public BoardPostResponse deleteComment(
            @PathVariable Long postId,
            @PathVariable Long commentId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return boardService.deleteComment(user.id(), postId, commentId);
    }

    @PostMapping("/posts/{postId}/like")
    public BoardPostResponse toggleLike(
            @PathVariable Long postId,
            @AuthenticationPrincipal AuthenticatedUser user
    ) {
        return boardService.toggleLike(user.id(), postId);
    }
}
