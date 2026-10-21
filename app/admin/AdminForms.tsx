"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { ownerPost } from "@/app/_lib/owner-fetch";

function describe(data: Record<string, unknown>): string {
  if (typeof data.error === "string") return data.error;
  if (data.kind === "duplicate") {
    return `Already imported as run #${String(data.importRunId)}; nothing changed.`;
  }
  if (data.kind === "imported") {
    const outcome = String(data.outcome);
    const parseError =
      typeof data.parseError === "string" ? `: ${data.parseError}` : "";
    return `Run #${String(data.importRunId)} ${outcome}${parseError}.`;
  }
  return "Unexpected response";
}

export function UploadForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("Parsing and checking the file; this takes a few seconds…");
    const result = await ownerPost(
      "/api/admin/imports/s1",
      new FormData(event.currentTarget),
    ).catch(() => null);
    setBusy(false);
    setMessage(result ? describe(result.data) : "Upload failed");
    router.refresh();
  }

  return (
    // method/action matter only if the script never ran: a native submit then
    // POSTs (and fails the CSRF check) instead of putting fields in the URL.
    <form
      className="form"
      method="post"
      action="/api/admin/imports/s1"
      encType="multipart/form-data"
      onSubmit={submit}
    >
      <label>
        Monthly &gt;1% holders file (PDF)
        <input name="file" type="file" accept="application/pdf" required />
      </label>
      <label>
        Downloaded from (URL of the IDX announcement)
        <input
          name="sourceUrl"
          type="url"
          placeholder="https://www.idx.co.id/…"
          required
        />
      </label>
      <label>
        Downloaded on
        <input name="accessedOn" type="date" required />
      </label>
      <label className="check">
        <input name="correction" type="checkbox" /> This file corrects a month
        that is already published
      </label>
      <div>
        <button className="button" type="submit" disabled={busy}>
          {busy ? "Importing…" : "Import"}
        </button>
      </div>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}

export function ReviewForm({ runId }: { runId: number }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const reason = String(
      new FormData(event.currentTarget).get("reason") ?? "",
    );
    const result = await ownerPost(`/api/admin/imports/${runId}/review`, {
      decision: submitter?.value,
      reason,
    }).catch(() => null);
    setMessage(
      result?.ok
        ? `Run #${runId} ${String(result.data.outcome)}.`
        : String(result?.data.error ?? "Review failed"),
    );
    router.refresh();
  }

  return (
    <form
      className="form"
      method="post"
      action={`/api/admin/imports/${runId}/review`}
      onSubmit={decide}
    >
      <label>
        Reason (kept in the audit trail)
        <textarea name="reason" rows={2} minLength={10} required />
      </label>
      <div className="actions">
        <button
          className="button"
          type="submit"
          name="decision"
          value="approve"
        >
          Approve and publish
        </button>
        <button
          className="button secondary"
          type="submit"
          name="decision"
          value="reject"
        >
          Reject
        </button>
      </div>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}

export function SignOut() {
  const router = useRouter();
  async function signOut() {
    await ownerPost("/api/auth/logout", {}).catch(() => null);
    router.replace("/");
    router.refresh();
  }
  return (
    <button className="button secondary" type="button" onClick={signOut}>
      Sign out
    </button>
  );
}
