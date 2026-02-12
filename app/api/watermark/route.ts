import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { addWatermark } from "@/lib/watermark";
import { getDb } from "@/lib/db";

const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12 MB
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg"]);

export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // Resolve watermark text
  const watermarkTextId = formData.get("watermarkTextId") as string | null;
  let watermarkText = `${session.user.name} architecte`;

  if (watermarkTextId) {
    const db = getDb();
    const row = db
      .prepare("SELECT text FROM watermark_text WHERE id = ? AND userId = ?")
      .get(watermarkTextId, session.user.id) as { text: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: "Watermark text not found" }, { status: 404 });
    }
    watermarkText = row.text;
  }

  const results: { name: string; data: string; mimeType: string }[] = [];

  for (const file of files) {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Accepted: PNG, JPEG` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File ${file.name} exceeds 12 MB limit` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await addWatermark(buffer, file.type, watermarkText);

    const outputName = file.name.replace(/\.[^.]+$/, "") + (file.type === "image/png" ? ".png" : ".jpg");

    results.push({
      name: outputName,
      data: processed.toString("base64"),
      mimeType: file.type === "image/png" ? "image/png" : "image/jpeg",
    });
  }

  return NextResponse.json({ images: results });
}
