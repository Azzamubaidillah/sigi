import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { loadConfig } from "@/src/config";
import { openDatabase } from "@/src/db/client";
import { reviewHeldRun } from "@/src/imports/s1-import";
import { createLogger } from "@/src/logger";
import { rejectUnlessOwner } from "@/src/security/owner-request";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  decision: z.enum(["approve", "reject"]),
  // The audit trail is only useful if the reason says something.
  reason: z.string().trim().min(10).max(1_000),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const config = loadConfig();
  const refused = await rejectUnlessOwner(request, config);
  if (refused) {
    return NextResponse.json(
      { error: refused.error },
      { status: refused.status },
    );
  }
  const id = Number((await context.params).id);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!Number.isSafeInteger(id) || !body.success) {
    return NextResponse.json(
      { error: "Send a decision and a reason of at least 10 characters" },
      { status: 400 },
    );
  }
  const { sqlite } = openDatabase(config.databasePath, { fileMustExist: true });
  try {
    const result = reviewHeldRun(
      sqlite,
      id,
      body.data.decision,
      body.data.reason,
    );
    createLogger("sigi-web", config).info(
      { importRunId: id, decision: body.data.decision, ok: result.ok },
      "held import reviewed",
    );
    return NextResponse.json(result, {
      status: result.ok ? 200 : 409,
      headers: { "Cache-Control": "no-store" },
    });
  } finally {
    sqlite.close();
  }
}
