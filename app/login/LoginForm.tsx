"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { ownerPost } from "@/app/_lib/owner-fetch";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await ownerPost("/api/auth/login", {
      passcode: String(form.get("passcode") ?? ""),
      rememberBrowser: form.get("remember") === "on",
    }).catch(() => null);
    setBusy(false);
    if (result?.ok) {
      router.replace("/admin");
      router.refresh();
      return;
    }
    setError(
      typeof result?.data.error === "string"
        ? result.data.error
        : "Sign-in failed",
    );
  }

  return (
    // method/action matter only if the script never ran: a native submit then
    // POSTs (and fails the CSRF check) instead of putting the passcode in the URL.
    <form
      className="form"
      method="post"
      action="/api/auth/login"
      onSubmit={submit}
    >
      <label>
        Passcode
        <input
          name="passcode"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <label className="check">
        <input name="remember" type="checkbox" /> Remember this browser
      </label>
      {error ? <p className="tone-negative">{error}</p> : null}
      <div>
        <button className="button" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
