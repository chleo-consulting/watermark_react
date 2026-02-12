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
        <p className="text-gray-500">Loading...</p>
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
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Add Watermark</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{session.user.name}</span>
          <button
            onClick={handleLogout}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      </div>

      {/* Watermark text management */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-medium">Watermark Text</h2>
        <select
          value={selectedTextId}
          onChange={(e) => setSelectedTextId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{session.user.name} architecte (default)</option>
          {watermarkTexts.map((wt) => (
            <option key={wt.id} value={wt.id}>
              {wt.text}
            </option>
          ))}
        </select>

        {watermarkTexts.length > 0 && (
          <ul className="mt-2 space-y-1">
            {watermarkTexts.map((wt) => (
              <li
                key={wt.id}
                className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-1.5 text-sm"
              >
                <span className="truncate">{wt.text}</span>
                <button
                  onClick={() => deleteWatermarkText(wt.id)}
                  className="ml-2 text-gray-400 hover:text-red-500"
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
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={addWatermarkText}
            disabled={!newText.trim()}
            className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {/* Upload area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-400"
        >
          <p className="text-gray-600">
            {files.length > 0
              ? `${files.length} file(s) selected`
              : "Click to select images (PNG, JPEG)"}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <ul className="mt-3 space-y-1">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 text-sm"
              >
                <span className="truncate">
                  {file.name}{" "}
                  <span className="text-gray-400">({formatSize(file.size)})</span>
                </span>
                <button
                  onClick={() => removeFile(i)}
                  className="ml-2 text-gray-400 hover:text-red-500"
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
            className="mt-4 w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {processing ? "Processing..." : "Add Watermark"}
          </button>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Processed Images</h2>
              {results.length > 1 && (
                <button
                  onClick={downloadAll}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Download all
                </button>
              )}
            </div>
            <div className="space-y-3">
              {results.map((img, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-md border border-gray-200 p-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={`data:${img.mimeType};base64,${img.data}`}
                      alt={img.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                    <span className="text-sm">{img.name}</span>
                  </div>
                  <button
                    onClick={() => downloadImage(img)}
                    className="rounded-md bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
