import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--lmfit-surface)] text-[var(--foreground)] pb-28">
      <div className="max-w-3xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
