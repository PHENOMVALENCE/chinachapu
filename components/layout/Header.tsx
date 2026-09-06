"use client";

import { useRequest } from "@/context/RequestContext";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

const navItems = [
  { href: "/#catalogue", label: "Catalogue" },
  { href: "/#request", label: "Send request" },
  { href: "/#custom", label: "Something else" },
];

export default function Header() {
  const { unitCount } = useRequest();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const closeMobileMenu = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur-md">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link
            className="text-2xl tracking-tight text-gray-900"
            href="/"
            aria-label="ChinaChapu home"
          >
            China<span className="text-primary">Chapu</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Page sections">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/#request"
              className="rounded-full border border-border px-3 py-1.5 text-sm font-medium"
              aria-label={`Your request, ${unitCount} units`}
            >
              Request{" "}
              <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {unitCount}
              </span>
            </Link>
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden rounded-full p-2 hover:bg-gray-100"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileOpen}
            >
              {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMobileOpen ? (
          <nav className="mt-4 flex flex-col gap-2 md:hidden" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
