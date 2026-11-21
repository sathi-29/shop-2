import Link from "next/link";

type PortalPlaceholderProps = {
  title: string;
};

export function PortalPlaceholder({ title }: PortalPlaceholderProps) {
  return (
    <main className="portal-placeholder flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-lg text-sm text-on-surface-variant">
        The design export does not include any {title.toLowerCase()} screens.
        This route is a placeholder, not a designed portal.
      </p>
      <Link
        className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary"
        href="/"
      >
        Back to ShopSphere
      </Link>
    </main>
  );
}
