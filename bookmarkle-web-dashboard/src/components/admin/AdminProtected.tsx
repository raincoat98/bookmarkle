import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores";
import { isAdminUser } from "../../firebase";
import { useState, useEffect } from "react";

interface AdminProtectedProps {
  children: React.ReactNode;
}

export function AdminProtected({ children }: AdminProtectedProps) {
  const { t } = useTranslation();
  const { user, loading } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);
  // 관리자 여부를 확인 완료한 사용자의 uid. 현재 user.uid와 다르면
  // 아직 검사 중이므로 리다이렉트하지 않고 로딩을 유지한다.
  const [checkedUid, setCheckedUid] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (user) {
      isAdminUser(user).then((admin: boolean) => {
        if (cancelled) return;
        setIsAdmin(admin);
        setCheckedUid(user.uid);
      });
    } else {
      setIsAdmin(false);
      setCheckedUid(null);
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  // 인증 복원 중이거나, 현재 사용자의 관리자 검사가 끝나기 전에는 로딩을 보여준다.
  if (loading || (user && checkedUid !== user.uid)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d0d10] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
