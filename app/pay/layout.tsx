import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <p className="text-sm text-muted-foreground">ChinaChapu payment</p>
        {children}
      </div>
    </div>
  );
}
