import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Search,
  Folder,
  Puzzle,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  Menu,
  X,
  Star,
  Layers,
  RefreshCw,
} from "lucide-react";

const Chrome = Puzzle;

const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/%EB%B6%81%EB%A7%88%ED%81%B4/lkkbdejelaagaipenlheijafnjggkdcm?hl=ko";

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      icon: BookOpen,
      label: "스마트 저장",
      desc: "원클릭으로 저장, 자동 분류",
      size: "col-span-1 row-span-2",
      accent: "from-violet-500 to-purple-600",
      bg: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      icon: Search,
      label: "즉시 검색",
      desc: "수천 개도 0.1초 내 검색",
      size: "col-span-1 row-span-1",
      accent: "from-sky-400 to-cyan-500",
      bg: "bg-sky-50 dark:bg-sky-950/40",
    },
    {
      icon: Chrome,
      label: "브라우저 확장",
      desc: "Chrome 확장 프로그램 연동",
      size: "col-span-1 row-span-1",
      accent: "from-orange-400 to-red-500",
      bg: "bg-orange-50 dark:bg-orange-950/40",
    },
    {
      icon: Folder,
      label: "컬렉션",
      desc: "폴더처럼 체계적인 정리",
      size: "col-span-1 row-span-1",
      accent: "from-emerald-400 to-teal-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      icon: Zap,
      label: "실시간 동기화",
      desc: "모든 기기에서 즉시 반영",
      size: "col-span-1 row-span-1",
      accent: "from-yellow-400 to-amber-500",
      bg: "bg-yellow-50 dark:bg-yellow-950/40",
    },
    {
      icon: Shield,
      label: "Firebase 보안",
      desc: "암호화된 안전한 저장소",
      size: "col-span-2 row-span-1",
      accent: "from-indigo-500 to-blue-600",
      bg: "bg-indigo-50 dark:bg-indigo-950/40",
    },
  ];

  const stats = [
    { value: "500+", label: "무료 북마크" },
    { value: "10+", label: "컬렉션 제공" },
    { value: "3개국어", label: "다국어 지원" },
    { value: "무료", label: "지금 시작" },
  ];

  const steps = [
    { num: "01", icon: Globe, title: "Google 로그인", desc: "계정 없이 Google로 즉시 시작" },
    { num: "02", icon: Chrome, title: "확장 설치", desc: "Chrome 웹 스토어에서 한 번에 설치" },
    { num: "03", icon: Layers, title: "북마크 저장", desc: "원하는 페이지에서 아이콘 클릭" },
    { num: "04", icon: RefreshCw, title: "어디서나 접근", desc: "대시보드에서 바로 관리" },
  ];

  const heroAnim = useInView(0.1);
  const featuresAnim = useInView(0.1);
  const stepsAnim = useInView(0.1);
  const ctaAnim = useInView(0.1);

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white overflow-x-hidden">
      {/* Gradient mesh background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-violet-400/20 to-purple-600/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-sky-400/15 to-cyan-500/10 blur-[100px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-indigo-400/10 to-violet-400/10 blur-[120px]" />
      </div>

      {/* ── Floating Nav ── */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4">
        <nav
          className={`max-w-5xl mx-auto transition-all duration-300 ${
            scrolled
              ? "bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl shadow-soft border border-gray-200/60 dark:border-gray-700/60"
              : "bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-white/30 dark:border-gray-700/30"
          } rounded-2xl px-5 py-3 flex items-center justify-between`}
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">북마클</span>
          </div>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { href: "#features", label: "기능" },
              { href: "#how-it-works", label: "사용법" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/70 dark:hover:bg-gray-800/70 transition-all"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-2">
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              <Chrome className="w-3.5 h-3.5" />
              Chrome 설치
            </a>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white transition-all shadow-sm"
            >
              시작하기
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="메뉴"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden mt-2 max-w-5xl mx-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-soft p-4 flex flex-col gap-2">
            <a href="#features" className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" onClick={() => setMenuOpen(false)}>기능</a>
            <a href="#how-it-works" className="px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" onClick={() => setMenuOpen(false)}>사용법</a>
            <hr className="border-gray-200 dark:border-gray-700" />
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 transition-all" onClick={() => setMenuOpen(false)}>
              <Chrome className="w-4 h-4" /> Chrome 설치
            </a>
            <button onClick={() => { navigate("/"); setMenuOpen(false); }} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-500 to-purple-600 text-white transition-all">
              무료로 시작하기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16">
        <div
          ref={heroAnim.ref}
          className={`text-center max-w-4xl mx-auto transition-all duration-700 ${
            heroAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-sm font-medium mb-8 border border-violet-200/60 dark:border-violet-700/40">
            <Star className="w-3.5 h-3.5 fill-current" />
            나만의 스마트 북마크 관리자
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight mb-6">
            <span className="block text-gray-900 dark:text-white">북마크를</span>
            <span className="block bg-gradient-to-r from-violet-600 via-purple-500 to-sky-500 bg-clip-text text-transparent">
              똑똑하게
            </span>
            <span className="block text-gray-900 dark:text-white">관리하세요</span>
          </h1>

          {/* Sub */}
          <p className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            원하는 웹페이지를 한 번에 저장하고 간편하게 관리하는<br className="hidden sm:block" />
            나만의 책갈피 클립북
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:-translate-y-0.5"
            >
              무료로 시작하기
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all duration-300 hover:-translate-y-0.5"
            >
              <Chrome className="w-4 h-4" />
              Chrome 설치
            </a>
          </div>

          {/* Trust strip */}
          <p className="mt-6 text-sm text-gray-400 dark:text-gray-500">
            무료 플랜 제공 · 신용카드 불필요 · Google 계정으로 즉시 시작
          </p>
        </div>

        {/* Stats */}
        <div className="w-full max-w-3xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center py-5 px-4 rounded-2xl bg-gray-50/80 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 backdrop-blur-sm"
            >
              <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-500 bg-clip-text text-transparent mb-1">
                {s.value}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Bento ── */}
      <section id="features" className="px-4 py-24">
        <div className="max-w-5xl mx-auto">
          <div
            ref={featuresAnim.ref}
            className={`transition-all duration-700 ${
              featuresAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="mb-12 text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-3 block">기능</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                모든 것이 하나에
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                북마크 관리에 필요한 기능을 하나의 앱에서
              </p>
            </div>

            {/* Bento grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[160px]">
              {features.map((f, i) => (
                <div
                  key={i}
                  className={`${f.size} ${f.bg} rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:scale-[1.02] hover:shadow-soft-lg transition-all duration-300 flex flex-col justify-between overflow-hidden relative group`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.accent} flex items-center justify-center shadow-sm`}>
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  {/* Text */}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base leading-tight">{f.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                  {/* Decorative blob */}
                  <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${f.accent} opacity-10 group-hover:opacity-20 transition-opacity blur-sm`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="px-4 py-24 bg-gray-50/60 dark:bg-gray-900/60">
        <div className="max-w-5xl mx-auto">
          <div
            ref={stepsAnim.ref}
            className={`transition-all duration-700 ${
              stepsAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="mb-14 text-center">
              <span className="text-xs font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-3 block">사용법</span>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
                4단계면 끝
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                복잡한 설정 없이 바로 시작하세요
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {steps.map((s, i) => (
                <div key={i} className="relative">
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-violet-300 to-transparent dark:from-violet-700 z-0 -translate-y-1/2" style={{ width: "calc(100% - 2rem)", left: "calc(50% + 1.5rem)" }} />
                  )}
                  <div className="relative z-10 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-bold text-violet-400 dark:text-violet-500 font-mono">{s.num}</span>
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <s.icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1.5">{s.title}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div
            ref={ctaAnim.ref}
            className={`transition-all duration-700 ${
              ctaAnim.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-12 md:p-16 text-center">
              {/* Mesh overlay */}
              <div className="absolute inset-0 pointer-events-none" aria-hidden>
                <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
              </div>

              <div className="relative z-10">
                <span className="inline-block text-xs font-semibold uppercase tracking-widest text-violet-200 mb-4">지금 시작하세요</span>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
                  북마크 관리,<br />이제 다르게
                </h2>
                <p className="text-violet-200 mb-10 max-w-md mx-auto leading-relaxed">
                  무료 플랜으로 시작하고, 필요할 때 업그레이드하세요.<br />신용카드가 필요 없습니다.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={() => navigate("/")}
                    className="group flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold bg-white text-violet-700 hover:bg-violet-50 shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                  >
                    무료로 시작하기
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <a
                    href={CHROME_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-300 hover:-translate-y-0.5 backdrop-blur-sm"
                  >
                    <Chrome className="w-4 h-4" />
                    Chrome 설치
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-violet-200">
                  {["무료 플랜 제공", "빠른 가입", "모든 기능 체험"].map((item) => (
                    <span key={item} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-violet-300 inline-block" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-4 py-10 border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight">북마클</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            © 2026 북마클. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <a href={CHROME_STORE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Chrome 웹 스토어</a>
            <button onClick={() => navigate("/")} className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">로그인</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
