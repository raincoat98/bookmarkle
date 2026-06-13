import { Toaster, ToastBar, toast as toastApi } from "react-hot-toast";

const BASE_STYLE = {
  background: "rgba(17, 17, 19, 0.92)",
  color: "#fff",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "14px",
  padding: "12px 16px",
  fontSize: "13px",
  fontWeight: 500,
  boxShadow:
    "0 10px 30px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
  maxWidth: "360px",
};

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerStyle={{ top: 20, right: 20 }}
      toastOptions={{
        duration: 1800,
        className: "modern-toast",
        style: BASE_STYLE,
        success: {
          iconTheme: { primary: "#10b981", secondary: "#fff" },
          style: {
            background: "rgba(17, 17, 19, 0.92)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
          },
        },
        error: {
          iconTheme: { primary: "#ef4444", secondary: "#fff" },
          style: {
            background: "rgba(17, 17, 19, 0.92)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
          },
        },
        loading: {
          iconTheme: { primary: "#8b5cf6", secondary: "#fff" },
          style: {
            background: "rgba(17, 17, 19, 0.92)",
            border: "1px solid rgba(139, 92, 246, 0.25)",
          },
        },
      }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <span
              onClick={() => toastApi.dismiss(t.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: "pointer",
                flex: 1,
              }}
            >
              {icon}
              {message}
            </span>
          )}
        </ToastBar>
      )}
    </Toaster>
  );
}
