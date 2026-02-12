export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const rows = db
    .prepare("SELECT id, text, createdAt FROM watermark_text WHERE userId = ? ORDER BY createdAt DESC")
    .all(session.user.id);

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO watermark_text (id, userId, text) VALUES (?, ?, ?)").run(
    id,
    session.user.id,
    text
  );

  return NextResponse.json({ id, text }, { status: 201 });
}
