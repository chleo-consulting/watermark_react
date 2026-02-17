"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

interface ProcessedImage {
  name: string;
  data: string;
  mimeType: string;
}

interface WatermarkText {
  id: string;
  text: string;
  createdAt: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildWatermarkSvgMarkup(width: number, height: number, text: string): string {
  const diagonal = Math.sqrt(width * width + height * height);
  const fontSize = Math.max(16, Math.round(diagonal / 30));
  const lineSpacing = fontSize * 3;
  const angle = -Math.atan2(height, width) * (180 / Math.PI);

  const coverSize = diagonal * 2;
  const offsetX = -coverSize / 2 + width / 2;
  const offsetY = -coverSize / 2 + height / 2;

  const lines: string[] = [];
  for (let y = 0; y < coverSize; y += lineSpacing) {
    lines.push(
      `<text x="${coverSize / 2}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" fill="white" fill-opacity="0.5" letter-spacing="2">${escapeXml(text)}</text>`
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">
  <g transform="translate(${width / 2}, ${height / 2}) rotate(${angle}) translate(${offsetX - width / 2}, ${offsetY - height / 2})">
    ${lines.join("\n    ")}
  </g>
</svg>`;
}

export default function Dashboard() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ProcessedImage[]>([]);
  const [error, setError] = useState("");
  const [watermarkTexts, setWatermarkTexts] = useState<WatermarkText[]>([]);
  const [selectedTextId, setSelectedTextId] = useState("");
  const [newText, setNewText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewDimensions, setPreviewDimensions] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrl(null);
      setPreviewDimensions(null);
      return;
    }
    const url = URL.createObjectURL(files[0]);
    setPreviewUrl(url);
    const img = new Image();
    img.onload = () => setPreviewDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [files]);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [isPending, session, router]);

  useEffect(() => {
    if (session) {
      fetch("/api/watermark-texts")
        .then((res) => res.json())
        .then((data) => setWatermarkTexts(data))
        .catch(() => {});
    }
  }, [session]);

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-mist">Loading...</p>
      </main>
    );
  }

  if (!session) {
    return null;
  }

  async function addWatermarkText() {
    const trimmed = newText.trim();
    if (!trimmed) return;
    try {
      const res = await fetch("/api/watermark-texts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const created = await res.json();
        setWatermarkTexts((prev) => [created, ...prev]);
        setNewText("");
      }
    } catch {}
  }

  async function deleteWatermarkText(id: string) {
    try {
      const res = await fetch(`/api/watermark-texts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWatermarkTexts((prev) => prev.filter((t) => t.id !== id));
        if (selectedTextId === id) setSelectedTextId("");
      }
    } catch {}
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
      setResults([]);
      setError("");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "image/png" || f.type === "image/jpeg"
    );
    if (dropped.length > 0) {
      setFiles((prev) => [...prev, ...dropped]);
      setResults([]);
      setError("");
    }
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function formatSize(bytes: number) {
    if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(1) + " MB";
    return (bytes / 1024).toFixed(1) + " KB";
  }

  async function handleProcess() {
    if (files.length === 0) return;
    setProcessing(true);
    setError("");
    setResults([]);

    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }
    if (selectedTextId) {
      formData.append("watermarkTextId", selectedTextId);
    }

    try {
      const res = await fetch("/api/watermark", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Processing failed");
        return;
      }

      const body = await res.json();
      setResults(body.images);
    } catch {
      setError("Network error");
    } finally {
      setProcessing(false);
    }
  }

  function downloadImage(img: ProcessedImage) {
    const link = document.createElement("a");
    link.href = `data:${img.mimeType};base64,${img.data}`;
    link.download = img.name;
    link.click();
  }

  function downloadAll() {
    for (const img of results) {
      downloadImage(img);
    }
  }

  async function handleLogout() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 border-b border-mist/30 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <h1 className="text-lg font-semibold text-dark">Add Watermark</h1>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-sm font-medium text-navy">
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-dark/60">{session.user.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-md border border-mist/40 px-3 py-1.5 text-sm text-dark/60 transition-colors hover:bg-cream hover:text-dark"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Two-column layout */}
      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Sidebar — Settings */}
          <aside className="space-y-4">
            <div className="rounded-xl border border-mist/30 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-dark">Watermark Text</h2>
              <select
                value={selectedTextId}
                onChange={(e) => setSelectedTextId(e.target.value)}
                className="w-full rounded-lg border border-mist/40 bg-cream/50 px-3 py-2 text-sm text-dark focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
              >
                <option value="">{session.user.name} architecte (default)</option>
                {watermarkTexts.map((wt) => (
                  <option key={wt.id} value={wt.id}>
                    {wt.text}
                  </option>
                ))}
              </select>

              {watermarkTexts.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {watermarkTexts.map((wt) => (
                    <li
                      key={wt.id}
                      className="group flex items-center justify-between rounded-lg px-3 py-1.5 text-sm text-dark/60 hover:bg-cream/50"
                    >
                      <span className="truncate">{wt.text}</span>
                      <button
                        onClick={() => deleteWatermarkText(wt.id)}
                        className="ml-2 text-mist transition-colors hover:text-navy group-hover:text-dark/60"
                        aria-label={`Delete "${wt.text}"`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addWatermarkText()}
                  placeholder="New watermark text..."
                  className="flex-1 rounded-lg border border-mist/40 bg-cream/50 px-3 py-2 text-sm text-dark placeholder:text-mist focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
                />
                <button
                  onClick={addWatermarkText}
                  disabled={!newText.trim()}
                  className="rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy/90 disabled:opacity-40"
                >
                  Add
                </button>
              </div>
            </div>
          </aside>

          {/* Workspace — Upload, process, results */}
          <section className="space-y-4">
            <div className="rounded-xl border border-mist/30 bg-white p-5 shadow-sm">
              {/* Upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
                  dragOver
                    ? "border-steel bg-steel/10"
                    : "border-mist/40 hover:border-steel/50 hover:bg-cream/50"
                }`}
              >
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-steel/10 text-steel">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-dark/60">
                  {files.length > 0
                    ? `${files.length} file(s) selected — click to add more`
                    : "Drop images here or click to browse"}
                </p>
                <p className="mt-1 text-xs text-mist">PNG, JPEG up to 12 MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Live preview */}
              {previewUrl && previewDimensions && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-semibold text-dark">
                    Preview{files.length > 1 ? " (first image)" : ""}
                  </h3>
                  <div
                    className="relative overflow-hidden rounded-lg border border-mist/30"
                    style={{
                      aspectRatio: `${previewDimensions.w} / ${previewDimensions.h}`,
                      maxHeight: 360,
                    }}
                  >
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <div
                      dangerouslySetInnerHTML={{
                        __html: buildWatermarkSvgMarkup(
                          previewDimensions.w,
                          previewDimensions.h,
                          selectedTextId
                            ? (watermarkTexts.find((wt) => wt.id === selectedTextId)?.text ?? `${session.user.name} architecte`)
                            : `${session.user.name} architecte`
                        ),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* File list */}
              {files.length > 0 && (
                <ul className="mt-4 space-y-1">
                  {files.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-cream/50"
                    >
                      <span className="truncate text-dark">
                        {file.name}{" "}
                        <span className="text-dark/60">({formatSize(file.size)})</span>
                      </span>
                      <button
                        onClick={() => removeFile(i)}
                        className="ml-2 text-mist transition-colors hover:text-navy group-hover:text-dark/60"
                        aria-label={`Remove ${file.name}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Process button */}
              {files.length > 0 && (
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="mt-4 w-full rounded-lg bg-navy py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
                >
                  {processing ? "Processing..." : "Add Watermark"}
                </button>
              )}

              {error && (
                <div className="mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="rounded-xl border border-mist/30 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h2 className="text-sm font-semibold text-dark">
                      {results.length} image{results.length > 1 ? "s" : ""} ready
                    </h2>
                  </div>
                  {results.length > 1 && (
                    <button
                      onClick={downloadAll}
                      className="rounded-lg bg-steel/10 px-3 py-1.5 text-sm font-medium text-dark transition-colors hover:bg-steel/20"
                    >
                      Download all
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {results.map((img, i) => (
                    <div
                      key={i}
                      className="group relative overflow-hidden rounded-lg border border-mist/30"
                    >
                      <img
                        src={`data:${img.mimeType};base64,${img.data}`}
                        alt={img.name}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-dark/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="flex w-full items-center justify-between p-2">
                          <span className="truncate text-xs text-white">{img.name}</span>
                          <button
                            onClick={() => downloadImage(img)}
                            className="rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-dark transition-colors hover:bg-white"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
