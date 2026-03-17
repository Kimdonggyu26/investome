import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import { createBoardPost } from "../utils/boardStorage";
import { getAuthNickname, isLoggedIn } from "../utils/auth";
import "../styles/BoardWritePage.css";

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    reader.readAsDataURL(file);
  });
}

export default function BoardWritePage() {
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();
  const fileInputRef = useRef(null);

  const loggedIn = isLoggedIn();
  const nickname = getAuthNickname("사용자");

  const [form, setForm] = useState({
    category: "free",
    title: "",
    content: "",
    imageData: "",
    imageName: "",
  });

  const [submitError, setSubmitError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSubmitError("이미지 파일만 업로드할 수 있어요.");
      return;
    }

    try {
      setSubmitError("");
      const imageData = await readFileAsDataURL(file);

      setForm((prev) => ({
        ...prev,
        imageData,
        imageName: file.name,
      }));
    } catch (err) {
      setSubmitError(err.message || "이미지 업로드 중 오류가 발생했어요.");
    }
  }

  function handleInputFileChange(e) {
    const file = e.target.files?.[0];
    handleFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  function handleSubmit(e) {
    e.preventDefault();

    try {
      setSubmitError("");

      if (!loggedIn) {
        throw new Error("로그인 후 게시글을 작성할 수 있어요.");
      }

      if (!form.title.trim()) {
        throw new Error("제목을 입력해 주세요.");
      }

      if (!form.content.trim()) {
        throw new Error("내용을 입력해 주세요.");
      }

      createBoardPost({
        category: "free",
        title: form.title,
        content: form.content,
        author: nickname,
        imageData: form.imageData,
        imageName: form.imageName,
      });

      navigate("/board");
    } catch (err) {
      setSubmitError(err.message || "글 등록 중 오류가 발생했습니다.");
    }
  }

  if (!loggedIn) {
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
            <section className="boardWriteLockedCard">
              <div className="boardWriteLockedBadge">MEMBERS ONLY</div>
              <h1 className="boardWriteLockedTitle">로그인 후 게시글 작성이 가능해요</h1>
              <p className="boardWriteLockedText">
                게시글 작성, 사진 업로드, 댓글 기능은
                <br />
                로그인한 사용자만 이용할 수 있어요.
              </p>

              <div className="boardWriteLockedActions">
                <Link to="/login" className="boardWriteSubmitBtn">
                  로그인하러 가기
                </Link>
                <button
                  type="button"
                  className="boardWriteGhostBtn"
                  onClick={() => navigate("/board")}
                >
                  게시판으로
                </button>
              </div>
            </section>
          </div>
        </main>
      </>
    );
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
                  <input type="text" value="자유" disabled />
                </label>

                <label>
                  <span>작성자</span>
                  <input type="text" value={nickname} disabled />
                </label>

                <label className="full">
                  <span>제목</span>
                  <input
                    type="text"
                    value={form.title}
                    placeholder="제목을 입력해 주세요."
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

                <div className="full">
                  <span className="boardWriteFieldLabel">사진 업로드</span>

                  <div
                    className={`boardDropZone ${isDragging ? "isDragging" : ""}`}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsDragging(false);
                    }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleInputFileChange}
                      hidden
                    />

                    <div className="boardDropZoneIcon">＋</div>
                    <div className="boardDropZoneTitle">
                      클릭하거나 드래그해서 이미지를 올려보세요
                    </div>
                    <div className="boardDropZoneSub">
                      JPG, PNG, WEBP 업로드 가능
                    </div>
                  </div>
                </div>

                {form.imageData ? (
                  <div className="boardWriteImagePreview full">
                    <img src={form.imageData} alt={form.imageName || "업로드 이미지"} />
                    <div className="boardWriteImageMeta">
                      <span>{form.imageName}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            imageData: "",
                            imageName: "",
                          }))
                        }
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ) : null}
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