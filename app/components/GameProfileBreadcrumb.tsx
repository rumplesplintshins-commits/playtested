import Link from "next/link";
import {
  gameBreadcrumbStructuredData,
  serializeJsonLd,
} from "@/lib/seo";

export default function GameProfileBreadcrumb({
  name,
  path,
}: {
  name: string;
  path: string;
}) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-6 pt-5 text-sm text-zinc-400">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="underline underline-offset-4 hover:text-[#77f29b]">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="truncate text-zinc-200">
            {name}
          </li>
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(gameBreadcrumbStructuredData(path, name)),
        }}
      />
    </>
  );
}
