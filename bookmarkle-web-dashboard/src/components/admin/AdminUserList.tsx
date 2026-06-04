import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AdminUser } from "../../types";
import {
  Search,
  User as UserIcon,
  Bookmark,
  Folder,
  Calendar,
  UserX,
  UserCheck,
  Crown,
  Gift,
  X,
} from "lucide-react";

interface AdminUserListProps {
  users: AdminUser[];
  loading: boolean;
  onToggleUserStatus: (uid: string, isActive: boolean) => void;
}

export function AdminUserList({
  users,
  loading,
  onToggleUserStatus,
}: AdminUserListProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const filteredUsers = users.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const earlyUserCount = users.filter((u) => u.isEarlyUser).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 검색 바 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t("admin.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: t("admin.totalUsers"),
            value: users.length,
            icon: <UserIcon className="h-8 w-8 md:h-12 md:w-12 text-brand-500 flex-shrink-0" />,
          },
          {
            label: t("admin.premiumUsers"),
            value: users.filter(
              (u) =>
                u.subscription?.plan === "premium" &&
                (u.subscription.status === "active" || u.subscription.status === "trialing")
            ).length,
            icon: <Crown className="h-8 w-8 md:h-12 md:w-12 text-yellow-500 flex-shrink-0" />,
          },
          {
            label: t("admin.earlyUsers"),
            value: earlyUserCount,
            icon: <Gift className="h-8 w-8 md:h-12 md:w-12 text-orange-500 flex-shrink-0" />,
          },
          {
            label: t("admin.totalBookmarks"),
            value: users.reduce((sum, u) => sum + u.bookmarkCount, 0),
            icon: <Bookmark className="h-8 w-8 md:h-12 md:w-12 text-blue-500 flex-shrink-0" />,
          },
          {
            label: t("admin.totalCollections"),
            value: users.reduce((sum, u) => sum + u.collectionCount, 0),
            icon: <Folder className="h-8 w-8 md:h-12 md:w-12 text-green-500 flex-shrink-0" />,
          },
        ].map(({ label, value, icon }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">
                  {label}
                </p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {value}
                </p>
              </div>
              {icon}
            </div>
          </div>
        ))}
      </div>

      {/* 사용자 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {[
                  t("admin.userInfo"),
                  t("admin.email"),
                  t("admin.bookmarks"),
                  t("admin.collections"),
                  t("admin.subscription"),
                  t("admin.earlyUser"),
                  t("admin.joinDate"),
                  t("admin.status"),
                  t("admin.actions"),
                ].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? t("admin.noSearchResults") : t("admin.noRegisteredUsers")}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isPremium =
                    user.subscription?.plan === "premium" &&
                    (user.subscription.status === "active" ||
                      user.subscription.status === "trialing");

                  return (
                    <tr
                      key={user.uid}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-brand-100 dark:bg-brand-900 rounded-full flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-brand-600 dark:text-brand-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.displayName || t("admin.noName")}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {user.uid.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.email || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Bookmark className="h-4 w-4 mr-1 text-blue-500" />
                          {user.bookmarkCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Folder className="h-4 w-4 mr-1 text-green-500" />
                          {user.collectionCount}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isPremium ? (
                          <div className="flex items-center space-x-2">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                              {t("admin.premium")}
                            </span>
                            {user.subscription?.billingCycle === "yearly" && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({t("admin.yearlyShort")})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {t("admin.free")}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.isEarlyUser ? (
                          <div className="flex items-center space-x-2">
                            <Gift className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                              {t("admin.earlyUser")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4 mr-1" />
                          {user.createdAt.toLocaleDateString("ko-KR")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                        >
                          {user.isActive ? t("admin.active") : t("admin.inactive")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-brand-600 hover:text-brand-900 dark:text-brand-400 dark:hover:text-brand-300"
                        >
                          {t("admin.viewDetails")}
                        </button>
                        <button
                          onClick={() => onToggleUserStatus(user.uid, !user.isActive)}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                            user.isActive
                              ? "text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300"
                              : "text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300"
                          }`}
                        >
                          {user.isActive ? (
                            <><UserX className="h-3 w-3 mr-1" />{t("admin.deactivate")}</>
                          ) : (
                            <><UserCheck className="h-3 w-3 mr-1" />{t("admin.activate")}</>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 사용자 상세 모달 */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("admin.userDetails")}
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {[
                { label: t("admin.userId"), value: selectedUser.uid, mono: true },
                { label: t("admin.name"), value: selectedUser.displayName || t("admin.noName") },
                { label: t("admin.email"), value: selectedUser.email || "N/A" },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {label}
                  </label>
                  <p className={`mt-1 text-sm text-gray-900 dark:text-white ${mono ? "font-mono" : ""}`}>
                    {value}
                  </p>
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("admin.bookmarkCount")}
                  </label>
                  <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedUser.bookmarkCount}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("admin.collectionCount")}
                  </label>
                  <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                    {selectedUser.collectionCount}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("admin.subscriptionStatus")}
                </label>
                <div className="mt-1 flex items-center space-x-2">
                  {selectedUser.subscription?.plan === "premium" &&
                  (selectedUser.subscription.status === "active" ||
                    selectedUser.subscription.status === "trialing") ? (
                    <>
                      <Crown className="h-5 w-5 text-yellow-500" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                          {t("admin.premium")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedUser.subscription.billingCycle === "monthly"
                            ? t("admin.monthly")
                            : t("admin.yearly")}
                          {selectedUser.subscription.endDate &&
                            ` · ${t("admin.expiryDate")}: ${selectedUser.subscription.endDate.toLocaleDateString("ko-KR")}`}
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("admin.free")}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("admin.earlyUserStatus")}
                </label>
                <div className="mt-1 flex items-center space-x-2">
                  {selectedUser.isEarlyUser ? (
                    <>
                      <Gift className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          {t("admin.earlyUser")}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t("admin.earlyUserDesc")}
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t("admin.regularUser")}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t("admin.joinDate")}
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {selectedUser.createdAt.toLocaleString("ko-KR")}
                </p>
              </div>

              {selectedUser.lastLoginAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t("admin.lastLogin")}
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedUser.lastLoginAt.toLocaleString("ko-KR")}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
