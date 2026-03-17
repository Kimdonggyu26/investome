import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import { createBoardPost } from "../utils/boardStorage";
import "../styles/BoardWritePage.css";

export default function BoardWritePage() {
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();

  const [form, setForm] = useState({
    category: "free",
    title: "",
    author: "",
    content: "",
  });

  const [submitError, setSubmitError] = useState("");

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    try {
      setSubmitError("");

      if (!form.title.trim()) {
        throw new Error("제목을 입력해 주세요.");
      }

      if (!form.content.trim()) {
        throw new Error("내용을 입력해 주세요.");
      }

      createBoardPost(form);
      navigate("/board");
    } catch (err) {
      setSubmitError(err.message || "글 등록 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <>
      <TopTickerBar
        prices={prices}
        changes={changes}
        loading={loading}
        error={error}
      />
      <Header />

      <main className="boardWritePage">
        <div className="container">
          <section className="boardWriteCard">
            <div className="boardWriteHead">
              <div>
                <div className="boardWriteEyebrow">WRITE POST</div>
                <h1 className="boardWriteTitle">게시글 작성</h1>
              </div>

              <button
                type="button"
                className="boardWriteGhostBtn"
                onClick={() => navigate("/board")}
              >
                목록으로
              </button>
            </div>

            <form className="boardWriteForm" onSubmit={handleSubmit}>
              <div className="boardWriteGrid">
                <label>
                  <span>카테고리</span>
                  <select
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                  >
                    <option value="free">자유</option>
                    <option value="info">정보</option>
                    <option value="trade">매매일지</option>
                  </select>
                </label>

                <label>
                  <span>작성자</span>
                  <input
                    type="text"
                    value={form.author}
                    placeholder="닉네임 입력"
                    onChange={(e) => updateField("author", e.target.value)}
                  />
                </label>

                <label className="full">
                  <span>제목</span>
                  <input
                    type="text"
                    value={form.title}
                    placeholder="제목을 입력해줘"
                    onChange={(e) => updateField("title", e.target.value)}
                  />
                </label>

                <label className="full">
                  <span>내용</span>
                  <textarea
                    value={form.content}
                    placeholder="내용을 입력해 주세요."
                    onChange={(e) => updateField("content", e.target.value)}
                  />
                </label>
              </div>

              {submitError ? (
                <div className="boardWriteError">{submitError}</div>
              ) : null}

              <div className="boardWriteActions">
                <button
                  type="button"
                  className="boardWriteGhostBtn"
                  onClick={() => navigate("/board")}
                >
                  취소
                </button>

                <button type="submit" className="boardWriteSubmitBtn">
                  등록하기
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}