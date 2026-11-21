import { readFileSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { ScreenRenderer } from "@/components/screen-renderer";
import imageMap from "@/lib/mock-data/image-map.json";
import { screens } from "@/lib/mock-data/screens";

type CustomerScreenPageProps = {
  params: Promise<{ screen: string }>;
};

function getScreenParts(source: string) {
  const body = source.match(/<body\b([^>]*)>([\s\S]*?)<\/body>/i);
  if (!body) throw new Error("Screen source is missing its body element.");

  const bodyClass =
    body[1].match(/\bclass=["']([^"']*)["']/i)?.[1]?.trim() ?? "";
  const scripts = [...body[2].matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
  const markup = body[2].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  const styles = [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)]
    .map((match) => match[1])
    .join("\n");

  return {
    bodyClass,
    markup,
    scripts,
    styles: styles ? `<style>${styles}</style>` : "",
  };
}

export function generateStaticParams() {
  return screens
    .filter((screen) => screen.group === "customer")
    .map((screen) => ({ screen: screen.slug }));
}

export default async function CustomerScreenPage({
  params,
}: CustomerScreenPageProps) {
  const { screen: slug } = await params;
  const definition = screens.find(
    (screen) => screen.group === "customer" && screen.slug === slug,
  );
  if (!definition) notFound();

  const sourcePath = path.join(
    process.cwd(),
    "lib",
    "mock-data",
    "screens",
    definition.sourceFolder,
    "code.html",
  );
  let source = readFileSync(sourcePath, "utf8");
  for (const [remoteUrl, localUrl] of Object.entries(imageMap)) {
    source = source.split(remoteUrl).join(localUrl);
  }
  const parts = getScreenParts(source);

  return (
    <ScreenRenderer
      bodyClass={parts.bodyClass}
      markup={parts.markup}
      scripts={parts.scripts}
      screenSlug={slug}
      styles={parts.styles}
    />
  );
}
