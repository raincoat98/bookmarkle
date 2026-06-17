import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Timestamp } from "firebase/firestore";
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
  Users,
  Activity,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";

interface AdminUserListProps {
  users: AdminUser[];
  loading: boolean;
  onRefetch: () => void | Promise<void>;
  onToggleUserStatus: (uid: string, isActive: boolean) => void;
}

const formatDate = (date: Date | Timestamp): string => {
  const d = date instanceof Date ? date : date.toDate();
  return d.toLocaleDateString("ko-KR");
};

type StatusFilter = "all" | "active" | "inactive" | "premium" | "early";
type SortField = "name" | "bookmarks" | "collections" | "createdAt" | "status";
type SortDir = "asc" | "desc";

export function AdminUserList({ users, loading, onRefetch, onToggleUserStatus }: AdminUserListProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [refreshing, setRefreshing] = useState(false);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      // 이름은 오름차순, 숫자·날짜는 내림차순을 기본으로 둔다.
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefetch();
    } finally {
      setRefreshing(false);
    }
  };

  // 통계 계산
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const premium = users.filter(
      (u) =>
        u.subscription?.plan === "premium" &&
        (u.subscription.status === "active" || u.subscription.status === "trialing")
    );
    const earlyUsers = users.filter((u) => u.isEarlyUser);
    const activeUsers = users.filter((u) => u.isActive);
    const inactiveUsers = users.filter((u) => !u.isActive);
    const recentSignups = users.filter((u) => u.createdAt >= sevenDaysAgo);
    const recentLogins = users.filter((u) => u.lastLoginAt && u.lastLoginAt >= today);
    const totalBookmarks = users.reduce((sum, u) => sum + u.bookmarkCount, 0);
    const totalCollections = users.reduce((sum, u) => sum + u.collectionCount, 0);
    const avgBookmarks = users.length > 0 ? Math.round(totalBookmarks / users.length) : 0;

    return {
      total: users.length,
      premium: premium.length,
      earlyUsers: earlyUsers.length,
      active: activeUsers.length,
      inactive: inactiveUsers.length,
      recentSignups: recentSignups.length,
      recentLogins: recentLogins.length,
      totalBookmarks,
      totalCollections,
      avgBookmarks,
      conversionRate:
        users.length > 0 ? ((premium.length / users.length) * 100).toFixed(1) : "0.0",
    };
  }, [users]);

  // 필터링
  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email?.toLowerCase().includes(term) ||
          u.displayName?.toLowerCase().includes(term)
      );
    }
    switch (statusFilter) {
      case "active":
        filtered = filtered.filter((u) => u.isActive);
        break;
      case "inactive":
        filtered = filtered.filter((u) => !u.isActive);
        break;
      case "premium":
        filtered = filtered.filter(
          (u) =>
            u.subscription?.plan === "premium" &&
            (u.subscription.status === "active" || u.subscription.status === "trialing")
        );
        break;
      case "early":
        filtered = filtered.filter((u) => u.isEarlyUser);
        break;
    }
    return filtered;
  }, [users, searchTerm, statusFilter]);

  // 정렬
  const sortedUsers = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredUsers].sort((a, b) => {
      switch (sortField) {
        case "name": {
          const an = (a.displayName || a.email || "").toLowerCase();
          const bn = (b.displayName || b.email || "").toLowerCase();
          return an.localeCompare(bn) * dir;
        }
        case "bookmarks":
          return (a.bookmarkCount - b.bookmarkCount) * dir;
        case "collections":
          return (a.collectionCount - b.collectionCount) * dir;
        case "createdAt":
          return (a.createdAt.getTime() - b.createdAt.getTime()) * dir;
        case "status":
          return (Number(a.isActive) - Number(b.isActive)) * dir;
        default:
          return 0;
      }
    });
  }, [filteredUsers, sortField, sortDir]);

  // 최초 로드(데이터 없음)에만 전체 스피너를 띄우고,
  // 새로고침 중에는 테이블을 유지한 채 새로고침 버튼만 회전시킨다.
  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  const STAT_CARDS = [
    {
      key: "total",
      icon: Users,
      label: "전체 사용자",
      value: stats.total,
      subtext: `최근 7일 +${stats.recentSignups}`,
      iconBg: "bg-violet-50 dark:bg-violet-500/10",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      key: "active",
      icon: Activity,
      label: "오늘 활동",
      value: stats.recentLogins,
      subtext: `활성 ${stats.active} · 비활성 ${stats.inactive}`,
      iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "premium",
      icon: Crown,
      label: "프리미엄",
      value: stats.premium,
      subtext: `전환율 ${stats.conversionRate}%`,
      iconBg: "bg-amber-50 dark:bg-amber-500/10",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      key: "early",
      icon: Gift,
      label: "얼리 유저",
      value: stats.earlyUsers,
      subtext: `평생 무료 혜택`,
      iconBg: "bg-orange-50 dark:bg-orange-500/10",
      iconColor: "text-orange-600 dark:text-orange-400",
    },
    {
      key: "bookmarks",
      icon: Bookmark,
      label: "총 북마크",
      value: stats.totalBookmarks,
      subtext: `평균 ${stats.avgBookmarks}개/명`,
      iconBg: "bg-blue-50 dark:bg-blue-500/10",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "collections",
      icon: Folder,
      label: "총 컬렉션",
      value: stats.totalCollections,
      subtext: `사용자별 평균 ${users.length > 0 ? Math.round(stats.totalCollections / users.length) : 0}개`,
      iconBg: "bg-purple-50 dark:bg-purple-500/10",
      iconColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  const FILTERS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "전체", count: stats.total },
    { key: "active", label: "활성", count: stats.active },
    { key: "inactive", label: "비활성", count: stats.inactive },
    { key: "premium", label: "프리미엄", count: stats.premium },
    { key: "early", label: "얼리", count: stats.earlyUsers },
  ];

  return (
    <div className="space-y-4">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(({ key, icon: Icon, label, value, subtext, iconBg, iconColor }) => (
          <div
            key={key}
            className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] p-4 transition-colors hover:border-gray-200 dark:hover:border-white/[0.10]"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
              <Icon className={`w-4 h-4 ${iconColor}`} />
            </div>
            <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white leading-none mb-1">
              {value.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">{label}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600">{subtext}</p>
          </div>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] p-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("admin.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/[0.04] border border-transparent rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-[#111113] focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              <Filter className="w-3 h-3" />
              <span>필터</span>
            </div>
            <div className="flex gap-1">
              {FILTERS.map(({ key, label, count }) => {
                const active = statusFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                      active
                        ? "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    {label}
                    <span
                      className={`px-1.5 py-px rounded text-[10px] tabular-nums ${
                        active
                          ? "bg-white/60 dark:bg-violet-900/40"
                          : "bg-gray-100 dark:bg-white/[0.06]"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="새로고침"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-colors flex-shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">새로고침</span>
          </button>
        </div>
      </div>

      {/* 사용자 테이블 */}
      <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/[0.06]">
                <SortableHeader field="name" label="사용자" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader field="bookmarks" label="활동" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  구독
                </th>
                <SortableHeader field="createdAt" label="가입일" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                <SortableHeader field="status" label="상태" sortField={sortField} sortDir={sortDir} onSort={toggleSort} />
                <th className="px-5 py-3 text-right text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/[0.04] flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {searchTerm || statusFilter !== "all"
                          ? t("admin.noSearchResults")
                          : t("admin.noRegisteredUsers")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  const isPremium =
                    user.subscription?.plan === "premium" &&
                    (user.subscription.status === "active" ||
                      user.subscription.status === "trialing");

                  return (
                    <tr
                      key={user.uid}
                      className="border-b border-gray-50 dark:border-white/[0.04] last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-9 h-9 bg-violet-50 dark:bg-violet-500/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                              {(user.displayName || user.email || "U")[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                              {user.displayName || t("admin.noName")}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
                              {user.email || "N/A"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Bookmark className="w-3 h-3 text-blue-400" />
                            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                              {user.bookmarkCount}
                            </span>
                          </span>
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Folder className="w-3 h-3 text-emerald-400" />
                            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">
                              {user.collectionCount}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {isPremium ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium">
                            <Crown className="w-3 h-3" />
                            프리미엄
                          </span>
                        ) : user.isEarlyUser ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium">
                            <Gift className="w-3 h-3" />
                            얼리
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">무료</span>
                        )}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {user.createdAt.toLocaleDateString("ko-KR")}
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.isActive ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {user.isActive ? "활성" : "비활성"}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                            title="상세 보기"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmUser(user)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              user.isActive
                                ? "text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                : "text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                            }`}
                            title={user.isActive ? "비활성화" : "활성화"}
                          >
                            {user.isActive ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {sortedUsers.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 dark:border-white/[0.04] flex items-center justify-between">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              총 <span className="font-semibold text-gray-700 dark:text-gray-300">{sortedUsers.length}</span>명 표시 중
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span>전체 {stats.total}명</span>
            </div>
          </div>
        )}
      </div>

      {/* 사용자 상세 모달 */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white dark:bg-[#111113] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/[0.06] max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 dark:bg-violet-500/10 rounded-full flex items-center justify-center">
                  <span className="text-base font-semibold text-violet-600 dark:text-violet-400">
                    {(selectedUser.displayName || selectedUser.email || "U")[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedUser.displayName || t("admin.noName")}
                  </h3>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 활동 통계 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-500/[0.06] border border-blue-100 dark:border-blue-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Bookmark className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">북마크</p>
                  </div>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                    {selectedUser.bookmarkCount}
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/[0.06] border border-emerald-100 dark:border-emerald-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Folder className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">컬렉션</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                    {selectedUser.collectionCount}
                  </p>
                </div>
              </div>

              {/* 정보 */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/[0.04]">
                  <span className="text-xs text-gray-400 dark:text-gray-500">UID</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate max-w-[260px]">
                    {selectedUser.uid}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/[0.04]">
                  <span className="text-xs text-gray-400 dark:text-gray-500">구독</span>
                  {selectedUser.subscription?.plan === "premium" &&
                  (selectedUser.subscription.status === "active" ||
                    selectedUser.subscription.status === "trialing") ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium">
                        <Crown className="w-3 h-3" />
                        프리미엄
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedUser.subscription.billingCycle === "monthly" ? "월간" : "연간"}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">무료</span>
                  )}
                </div>
                {selectedUser.subscription?.endDate && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/[0.04]">
                    <span className="text-xs text-gray-400 dark:text-gray-500">만료일</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      {formatDate(selectedUser.subscription.endDate)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/[0.04]">
                  <span className="text-xs text-gray-400 dark:text-gray-500">얼리 유저</span>
                  {selectedUser.isEarlyUser ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 text-xs font-medium">
                      <Gift className="w-3 h-3" />
                      예
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">아니오</span>
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/[0.04]">
                  <span className="text-xs text-gray-400 dark:text-gray-500">상태</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      selectedUser.isActive
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400"
                    }`}
                  >
                    {selectedUser.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {selectedUser.isActive ? "활성" : "비활성"}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-white/[0.04]">
                  <span className="text-xs text-gray-400 dark:text-gray-500">가입일</span>
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {selectedUser.createdAt.toLocaleString("ko-KR")}
                  </span>
                </div>
                {selectedUser.lastLoginAt && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">마지막 로그인</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      {selectedUser.lastLoginAt.toLocaleString("ko-KR")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-gray-100 dark:border-white/[0.06] flex gap-2">
              <button
                onClick={() => setConfirmUser(selectedUser)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedUser.isActive
                    ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20"
                    : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
                }`}
              >
                {selectedUser.isActive ? "비활성화" : "활성화"}
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 활성/비활성 확인 모달 */}
      {confirmUser && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmUser(null)}
        >
          <div
            className="bg-white dark:bg-[#111113] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/[0.06] max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  confirmUser.isActive
                    ? "bg-red-50 dark:bg-red-500/10"
                    : "bg-emerald-50 dark:bg-emerald-500/10"
                }`}
              >
                {confirmUser.isActive ? (
                  <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : (
                  <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {confirmUser.isActive ? "사용자 비활성화" : "사용자 활성화"}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              <span className="font-medium text-gray-900 dark:text-white">
                {confirmUser.displayName || confirmUser.email || t("admin.noName")}
              </span>
              {confirmUser.isActive
                ? " 님을 비활성화할까요? 비활성화된 사용자는 서비스를 이용할 수 없습니다."
                : " 님을 다시 활성화할까요?"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmUser(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-white/[0.06] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.10] transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={() => {
                  onToggleUserStatus(confirmUser.uid, !confirmUser.isActive);
                  setConfirmUser(null);
                  setSelectedUser(null);
                }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium text-white transition-colors ${
                  confirmUser.isActive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirmUser.isActive ? "비활성화" : "활성화"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SortableHeaderProps {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}

function SortableHeader({ field, label, sortField, sortDir, onSort }: SortableHeaderProps) {
  const active = sortField === field;
  return (
    <th className="px-5 py-3 text-left text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
      <button
        onClick={() => onSort(field)}
        className={`group inline-flex items-center gap-1 uppercase tracking-wider transition-colors ${
          active
            ? "text-violet-600 dark:text-violet-400"
            : "hover:text-gray-600 dark:hover:text-gray-300"
        }`}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="w-3 h-3" />
          ) : (
            <ArrowDown className="w-3 h-3" />
          )
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </button>
    </th>
  );
}
