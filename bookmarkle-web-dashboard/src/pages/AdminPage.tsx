import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/layout/Header";
import { AdminUserManagement } from "../components/admin/AdminUserManagement";
import { useAdminUsers } from "../hooks/useAdminUsers";
import { SubscriptionFeatureSettings } from "../components/settings/SubscriptionFeatureSettings";
import { ShieldCheck, Users, Settings } from "lucide-react";

export function AdminPage() {
  const { t } = useTranslation();
  const { users, loading, error, refetch, toggleUserStatus } = useAdminUsers();
  const [activeTab, setActiveTab] = useState<"users" | "subscription">("users");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 헤더 섹션 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="h-7 w-7 sm:h-8 sm:w-8 text-brand-600 dark:text-brand-400" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {t("admin.title")}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {t("admin.description", {
              defaultValue: "전체 사용자를 관리하고 통계를 확인할 수 있습니다.",
            })}
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-4 sm:mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-1">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                activeTab === "users"
                  ? "bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400 -mb-px"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{t("admin.users")}</span>
            </button>
            <button
              onClick={() => setActiveTab("subscription")}
              className={`flex items-center space-x-2 px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                activeTab === "subscription"
                  ? "bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 border-b-2 border-brand-600 dark:border-brand-400 -mb-px"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>{t("premium.settings.subscriptionFeatureSettings")}</span>
            </button>
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {activeTab === "users" && (
            <AdminUserManagement
              users={users}
              loading={loading}
              error={error}
              onRefetch={refetch}
              onToggleUserStatus={toggleUserStatus}
            />
          )}

          {activeTab === "subscription" && (
            <div className="p-4 sm:p-6">
              <SubscriptionFeatureSettings />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
