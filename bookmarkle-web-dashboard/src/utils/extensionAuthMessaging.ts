import type { User } from "firebase/auth";

function getRefreshToken(user: User | null): string | null {
  if (!user) return null;
  const sts = (user as { stsTokenManager?: { refreshToken?: string } }).stsTokenManager;
  if (sts?.refreshToken) return sts.refreshToken;
  return (user as { refreshToken?: string }).refreshToken ?? null;
}

function serializeUser(user: User) {
  return {
    uid: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    photoURL: user.photoURL ?? "",
  };
}

export async function notifyExtensionAuthState(user: User | null) {
  if (typeof window === "undefined") return;

  try {
    if (user) {
      const [idToken, refreshToken] = await Promise.all([
        user.getIdToken(),
        Promise.resolve(getRefreshToken(user)),
      ]);

      window.postMessage(
        {
          source: "bookmarkhub",
          type: "AUTH_STATE_CHANGED",
          payload: {
            user: serializeUser(user),
            idToken,
            refreshToken,
          },
        },
        window.location.origin
      );
      return;
    }

    window.postMessage(
      {
        source: "bookmarkhub",
        type: "AUTH_STATE_CHANGED",
        payload: {
          user: null,
          idToken: null,
          refreshToken: null,
        },
      },
      window.location.origin
    );
  } catch (error) {
    console.error("Failed to notify extension about auth state:", error);
  }
}
