import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="max-w-2xl">
          <p className="text-2xl tracking-tight">
            China<span className="text-primary">Chapu</span>
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Browse the catalogue and request products. Staff will contact you to
            discuss availability and arrangements. This site does not take
            payments or show prices.
          </p>
        </div>
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Template design attribution: Bloomtpl / ThemeWagon. Original README is preserved in the repository.</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/admin/login" className="underline-offset-2 hover:text-foreground hover:underline">
              Staff login
            </Link>
            <span>© {new Date().getFullYear()} ChinaChapu</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
