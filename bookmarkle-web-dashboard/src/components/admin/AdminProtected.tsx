import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores";
import { isAdminUser } from "../../firebase";
import { useState, useEffect } from "react";

interface AdminProtectedProps {
  children: React.ReactNode;
}

export function AdminProtected({ children }: AdminProtectedProps) {
  const { user, loading } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  useEffect(() => {
    if (user) {
      isAdminUser(user).then((admin: boolean) => {
        setIsAdmin(admin);
        setAdminLoading(false);
      });
    } else {
      setIsAdmin(false);
      setAdminLoading(false);
    }
  }, [user]);

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
