"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function MagicInner() {
  const params = useSearchParams();
  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      window.location.href = "/login?error=invalid";
      return;
    }
    window.location.href = `/api/auth/magic?token=${encodeURIComponent(token)}`;
  }, [params]);
  return (
    <div className="grid min-h-screen place-items-center">
      <p className="font-devanagari text-2xl text-brand">प्रवेश हो रहा है…</p>
    </div>
  );
}

export default function MagicPage() {
  return (
    <Suspense>
      <MagicInner />
    </Suspense>
  );
}
