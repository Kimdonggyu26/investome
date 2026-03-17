import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import { createBoardPost } from "../utils/boardStorage";
import { getAuthNickname, isLoggedIn } from "../utils/auth";
import "../styles/BoardWritePage.css";

const MAX_IMAGE_WIDTH = 1400;
const MAX_IMAGE_HEIGHT = 1400;
const IMAGE_QUALITY = 0.82;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지 미리보기를 불러오지 못했어요."));
    img.src = src;
  });
}

async function compressImage(file) {
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const ratio = Math.min(
    1,
    MAX_IMAGE_WIDTH / width,
    MAX_IMAGE_HEIGHT / height
  );

  width = Math.max(1, Math.round(width * ratio));
  height = Math.max(1, Math.round(height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
}

export default function BoardWritePage() {
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();

  const loggedIn = useMemo(() => isLoggedIn(), []);
  const nickname = useMemo(() => getAuthNickname("사용자"), []);

  const [form, setForm] = useState({
    category: "free",
    title: "",
    content: "",
    imageData: "",
    imageName: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!loggedIn) {
      setSubmitError("게시글 작성은 로그인 후 이용할 수 있어요.");
    }
  }, [loggedIn]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) {
      setForm((prev) => ({ ...prev, imageData: "", imageName: "" }));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSubmitError("이미지 파일만 업로드할 수 있어요.");
      e.target.value = "";
      return;
    }

    try {
      setSubmitError("");
      setIsUploading(true);
      const imageData = await compressImage(file);
      setForm((prev) => ({
        ...prev,
        imageData,
        imageName: file.name,
      }));
    } catch (err) {
      setSubmitError(err.message || "이미지 업로드 중 오류가 발생했어요.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleRemoveImage() {
    setForm((prev) => ({ ...prev, imageData: "", imageName: "" }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    try {
      setSubmitError("");

      if (!loggedIn) {
        throw new Error("게시글 작성은 로그인 후 이용할 수 있어요.");
      }

      if (!form.title.trim()) {
        throw new Error("제목을 입력해 주세요.");
      }

      if (!form.content.trim()) {
        throw new Error("내용을 입력해 주세요.");
      }

      createBoardPost({
        ...form,
        author: nickname,
        category: "free",
      });
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
                  <input type="text" value="자유" disabled />
                </label>

                <label>
                  <span>작성자</span>
                  <input
                    type="text"
                    value={nickname}
                    disabled
                    placeholder="로그인한 닉네임이 자동으로 들어가요"
                  />
                </label>

                <label className="full">
                  <span>제목</span>
                  <input
                    type="text"
                    value={form.title}
                    placeholder="제목을 입력해 주세요."
                    onChange={(e) => updateField("title", e.target.value)}
                    maxLength={120}
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

                <label className="full">
                  <span>사진 업로드</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <div className="boardWriteHint">
                    {isUploading
                      ? "이미지를 최적화하는 중이에요..."
                      : "현재는 1장만 업로드되며, 프론트 기준으로 저장돼요."}
                  </div>
                </label>

                {form.imageData ? (
                  <div className="boardWriteImagePreview full">
                    <img src={form.imageData} alt={form.imageName || "업로드 미리보기"} />
                    <div className="boardWriteImageMeta">
                      <span>{form.imageName || "업로드 이미지"}</span>
                      <button type="button" onClick={handleRemoveImage}>
                        삭제
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {submitError ? (
                <div className="boardWriteError">{submitError}</div>
              ) : null}

              {!loggedIn ? (
                <div className="boardWriteLoginGuide">
                  로그인 후 게시글을 작성할 수 있어요.
                  <button type="button" onClick={() => navigate("/login")}>
                    로그인하러 가기
                  </button>
                </div>
              ) : null}

              <div className="boardWriteActions">
                <button
                  type="button"
                  className="boardWriteGhostBtn"
                  onClick={() => navigate("/board")}
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="boardWriteSubmitBtn"
                  disabled={!loggedIn || isUploading}
                >
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