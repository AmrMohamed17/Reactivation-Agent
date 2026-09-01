import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-xl font-semibold">Greenscape Pro — Reactivation Agent</h1>
      <p className="mt-2 text-sm text-gray-600">
        The funnel dashboard lands in phase 7.
      </p>
      <Link href="/queue" className="mt-4 inline-block text-sm text-sky-700 underline">
        Go to the review queue
      </Link>
    </main>
  );
}
