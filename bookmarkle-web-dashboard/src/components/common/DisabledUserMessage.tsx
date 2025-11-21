import { UserX, Mail } from "lucide-react";

export function DisabledUserMessage() {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
        <UserX className="w-12 h-12 text-red-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        계정이 비활성화되었습니다
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
        귀하의 계정이 관리자에 의해 비활성화되었습니다. 북마크 및 컬렉션에
        접근할 수 없습니다.
      </p>
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
        <Mail className="w-4 h-4" />
        <span>문의사항이 있으시면 관리자에게 연락해주세요.</span>
      </div>
    </div>
  );
}
