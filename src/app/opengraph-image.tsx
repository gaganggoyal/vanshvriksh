import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

export const alt = `${BRAND.name} — ${BRAND.descriptor}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The card a shared link unfurls into. */
export default function OpengraphImage() {
  const node = (x: number, y: number, w: number, label: string, tone: string) => (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: 64,
        borderRadius: 18,
        background: "white",
        boxShadow: "0 12px 30px -12px rgba(14,13,20,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 18px",
        fontSize: 22,
        color: "#0E0D14",
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 99, background: tone }} />
      {label}
    </div>
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #F0EEFF 0%, #F7F7FB 45%, #E7F8F1 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", padding: "72px 0 0 80px", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, #5B4BF5, #B62AD9)",
                display: "flex",
              }}
            />
            <div style={{ fontSize: 34, fontWeight: 700, color: "#0E0D14" }}>{BRAND.name}</div>
          </div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, marginTop: 56, color: "#0E0D14", letterSpacing: -2 }}>
            Find the relatives your family never wrote down.
          </div>
          <div style={{ fontSize: 26, color: "#6B6A7B", marginTop: 28 }}>{`${BRAND.domain} · private family tree`}</div>
        </div>
        <svg width="520" height="630" style={{ position: "absolute", right: 0, top: 0 }}>
          <path d="M150 190 V 250 H 360 V 300" stroke="#C8C1FF" strokeWidth="4" fill="none" />
          <path d="M360 330 V 380 H 250 V 430" stroke="#C8C1FF" strokeWidth="4" fill="none" />
          <path d="M360 380 H 440 V 430" stroke="#34C79A" strokeWidth="4" fill="none" strokeDasharray="10 8" />
        </svg>
        {node(730, 130, 250, "Grandfather", "#C8C1FF")}
        {node(880, 300, 250, "Mother", "#FBCFE8")}
        {node(690, 430, 230, "You", "#5B4BF5")}
        {node(950, 430, 220, "Cousin", "#A7F3D0")}
      </div>
    ),
    size,
  );
}
