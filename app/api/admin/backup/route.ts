import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { readFile, unlink } from "fs/promises";
import { timingSafeEqual } from "crypto";

export async function GET(request: Request) {
  const secret = process.env.BACKUP_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Backup not configured" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";

  if (
    !token ||
    token.length !== secret.length ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timestamp = Date.now();
  const tmpPath = `/tmp/backup-${timestamp}.db`;

  try {
    const db = getDb();
    db.exec(`VACUUM INTO '${tmpPath}'`);

    const data = await readFile(tmpPath);

    const date = new Date().toISOString().slice(0, 10);
    return new Response(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="backup-${date}.db"`,
      },
    });
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}
