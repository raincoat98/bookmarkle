import type { User } from "firebase/auth";

interface ExtensionLoginStatusProps {
  user: User;
  isExtensionContext: boolean;
  onGoToDashboard: () => void;
  onCloseWindow: () => void;
}

export function ExtensionLoginStatus({
  user,
  isExtensionContext,
  onGoToDashboard,
  onCloseWindow,
}: ExtensionLoginStatusProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-brand-100 to-accent-100 dark:from-gray-900 dark:via-brand-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card p-8 text-center">
          {/* Extension badge */}
          {isExtensionContext && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <span className="text-2xl">🔌</span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Chrome Extension에서 접속됨
              </p>
            </div>
          )}

          {/* Success message */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              로그인 상태
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-4">
              안녕하세요,{" "}
              <span className="font-semibold text-brand-600 dark:text-brand-400">
                {user?.displayName || user?.email}
              </span>
              님!
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              북마클에 로그인되어 있습니다.
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onGoToDashboard}
              className="w-full btn-primary flex items-center justify-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span>대시보드로 가기</span>
            </button>

            <button
              onClick={onCloseWindow}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span>창 닫기</span>
            </button>
          </div>

          {/* Footer info */}
          {isExtensionContext && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                이제 Chrome Extension에서 북마크를 관리할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
