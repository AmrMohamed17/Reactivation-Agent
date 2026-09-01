"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Login failed.");
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded border border-gray-300 p-6"
      >
        <div>
          <h1 className="text-lg font-semibold">Greenscape Pro</h1>
          <p className="text-sm text-gray-600">Reactivation agent — internal tool</p>
        </div>

        <input
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          autoFocus
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending || passcode.length === 0}
          className="w-full rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </main>
  );
}
