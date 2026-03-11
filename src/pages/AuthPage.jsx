import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import "../styles/AuthPage.css";

function validateSignup({ nickname, email, password, passwordConfirm }) {
  return {
    nickname:
      nickname.trim().length >= 2
        ? ""
        : "닉네임은 2자 이상 입력해주세요.",
    email: /\S+@\S+\.\S+/.test(email)
      ? ""
      : "올바른 이메일 형식을 입력해주세요.",
    password:
      password.length >= 8
        ? ""
        : "비밀번호는 8자 이상 입력해주세요.",
    passwordConfirm:
      password === passwordConfirm
        ? ""
        : "비밀번호 확인이 일치하지 않습니다.",
  };
}

export default function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();

  const isLogin = mode === "login";

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [keepLogin, setKeepLogin] = useState(true);

  const [form, setForm] = useState({
    nickname: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });

  const signupErrors = useMemo(() => validateSignup(form), [form]);

  const isSignupValid = useMemo(() => {
    return Object.values(signupErrors).every((v) => !v);
  }, [signupErrors]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (isLogin) {
      const mockUser = {
        nickname: "코직",
        email: form.email || "example@email.com",
      };

      localStorage.setItem("investome_logged_in", "true");
      localStorage.setItem("investome_user", JSON.stringify(mockUser));
      localStorage.setItem(
        "investome_keep_login",
        keepLogin ? "true" : "false"
      );

      alert("프론트 기준 로그인 상태로 전환했어요.");
      navigate("/");
      window.dispatchEvent(new Event("investome-auth-changed"));
      return;
    }

    if (!isSignupValid) {
      alert("회원가입 입력값을 다시 확인해주세요.");
      return;
    }

    alert("회원가입 UI 검증까지 완료했어요. 실제 가입 기능은 추후 백엔드 연결 예정입니다.");
    navigate("/login");
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

      <main className="authPage">
        <div className="authSingleWrap">
          <section className="authCard authCardSingle">
            <div className="authTabRow">
              <Link
                to="/login"
                className={`authTab ${isLogin ? "active" : ""}`}
              >
                로그인
              </Link>
              <Link
                to="/signup"
                className={`authTab ${!isLogin ? "active" : ""}`}
              >
                회원가입
              </Link>
            </div>

            <div className="authCardHeader">
              <h1 className="authTitle">
                {isLogin ? "로그인" : "회원가입"}
              </h1>
              <p className="authSub">
                {isLogin
                  ? "계정으로 로그인해서 관심종목, 포트폴리오, 게시판 활동을 관리해보세요."
                  : "Investome에서 사용할 계정을 만들고 나만의 투자 환경을 준비해보세요."}
              </p>
            </div>

            <form className="authForm" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="authField">
                  <label>닉네임</label>
                  <input
                    type="text"
                    placeholder="닉네임을 입력하세요"
                    value={form.nickname}
                    onChange={(e) => updateField("nickname", e.target.value)}
                  />
                  {form.nickname && signupErrors.nickname && (
                    <div className="authFieldError">{signupErrors.nickname}</div>
                  )}
                </div>
              )}

              <div className="authField">
                <label>이메일</label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
                {!isLogin && form.email && signupErrors.email && (
                  <div className="authFieldError">{signupErrors.email}</div>
                )}
              </div>

              <div className="authField">
                <label>비밀번호</label>
                <div className="authInputWrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="비밀번호를 입력하세요"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                  />
                  <button
                    type="button"
                    className="authToggleBtn"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "숨김" : "보기"}
                  </button>
                </div>
                {!isLogin && form.password && signupErrors.password && (
                  <div className="authFieldError">{signupErrors.password}</div>
                )}
              </div>

              {!isLogin && (
                <div className="authField">
                  <label>비밀번호 확인</label>
                  <div className="authInputWrap">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      placeholder="비밀번호를 다시 입력하세요"
                      value={form.passwordConfirm}
                      onChange={(e) =>
                        updateField("passwordConfirm", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="authToggleBtn"
                      onClick={() =>
                        setShowPasswordConfirm((prev) => !prev)
                      }
                    >
                      {showPasswordConfirm ? "숨김" : "보기"}
                    </button>
                  </div>
                  {form.passwordConfirm && signupErrors.passwordConfirm && (
                    <div className="authFieldError">
                      {signupErrors.passwordConfirm}
                    </div>
                  )}
                </div>
              )}

              {isLogin && (
                <label className="authCheckRow">
                  <input
                    type="checkbox"
                    checked={keepLogin}
                    onChange={(e) => setKeepLogin(e.target.checked)}
                  />
                  <span>로그인 상태 유지</span>
                </label>
              )}

              <button type="submit" className="authSubmitBtn">
                {isLogin ? "로그인" : "회원가입"}
              </button>
            </form>

            <div className="authDivider">
              <span>또는</span>
            </div>

            <div className="authSocialRow">
              <button type="button" className="authSocialBtn">
                Google로 계속하기
              </button>
              <button type="button" className="authSocialBtn">
                Kakao로 계속하기
              </button>
              <button type="button" className="authSocialBtn">
                Naver로 계속하기
              </button>
            </div>

            <div className="authBottomText">
              {isLogin ? (
                <>
                  아직 계정이 없나요? <Link to="/signup">회원가입</Link>
                </>
              ) : (
                <>
                  이미 계정이 있나요? <Link to="/login">로그인</Link>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}