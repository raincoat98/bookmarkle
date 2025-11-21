import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, ArrowLeft, Search } from "lucide-react";
import { useAuthStore } from "../stores";

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleGoHome = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        {/* 404 숫자 */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-purple-600 dark:from-brand-400 dark:to-purple-500">
            404
          </h1>
        </div>

        {/* 메시지 */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {t("notFound.title", {
              defaultValue: "페이지를 찾을 수 없습니다",
            })}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            {t("notFound.description", {
              defaultValue:
                "요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.",
            })}
          </p>
        </div>

        {/* 아이콘 */}
        <div className="mb-8 flex justify-center">
          <div className="p-6 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Search className="w-12 h-12 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoBack}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            {t("notFound.goBack", { defaultValue: "이전 페이지" })}
          </button>
          <button
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors font-medium"
          >
            <Home className="w-5 h-5" />
            {t("notFound.goHome", {
              defaultValue: user ? "대시보드로 이동" : "홈으로 이동",
            })}
          </button>
        </div>

        {/* 추가 안내 */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {t("notFound.helpText", {
              defaultValue: "문제가 계속되면 고객 지원팀에 문의해주세요.",
            })}
          </p>
        </div>
      </div>
    </div>
  );
};
