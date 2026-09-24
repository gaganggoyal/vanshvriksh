import { readFileSync } from "fs";
import path from "path";
import { ImageResponse } from "next/og";

export const dynamic = "force-static";

/** The favicon as a PNG for letters — Gmail and Outlook don't show SVG. Rendered once at build. */
export function GET() {
  const svg = readFileSync(path.join(process.cwd(), "public", "favicon.svg"));
  const src = `data:image/svg+xml;base64,${svg.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <img src={src} width={96} height={96} alt="" />
      </div>
    ),
    { width: 96, height: 96, headers: { "Cache-Control": "public, max-age=604800" } },
  );
}
