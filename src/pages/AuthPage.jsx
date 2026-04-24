import { useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import TurnstileWidget from "../components/TurnstileWidget";
import { useTicker } from "../hooks/useTicker";
import "../styles/AuthPage.css";
import { apiUrl } from "../lib/apiClient";
import { storeAuthSession } from "../utils/auth";

const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || "").trim();

function validateSignup({ nickname, email, password, passwordConfirm }) {
  return {
    nickname: nickname.trim().length >= 2 ? "" : "닉네임은 2자 이상 입력해주세요.",
    email: /\S+@\S+\.\S+/.test(email) ? "" : "올바른 이메일 형식을 입력해주세요.",
    password: password.length >= 8 ? "" : "비밀번호는 8자 이상 입력해주세요.",
    passwordConfirm:
      password === passwordConfirm ? "" : "비밀번호 확인이 일치하지 않습니다.",
  };
}

async function readAuthError(res, fallback) {
  const text = await res.text().catch(() => "");

  try {
    const parsed = text ? JSON.parse(text) : null;
    if (parsed?.message) return parsed.message;
    if (parsed?.error) return String(parsed.error);
  } catch {
    // plain text response
  }

  return text || fallback;
}

function normalizeAuthMessage(message = "") {
  switch (String(message).trim()) {
    case "DUPLICATE_NICKNAME":
      return "이미 사용 중인 닉네임입니다.";
    case "DUPLICATE_EMAIL":
      return "이미 가입된 이메일입니다.";
    case "EMAIL_NOT_FOUND":
      return "가입된 이메일이 없습니다.";
    case "INVALID_CREDENTIALS":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "INVALID_REFRESH_TOKEN":
      return "로그인 상태가 만료되었습니다. 다시 로그인해주세요.";
    default:
      return message;
  }
}

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  const { prices, changes, loading, error } = useTicker();

  const [signupForm, setSignupForm] = useState({
    nickname: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [keepLogin, setKeepLogin] = useState(false);
  const [loginTurnstileToken, setLoginTurnstileToken] = useState("");
  const [signupTurnstileToken, setSignupTurnstileToken] = useState("");
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const loginEmailRef = useRef(null);
  const loginPasswordRef = useRef(null);

  const signupErrors = useMemo(() => validateSignup(signupForm), [signupForm]);

  function updateSignupField(field, value) {
    setSignupForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function updateLoginField(field, value) {
    setLoginForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetTurnstile() {
    setTurnstileResetKey((prev) => prev + 1);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const submitted = new FormData(event.currentTarget);
    const submittedNickname = String(submitted.get("nickname") || "").trim();
    const submittedEmail = String(submitted.get("email") || "").trim();
    const submittedPassword = String(submitted.get("password") || "");
    const submittedPasswordConfirm = String(submitted.get("passwordConfirm") || "");

    if (TURNSTILE_SITE_KEY && isLogin && !loginTurnstileToken) {
      alert("보안 확인을 완료해주세요.");
      return;
    }

    if (TURNSTILE_SITE_KEY && !isLogin && !signupTurnstileToken) {
      alert("보안 확인을 완료해주세요.");
      return;
    }

    if (isLogin) {
      const submittedLoginEmail = String(
        loginEmailRef.current?.value ?? submittedEmail ?? loginForm.email ?? ""
      ).trim();
      const submittedLoginPassword = String(
        loginPasswordRef.current?.value ?? submittedPassword ?? loginForm.password ?? ""
      );

      try {
        const res = await fetch(apiUrl("/api/auth/login"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: submittedLoginEmail,
            password: submittedLoginPassword,
            keepLogin,
            turnstileToken: loginTurnstileToken,
          }),
        });

        if (!res.ok) {
          throw new Error(
            normalizeAuthMessage(await readAuthError(res, "로그인에 실패했습니다."))
          );
        }

        const data = await res.json();
        storeAuthSession(data, keepLogin);
        window.dispatchEvent(new Event("investome-auth-changed"));
        navigate("/mypage");
      } catch (submitError) {
        alert(
          normalizeAuthMessage(
            submitError.message || "이메일 또는 비밀번호가 올바르지 않습니다."
          )
        );
        resetTurnstile();
      }
      return;
    }

    const nextSignupState = {
      nickname: submittedNickname,
      email: submittedEmail,
      password: submittedPassword,
      passwordConfirm: submittedPasswordConfirm,
    };

    setSignupForm(nextSignupState);

    const nextSignupErrors = validateSignup(nextSignupState);
    const signupValid = Object.values(nextSignupErrors).every((value) => value === "");

    if (!signupValid) {
      alert("회원가입 입력값을 다시 확인해주세요.");
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: submittedEmail,
          password: submittedPassword,
          nickname: submittedNickname,
          turnstileToken: signupTurnstileToken,
        }),
      });

      if (!res.ok) {
        throw new Error(
          normalizeAuthMessage(await readAuthError(res, "회원가입에 실패했습니다."))
        );
      }

      alert("회원가입이 완료되었어요. 로그인해 주세요.");
      navigate("/login");
    } catch (submitError) {
      alert(normalizeAuthMessage(submitError.message || "회원가입에 실패했습니다."));
      resetTurnstile();
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

      <main className="authPage">
        <div className="authSingleWrap">
          <section className="authCard authCardSingle">
            <div className="authTopArea">
              <div className="authTabRowWrap">
                <div className="authTabRow">
                  <Link to="/login" className={`authTab ${isLogin ? "active" : ""}`}>
                    로그인
                  </Link>
                  <Link to="/signup" className={`authTab ${!isLogin ? "active" : ""}`}>
                    회원가입
                  </Link>
                </div>

                {isLogin && <div className="authSignupHint">10초면 돼요!</div>}
              </div>
            </div>

            <div className="authCardHeader">
              <h1 className="authTitle">{isLogin ? "로그인" : "회원가입"}</h1>
              <p className="authSub">
                {isLogin
                  ? "계정으로 로그인하면 관심종목, 포트폴리오, 게시판 활동을 한곳에서 관리할 수 있어요."
                  : "빠르게 가입하고 관심종목, 포트폴리오, 게시판 기능을 바로 이용해보세요."}
              </p>
            </div>

            <form
              key={isLogin ? "login-form" : "signup-form"}
              className="authForm"
              onSubmit={handleSubmit}
              autoComplete="on"
            >
              {!isLogin && (
                <div className="authField">
                  <label>닉네임</label>
                  <input
                    type="text"
                    name="nickname"
                    autoComplete="nickname"
                    placeholder="닉네임을 입력해주세요"
                    value={signupForm.nickname}
                    onChange={(event) => updateSignupField("nickname", event.target.value)}
                  />
                  {signupForm.nickname && signupErrors.nickname && (
                    <div className="authFieldError">{signupErrors.nickname}</div>
                  )}
                </div>
              )}

              <div className="authField">
                <label>이메일</label>
                {isLogin ? (
                  <input
                    ref={loginEmailRef}
                    type="email"
                    name="email"
                    autoComplete="username email"
                    placeholder="example@email.com"
                    value={loginForm.email}
                    onChange={(event) => updateLoginField("email", event.target.value)}
                    onInput={(event) => updateLoginField("email", event.target.value)}
                  />
                ) : (
                  <>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="example@email.com"
                      value={signupForm.email}
                      onChange={(event) => updateSignupField("email", event.target.value)}
                    />
                    {signupForm.email && signupErrors.email && (
                      <div className="authFieldError">{signupErrors.email}</div>
                    )}
                  </>
                )}
              </div>

              <div className="authField">
                <label>비밀번호</label>
                <div className="authInputWrap">
                  {isLogin ? (
                    <input
                      ref={loginPasswordRef}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      placeholder="비밀번호를 입력해주세요"
                      value={loginForm.password}
                      onChange={(event) => updateLoginField("password", event.target.value)}
                      onInput={(event) => updateLoginField("password", event.target.value)}
                    />
                  ) : (
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      placeholder="비밀번호를 입력해주세요"
                      value={signupForm.password}
                      onChange={(event) => updateSignupField("password", event.target.value)}
                    />
                  )}

                  <button
                    type="button"
                    className="authToggleBtn"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "숨김" : "보기"}
                  </button>
                </div>
                {!isLogin && signupForm.password && signupErrors.password && (
                  <div className="authFieldError">{signupErrors.password}</div>
                )}
              </div>

              {!isLogin && (
                <div className="authField">
                  <label>비밀번호 확인</label>
                  <div className="authInputWrap">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      name="passwordConfirm"
                      autoComplete="new-password"
                      placeholder="비밀번호를 다시 입력해주세요"
                      value={signupForm.passwordConfirm}
                      onChange={(event) =>
                        updateSignupField("passwordConfirm", event.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="authToggleBtn"
                      onClick={() => setShowPasswordConfirm((prev) => !prev)}
                    >
                      {showPasswordConfirm ? "숨김" : "보기"}
                    </button>
                  </div>
                  {signupForm.passwordConfirm && signupErrors.passwordConfirm && (
                    <div className="authFieldError">{signupErrors.passwordConfirm}</div>
                  )}
                </div>
              )}

              {TURNSTILE_SITE_KEY ? (
                <TurnstileWidget
                  siteKey={TURNSTILE_SITE_KEY}
                  resetKey={`${isLogin ? "login" : "signup"}-${turnstileResetKey}`}
                  onTokenChange={isLogin ? setLoginTurnstileToken : setSignupTurnstileToken}
                />
              ) : null}

              {isLogin && (
                <label className="authCheckRow">
                  <input
                    type="checkbox"
                    name="keepLogin"
                    checked={keepLogin}
                    onChange={(event) => setKeepLogin(event.target.checked)}
                  />
                  <span>로그인 상태 유지</span>
                </label>
              )}

              <button type="submit" className="authSubmitBtn">
                {isLogin ? "로그인" : "회원가입"}
              </button>
            </form>

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
