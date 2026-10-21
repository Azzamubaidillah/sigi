import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { loadConfig } from "@/src/config";
import { openDatabase } from "@/src/db/client";
import { importS1File } from "@/src/imports/s1-import";
import { createLogger } from "@/src/logger";
import { rejectUnlessOwner } from "@/src/security/owner-request";

export const dynamic = "force-dynamic";

/** The 2026-02-27 file is 4.6 MB; five times that is still a sane ceiling. */
const MAX_BYTES = 25 * 1024 * 1024;

/** Today's date where the owner downloads files: Jakarta, not UTC. */
const jakartaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Jakarta",
});

const fieldsSchema = z.object({
  sourceUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), "must be an https URL"),
  accessedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD")
    .refine(
      (value) => value <= jakartaDate.format(new Date()),
      "cannot be in the future",
    ),
  correction: z.enum(["on"]).optional(),
});

function failure(status: number, error: string) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const config = loadConfig();
  const refused = await rejectUnlessOwner(request, config);
  if (refused) return failure(refused.status, refused.error);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) return failure(400, "Attach the PDF");
  if (file.size === 0 || file.size > MAX_BYTES) {
    return failure(
      413,
      `The file must be between 1 byte and ${MAX_BYTES} bytes`,
    );
  }
  const fields = fieldsSchema.safeParse({
    sourceUrl: form.get("sourceUrl"),
    accessedOn: form.get("accessedOn"),
    correction: form.get("correction") ?? undefined,
  });
  if (!fields.success) {
    return failure(
      400,
      fields.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; "),
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") {
    return failure(415, "That is not a PDF");
  }

  const logger = createLogger("sigi-web", config);
  const { sqlite } = openDatabase(config.databasePath, { fileMustExist: true });
  try {
    const result = await importS1File(sqlite, config.landingDirectory, {
      bytes,
      originalName: file.name.slice(0, 200),
      sourceUrl: fields.data.sourceUrl,
      accessedOn: fields.data.accessedOn,
      correction: fields.data.correction === "on",
    });
    logger.info(
      {
        source: "S1",
        sha256: result.sha256,
        importRunId: result.importRunId,
        result: result.kind === "imported" ? result.outcome : "duplicate",
      },
      "ownership file uploaded",
    );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } finally {
    sqlite.close();
  }
}
