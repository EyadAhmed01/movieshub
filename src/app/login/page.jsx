import { Suspense } from "react";
import LoginForm from "@/components/LoginForm";

function LoginFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-mono), ui-monospace, monospace",
        color: "#444",
        fontSize: 11,
        letterSpacing: "0.18em",
        fontWeight: 500,
      }}
    >
      LOADING…
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
