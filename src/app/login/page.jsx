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
        fontFamily: "monospace",
        color: "#333",
        fontSize: 12,
        letterSpacing: "0.2em",
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
