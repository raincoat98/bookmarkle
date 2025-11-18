import { useAuthStore } from "../../stores";
import { UserX, Mail } from "lucide-react";

export function UserStatusWarning() {
  const { user, isActive, isActiveLoading } = useAuthStore();

  // 로딩 중이거나 사용자가 없거나 활성화된 경우 표시하지 않음
  if (isActiveLoading || !user || isActive) {
    return null;
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-500 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <UserX className="h-5 w-5 text-red-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            계정이 비활성화되었습니다
          </h3>
          <div className="mt-2 text-sm text-red-700 dark:text-red-300">
            <p>
              귀하의 계정이 관리자에 의해 비활성화되었습니다. 북마크 및 컬렉션에
              접근할 수 없습니다.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>문의사항이 있으시면 관리자에게 연락해주세요.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
