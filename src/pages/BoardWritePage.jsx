import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import {
  createBoardPost,
  fetchBoardPost,
  updateBoardPost,
} from "../api/boardApi";
import { getAuthNickname, getAuthUser, isLoggedIn } from "../utils/auth";
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
  const { postId } = useParams();
  const isEditMode = Boolean(postId);
  const { prices, changes, loading, error } = useTicker();
  const fileInputRef = useRef(null);

  const loggedIn = isLoggedIn();
  const authUser = getAuthUser();
  const isAdmin = authUser?.role === "ADMIN";
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

  useEffect(() => {
    if (!isEditMode) return;

    fetchBoardPost(postId, false)
      .then((data) => {
        if (!data.mine) {
          alert("본인 글만 수정할 수 있어요.");
          navigate("/board");
          return;
        }

        setForm({
          category: data.category || "free",
          title: data.title || "",
          content: data.content || "",
          imageData: data.imageData || "",
          imageName: data.imageName || "",
        });
      })
      .catch(() => {
        alert("게시글을 불러오지 못했어요.");
        navigate("/board");
      });
  }, [isEditMode, navigate, postId]);

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

  function handleInputFileChange(event) {
    const file = event.target.files?.[0];
    handleFile(file);
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitError("");

      if (!loggedIn) {
        throw new Error("로그인 후 게시글을 작성할 수 있어요.");
      }

      if (!form.title.trim()) {
        throw new Error("제목을 입력해주세요.");
      }

      if (!form.content.trim()) {
        throw new Error("내용을 입력해주세요.");
      }

      const payload = {
        category: isAdmin && form.category === "notice" ? "notice" : "free",
        title: form.title,
        content: form.content,
        imageData: form.imageData,
        imageName: form.imageName,
      };

      if (isEditMode) {
        await updateBoardPost(postId, payload);
        navigate(`/board/${postId}`);
      } else {
        const created = await createBoardPost(payload);
        navigate(`/board/${created.id}`);
      }
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
              <h1 className="boardWriteLockedTitle">로그인 후 게시글을 작성할 수 있어요</h1>
              <p className="boardWriteLockedText">
                게시글 작성, 이미지 업로드, 댓글 기능은
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
                <h1 className="boardWriteTitle">
                  {isEditMode ? "게시글 수정" : "게시글 작성"}
                </h1>
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
                  <input
                    type="text"
                    value={form.category === "notice" ? "공지" : "자유"}
                    disabled
                  />
                </label>

                <label>
                  <span>작성자</span>
                  <input type="text" value={nickname} disabled />
                </label>

                {isAdmin ? (
                  <div className="full">
                    <div className="boardNoticeToggle">
                      <div className="boardNoticeToggleText">
                        <strong>공지로 등록하기</strong>
                        <span>켜두면 게시판 상단에 고정되고 공지 배지가 붙어요.</span>
                      </div>

                      <button
                        type="button"
                        className={`boardNoticeToggleBtn ${form.category === "notice" ? "isActive" : ""}`}
                        onClick={() =>
                          updateField(
                            "category",
                            form.category === "notice" ? "free" : "notice"
                          )
                        }
                        aria-pressed={form.category === "notice"}
                      >
                        <span className="boardNoticeToggleKnob" />
                      </button>
                    </div>
                  </div>
                ) : null}

                <label className="full">
                  <span>제목</span>
                  <input
                    type="text"
                    value={form.title}
                    placeholder="제목을 입력해주세요."
                    onChange={(event) => updateField("title", event.target.value)}
                  />
                </label>

                <label className="full">
                  <span>내용</span>
                  <textarea
                    value={form.content}
                    placeholder="내용을 입력해주세요."
                    onChange={(event) => updateField("content", event.target.value)}
                  />
                </label>

                <div className="full">
                  <span className="boardWriteFieldLabel">사진 업로드</span>

                  <div
                    className={`boardDropZone ${isDragging ? "isDragging" : ""}`}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsDragging(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
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

                    <div className="boardDropZoneIcon">+</div>
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
                        제거
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {submitError ? <div className="boardWriteError">{submitError}</div> : null}

              <div className="boardWriteActions">
                <button
                  type="button"
                  className="boardWriteGhostBtn"
                  onClick={() => navigate("/board")}
                >
                  취소
                </button>

                <button type="submit" className="boardWriteSubmitBtn">
                  {isEditMode ? "수정하기" : "등록하기"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
