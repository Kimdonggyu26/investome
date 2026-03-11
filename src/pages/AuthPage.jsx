import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import TopTickerBar from "../components/TopTickerBar";
import { useTicker } from "../hooks/useTicker";
import "../styles/AuthPage.css";

export default function AuthPage({ mode = "login" }) {
  const navigate = useNavigate();
  const { prices, changes, loading, error } = useTicker();

  const isLogin = mode === "login";

  function handleSubmit(e) {
    e.preventDefault();

    if (isLogin) {
      alert("로그인 기능은 추후 백엔드 연결 예정입니다.");
    } else {
      alert("회원가입 기능은 추후 백엔드 연결 예정입니다.");
      navigate("/login");
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
        <div className="authWrap">
          <section className="authVisual">
            <div className="authBadge">INVESTOME ACCOUNT</div>
            <h1 className="authVisualTitle">
              투자 정보를 더 똑똑하게,
              <br />
              나만의 계정으로 관리해보세요.
            </h1>
            <p className="authVisualDesc">
              로그인 후 관심종목, 포트폴리오, 게시판 활동을 한 곳에서 관리할 수 있도록
              준비 중이에요. 지금은 프론트 화면 구조를 먼저 완성하는 단계입니다.
            </p>

            <div className="authFeatureList">
              <div className="authFeatureItem">
                <span className="authFeatureDot" />
                관심종목 저장
              </div>
              <div className="authFeatureItem">
                <span className="authFeatureDot" />
                포트폴리오 관리
              </div>
              <div className="authFeatureItem">
                <span className="authFeatureDot" />
                게시판 글/댓글 활동
              </div>
            </div>
          </section>

          <section className="authCard">
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
              <h2 className="authTitle">
                {isLogin ? "로그인" : "회원가입"}
              </h2>
              <p className="authSub">
                {isLogin
                  ? "계정으로 로그인해서 내 정보와 활동을 확인해보세요."
                  : "Investome에서 사용할 계정을 만들어보세요."}
              </p>
            </div>

            <form className="authForm" onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="authField">
                  <label>닉네임</label>
                  <input type="text" placeholder="닉네임을 입력하세요" />
                </div>
              )}

              <div className="authField">
                <label>이메일</label>
                <input type="email" placeholder="example@email.com" />
              </div>

              <div className="authField">
                <label>비밀번호</label>
                <input type="password" placeholder="비밀번호를 입력하세요" />
              </div>

              {!isLogin && (
                <div className="authField">
                  <label>비밀번호 확인</label>
                  <input type="password" placeholder="비밀번호를 다시 입력하세요" />
                </div>
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