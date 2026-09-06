"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error?.message ?? "Sign in failed.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="w-full space-y-4 rounded-xl border p-6">
        <h1 className="text-2xl font-semibold">Staff sign in</h1>
        <p className="text-sm text-muted-foreground">
          For ChinaChapu staff only. Ask the owner to add your email to the staff list
          and provision a password. There is no public registration.
        </p>
        <label className="block text-sm font-medium">
          Email
          <Input className="mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <Input className="mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full">
          Sign in
        </Button>
        <Link href="/" className="block text-center text-sm text-muted-foreground underline-offset-2 hover:underline">
          Back to catalogue
        </Link>
      </form>
    </div>
  );
}
