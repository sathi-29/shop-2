import Link from "next/link";
import { portals } from "@/lib/mock-data/portals";

export default function HomePage() {
  return (
    <main className="portal-placeholder flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-container text-2xl font-bold text-on-primary">
            S
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">ShopSphere</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Choose a ShopSphere experience
          </p>
        </div>
        <div className="grid gap-4">
          {portals.map((portal) => (
            <Link
              key={portal.href}
              className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 transition-colors hover:bg-surface-container-low"
              href={portal.href}
            >
              <span className="block text-lg font-semibold">{portal.label}</span>
              <span className="mt-1 block text-sm text-on-surface-variant">
                {portal.description}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
