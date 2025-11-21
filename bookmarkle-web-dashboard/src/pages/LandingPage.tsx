import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Search,
  Folder,
  Chrome,
  Zap,
  Shield,
  Globe,
  Sparkles,
  ArrowRight,
  Check,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    // 로그인 페이지로 네비게이션
    navigate("/login");
  };

  const features = [
    {
      icon: BookOpen,
      title: t("landing.features.smartBookmarking.title", {
        defaultValue: "스마트 북마킹",
      }),
      description: t("landing.features.smartBookmarking.description", {
        defaultValue:
          "원하는 웹페이지를 한 번에 저장하고 자동으로 분류합니다.",
      }),
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Search,
      title: t("landing.features.powerfulSearch.title", {
        defaultValue: "강력한 검색",
      }),
      description: t("landing.features.powerfulSearch.description", {
        defaultValue: "수천 개의 북마크도 빠르게 찾을 수 있는 검색 기능.",
      }),
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: Folder,
      title: t("landing.features.collections.title", {
        defaultValue: "컬렉션 관리",
      }),
      description: t("landing.features.collections.description", {
        defaultValue: "북마크를 컬렉션으로 체계적으로 정리하세요.",
      }),
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Chrome,
      title: t("landing.features.browserExtension.title", {
        defaultValue: "브라우저 확장",
      }),
      description: t("landing.features.browserExtension.description", {
        defaultValue: "Chrome 확장 프로그램으로 한 번의 클릭으로 저장.",
      }),
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Zap,
      title: t("landing.features.lightningFast.title", {
        defaultValue: "빠른 속도",
      }),
      description: t("landing.features.lightningFast.description", {
        defaultValue: "실시간 동기화로 모든 기기에서 즉시 접근.",
      }),
      color: "from-yellow-500 to-amber-500",
    },
    {
      icon: Shield,
      title: t("landing.features.secure.title", {
        defaultValue: "안전한 저장",
      }),
      description: t("landing.features.secure.description", {
        defaultValue: "Firebase로 암호화된 안전한 북마크 저장소.",
      }),
      color: "from-indigo-500 to-blue-500",
    },
  ];

  const steps = [
    {
      number: "01",
      title: t("landing.howItWorks.step1.title", {
        defaultValue: "계정 만들기",
      }),
      description: t("landing.howItWorks.step1.description", {
        defaultValue: "Google 계정으로 간편하게 가입하세요.",
      }),
    },
    {
      number: "02",
      title: t("landing.howItWorks.step2.title", {
        defaultValue: "확장 프로그램 설치",
      }),
      description: t("landing.howItWorks.step2.description", {
        defaultValue: "Chrome 웹 스토어에서 북마클 확장 프로그램을 설치하세요.",
      }),
    },
    {
      number: "03",
      title: t("landing.howItWorks.step3.title", {
        defaultValue: "북마크 저장하기",
      }),
      description: t("landing.howItWorks.step3.description", {
        defaultValue: "원하는 웹페이지에서 확장 프로그램 아이콘을 클릭하세요.",
      }),
    },
    {
      number: "04",
      title: t("landing.howItWorks.step4.title", {
        defaultValue: "관리하고 즐기기",
      }),
      description: t("landing.howItWorks.step4.description", {
        defaultValue: "대시보드에서 북마크를 정리하고 편리하게 관리하세요.",
      }),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-brand-50 to-accent-100 dark:from-gray-900 dark:via-brand-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg z-50 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-8 h-8 text-brand-600 dark:text-brand-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {t("common.appName", { defaultValue: "북마클" })}
              </span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              <a
                href="#features"
                className="text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                {t("landing.nav.features", { defaultValue: "기능" })}
              </a>
              <a
                href="#how-it-works"
                className="text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                {t("landing.nav.howItWorks", { defaultValue: "사용법" })}
              </a>
              <a
                href="https://chromewebstore.google.com/detail/%EB%B6%81%EB%A7%88%ED%81%B4/lkkbdejelaagaipenlheijafnjggkdcm?hl=ko"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center space-x-2"
              >
                <Chrome className="w-4 h-4" />
                <span>{t("landing.nav.chromeInstall", { defaultValue: "Chrome 설치" })}</span>
              </a>
              <button
                onClick={handleGetStarted}
                className="btn-secondary flex items-center space-x-2"
              >
                <span>{t("landing.nav.getStarted", { defaultValue: "시작하기" })}</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden text-gray-700 dark:text-gray-300"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-4">
              <a
                href="#features"
                className="block text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("landing.nav.features", { defaultValue: "기능" })}
              </a>
              <a
                href="#how-it-works"
                className="block text-gray-700 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("landing.nav.howItWorks", { defaultValue: "사용법" })}
              </a>
              <a
                href="https://chromewebstore.google.com/detail/%EB%B6%81%EB%A7%88%ED%81%B4/lkkbdejelaagaipenlheijafnjggkdcm?hl=ko"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full flex items-center justify-center space-x-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Chrome className="w-4 h-4" />
                <span>{t("landing.nav.chromeInstall", { defaultValue: "Chrome 설치" })}</span>
              </a>
              <button
                onClick={() => {
                  handleGetStarted();
                  setMobileMenuOpen(false);
                }}
                className="btn-secondary w-full flex items-center justify-center space-x-2"
              >
                <span>{t("landing.nav.getStarted", { defaultValue: "시작하기" })}</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              {t("landing.hero.badge", {
                defaultValue: "나만의 스마트 북마크 관리자",
              })}
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            {t("landing.hero.title", {
              defaultValue: "북마크를",
            })}
            <br />
            <span className="bg-gradient-to-r from-brand-600 to-accent-600 bg-clip-text text-transparent">
              {t("landing.hero.titleHighlight", {
                defaultValue: "똑똑하게",
              })}
            </span>
            <br />
            {t("landing.hero.titleEnd", {
              defaultValue: "관리하세요",
            })}
          </h1>

          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {t("landing.hero.description", {
              defaultValue:
                "원하는 웹페이지를 한 번에 저장하고 간편하게 관리하는 나만의 책갈피 클립북",
            })}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://chromewebstore.google.com/detail/%EB%B6%81%EB%A7%88%ED%81%B4/lkkbdejelaagaipenlheijafnjggkdcm?hl=ko"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-lg px-8 py-4 flex items-center space-x-2 group"
            >
              <Chrome className="w-5 h-5" />
              <span>{t("landing.hero.chromeInstall", { defaultValue: "Chrome에서 설치하기" })}</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            <button
              onClick={handleGetStarted}
              className="btn-secondary text-lg px-8 py-4 flex items-center space-x-2"
            >
              <span>{t("landing.hero.cta", { defaultValue: "무료로 시작하기" })}</span>
            </button>
            <a
              href="#features"
              className="btn-ghost text-lg px-8 py-4 flex items-center space-x-2"
            >
              <Globe className="w-5 h-5" />
              <span>{t("landing.hero.learnMore", { defaultValue: "자세히 알아보기" })}</span>
            </a>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-brand-600 dark:text-brand-400 mb-2">
                500+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {t("landing.stats.bookmarks", { defaultValue: "무료 북마크" })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-brand-600 dark:text-brand-400 mb-2">
                10+
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {t("landing.stats.collections", { defaultValue: "컬렉션" })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-brand-600 dark:text-brand-400 mb-2">
                <Zap className="w-8 h-8 inline-block" />
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {t("landing.stats.fast", { defaultValue: "빠른 검색" })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-brand-600 dark:text-brand-400 mb-2">
                <Shield className="w-8 h-8 inline-block" />
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {t("landing.stats.secure", { defaultValue: "안전한 저장" })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              {t("landing.features.title", { defaultValue: "강력한 기능들" })}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t("landing.features.subtitle", {
                defaultValue: "북마크 관리를 위한 모든 기능을 제공합니다",
              })}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              >
                <div
                  className={`w-16 h-16 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-brand-50 to-accent-50 dark:from-gray-800 dark:to-gray-900"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              {t("landing.howItWorks.title", { defaultValue: "간단한 사용법" })}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t("landing.howItWorks.subtitle", {
                defaultValue: "4단계로 시작하세요",
              })}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              >
                <div className="absolute -top-4 -left-4 w-16 h-16 bg-gradient-to-r from-brand-600 to-accent-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-4">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                    <ArrowRight className="w-8 h-8 text-brand-600 dark:text-brand-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="login-section"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-brand-600 to-accent-600"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t("landing.cta.title", {
              defaultValue: "지금 바로 시작하세요",
            })}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {t("landing.cta.description", {
              defaultValue:
                "무료로 가입하고 북마크를 체계적으로 관리해보세요. Google 계정으로 간편하게 시작할 수 있습니다.",
            })}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://chromewebstore.google.com/detail/%EB%B6%81%EB%A7%88%ED%81%B4/lkkbdejelaagaipenlheijafnjggkdcm?hl=ko"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-brand-600 hover:bg-gray-50 font-bold text-lg px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2"
            >
              <Chrome className="w-5 h-5" />
              <span>{t("landing.cta.chromeInstall", { defaultValue: "Chrome에서 설치하기" })}</span>
              <ArrowRight className="w-5 h-5" />
            </a>
            <button
              onClick={() => navigate("/login")}
              className="bg-white/10 backdrop-blur-lg text-white hover:bg-white/20 font-bold text-lg px-8 py-4 rounded-2xl border border-white/30 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center space-x-2"
            >
              <span>{t("landing.cta.button", { defaultValue: "무료로 시작하기" })}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <Check className="w-6 h-6 text-white mb-2 mx-auto" />
              <p className="text-white font-medium">
                {t("landing.cta.feature1", { defaultValue: "무료 플랜 제공" })}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <Check className="w-6 h-6 text-white mb-2 mx-auto" />
              <p className="text-white font-medium">
                {t("landing.cta.feature2", { defaultValue: "빠른 가입 절차" })}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <Check className="w-6 h-6 text-white mb-2 mx-auto" />
              <p className="text-white font-medium">
                {t("landing.cta.feature3", { defaultValue: "모든 기능 무료 체험" })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <BookOpen className="w-6 h-6 text-brand-400" />
              <span className="text-lg font-bold text-white">
                {t("common.appName", { defaultValue: "북마클" })}
              </span>
            </div>
            <div className="text-sm">
              {t("landing.footer.copyright", {
                defaultValue: "© 2024 북마클. All rights reserved.",
              })}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

