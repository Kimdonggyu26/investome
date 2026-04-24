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
    nickname: nickname.trim().length >= 2 ? "" : "?됰꽕?꾩? 2???댁긽 ?낅젰?댁＜?몄슂.",
    email: /\S+@\S+\.\S+/.test(email) ? "" : "?щ컮瑜??대찓???뺤떇???낅젰?댁＜?몄슂.",
    password: password.length >= 8 ? "" : "鍮꾨?踰덊샇??8???댁긽 ?낅젰?댁＜?몄슂.",
    passwordConfirm:
      password === passwordConfirm ? "" : "鍮꾨?踰덊샇 ?뺤씤???쇱튂?섏? ?딆뒿?덈떎.",
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
      return "?대? ?ъ슜 以묒씤 ?됰꽕?꾩엯?덈떎.";
    case "DUPLICATE_EMAIL":
      return "?대? 媛?낅맂 ?대찓?쇱엯?덈떎.";
    case "EMAIL_NOT_FOUND":
      return "媛?낅맂 ?대찓?쇱씠 ?놁뒿?덈떎.";
    case "INVALID_CREDENTIALS":
      return "?대찓???먮뒗 鍮꾨?踰덊샇媛 ?щ컮瑜댁? ?딆뒿?덈떎.";
    case "INVALID_REFRESH_TOKEN":
      return "濡쒓렇???곹깭媛 留뚮즺?섏뿀?듬땲?? ?ㅼ떆 濡쒓렇?명빐二쇱꽭??";
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
      alert("蹂댁븞 ?뺤씤???꾨즺?댁＜?몄슂.");
      return;
    }

    if (TURNSTILE_SITE_KEY && !isLogin && !signupTurnstileToken) {
      alert("蹂댁븞 ?뺤씤???꾨즺?댁＜?몄슂.");
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
          throw new Error(normalizeAuthMessage(await readAuthError(res, "로그인에 실패했습니다.")));
        }

        const data = await res.json();
        storeAuthSession(data, keepLogin);
        window.dispatchEvent(new Event("investome-auth-changed"));
        navigate("/mypage");
      } catch (error) {
        alert(normalizeAuthMessage(error.message || "이메일 또는 비밀번호가 올바르지 않습니다."));
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
      alert("?뚯썝媛???낅젰媛믪쓣 ?ㅼ떆 ?뺤씤?댁＜?몄슂.");
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
        throw new Error(normalizeAuthMessage(await readAuthError(res, "회원가입에 실패했습니다.")));
      }

      alert("?뚯썝媛?낆씠 ?꾨즺?먯뼱?? 濡쒓렇?명빐 二쇱꽭??");
      navigate("/login");
    } catch (error) {
      alert(normalizeAuthMessage(error.message || "회원가입에 실패했습니다."));
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
                    濡쒓렇??                  </Link>
                  <Link to="/signup" className={`authTab ${!isLogin ? "active" : ""}`}>
                    ?뚯썝媛??                  </Link>
                </div>

                {isLogin && <div className="authSignupHint">10珥덈㈃ ?쇱슂!</div>}
              </div>
            </div>

            <div className="authCardHeader">
              <h1 className="authTitle">{isLogin ? "로그인" : "회원가입"}</h1>
              <p className="authSub">
                {isLogin
                  ? "怨꾩젙?쇰줈 濡쒓렇?명븯硫?愿?ъ쥌紐? ?ы듃?대━?? 寃뚯떆???쒕룞???쒓납?먯꽌 愿由ы븷 ???덉뼱??"
                  : "鍮좊Ⅴ寃?媛?낇븯怨?愿?ъ쥌紐? ?ы듃?대━?? 寃뚯떆??湲곕뒫??諛붾줈 ?댁슜?대낫?몄슂."}
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
                    placeholder="?됰꽕?꾩쓣 ?낅젰?댁＜?몄슂"
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
                <label>鍮꾨?踰덊샇</label>
                <div className="authInputWrap">
                  {isLogin ? (
                    <input
                      ref={loginPasswordRef}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="current-password"
                      placeholder="鍮꾨?踰덊샇瑜??낅젰?댁＜?몄슂"
                      value={loginForm.password}
                      onChange={(event) => updateLoginField("password", event.target.value)}
                      onInput={(event) => updateLoginField("password", event.target.value)}
                    />
                  ) : (
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      placeholder="鍮꾨?踰덊샇瑜??낅젰?댁＜?몄슂"
                      value={signupForm.password}
                      onChange={(event) => updateSignupField("password", event.target.value)}
                    />
                  )}

                  <button
                    type="button"
                    className="authToggleBtn"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "?④?" : "蹂닿린"}
                  </button>
                </div>
                {!isLogin && signupForm.password && signupErrors.password && (
                  <div className="authFieldError">{signupErrors.password}</div>
                )}
              </div>

              {!isLogin && (
                <div className="authField">
                  <label>鍮꾨?踰덊샇 ?뺤씤</label>
                  <div className="authInputWrap">
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      name="passwordConfirm"
                      autoComplete="new-password"
                      placeholder="鍮꾨?踰덊샇瑜??ㅼ떆 ?낅젰?댁＜?몄슂"
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
                      {showPasswordConfirm ? "?④?" : "蹂닿린"}
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
                  <span>濡쒓렇???곹깭 ?좎?</span>
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
