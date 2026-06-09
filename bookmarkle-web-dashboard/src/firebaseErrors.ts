export type FirebaseError = {
  code?: string;
  message?: string;
};

export const isPermissionOrAuthError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const err = error as FirebaseError;
  return err.code === "permission-denied" || err.code === "unauthenticated";
};
