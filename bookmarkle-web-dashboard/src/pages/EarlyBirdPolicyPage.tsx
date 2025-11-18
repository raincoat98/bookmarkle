import { Header } from "../components/Header";
import { Gift, Check, X, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export const EarlyBirdPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 뒤로가기 버튼 */}
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>돌아가기</span>
        </Link>

        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mb-6">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🏅 얼리유저(Early Bird) 혜택 정책
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            북마클은 베타 기간 동안 가입한 사용자를 얼리유저(Early Bird)로
            지정합니다.
          </p>
        </div>

        {/* 혜택 섹션 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
            <Gift className="w-6 h-6 text-yellow-500" />
            <span>🎁 얼리유저 혜택</span>
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                정식 오픈 후에도 현재 제공되는 기능은 전부 무료 유지
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                일부 프리미엄 기능은 할인된 가격으로 제공
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                신규 기능 우선 적용 및 테스트 참여 기회 제공
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                향후 가격 인상 시 기존 가격 유지(Legacy Price)
              </span>
            </li>
          </ul>
        </div>

        {/* 적용 조건 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            🔄 적용 조건
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                베타 기간 동안 계정 생성한 사용자
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                이메일 인증 완료 사용자에 한함
              </span>
            </li>
          </ul>
        </div>

        {/* 제외 조건 */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            ❌ 제외되는 경우
          </h2>
          <ul className="space-y-4">
            <li className="flex items-start space-x-3">
              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                베타 기간 종료 후 가입한 신규 사용자
              </span>
            </li>
            <li className="flex items-start space-x-3">
              <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                서비스를 장기간(6개월 이상) 미사용한 계정은 복귀 시 정책 변경
                가능
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
