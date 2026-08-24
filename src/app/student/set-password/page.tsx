"use client";

import { LoginShell } from "../login/components/LoginShell";
import { SetPasswordForm } from "./components/SetPasswordForm";

export default function SetPasswordPage() {
  return (
    <LoginShell>
      <div className="w-full max-w-md mx-auto">
        <SetPasswordForm />
      </div>
    </LoginShell>
  );
}