import sharp from "sharp";

const WATERMARK_TEXT = "Léonore Grec Architecte";

function buildWatermarkSvg(width: number, height: number): Buffer {
  // Font size proportional to image diagonal
  const diagonal = Math.sqrt(width * width + height * height);
  const fontSize = Math.max(16, Math.round(diagonal / 30));
  const lineSpacing = fontSize * 3;

  // Calculate rotation angle (bottom-left to top-right diagonal)
  const angle = -Math.atan2(height, width) * (180 / Math.PI);

  // Generate repeated lines to cover the entire rotated area
  const lines: string[] = [];
  const coverSize = diagonal * 2;
  const offsetX = -coverSize / 2 + width / 2;
  const offsetY = -coverSize / 2 + height / 2;

  for (let y = 0; y < coverSize; y += lineSpacing) {
    lines.push(
      `<text x="${coverSize / 2}" y="${y}" text-anchor="middle" font-family="sans-serif" font-size="${fontSize}" fill="white" fill-opacity="0.5" letter-spacing="2">${escapeXml(WATERMARK_TEXT)}</text>`
    );
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <g transform="translate(${width / 2}, ${height / 2}) rotate(${angle}) translate(${offsetX - width / 2}, ${offsetY - height / 2})">
    ${lines.join("\n    ")}
  </g>
</svg>`;

  return Buffer.from(svg);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function addWatermark(
  input: Buffer,
  mimeType: string
): Promise<Buffer> {
  const image = sharp(input);
  const metadata = await image.metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const watermarkSvg = buildWatermarkSvg(width, height);

  const pipeline = image.composite([
    { input: watermarkSvg, top: 0, left: 0 },
  ]);

  if (mimeType === "image/png") {
    return pipeline.png().toBuffer();
  }
  return pipeline.jpeg({ quality: 95 }).toBuffer();
}
