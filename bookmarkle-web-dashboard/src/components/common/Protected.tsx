// src/components/Protected.tsx
import { useAuthStore } from "../../stores";

export default function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  if (loading) return <p>로딩중...</p>;
  if (!user) return <p>로그인이 필요합니다.</p>;
  return <>{children}</>;
}
