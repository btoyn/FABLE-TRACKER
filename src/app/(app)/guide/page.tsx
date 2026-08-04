import { readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Guide" };

/**
 * The guide is one markdown file — docs/USER_GUIDE.md — rendered here and
 * readable on GitHub. Single source, so updating the doc updates this page.
 */
async function loadGuide(): Promise<string | null> {
  try {
    return await readFile(path.join(process.cwd(), "docs/USER_GUIDE.md"), "utf8");
  } catch {
    return null;
  }
}

/** Anchor id from a heading's text, so the contents list can link to it. */
function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function childText(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(childText).join("");
  if (children && typeof children === "object" && "props" in children) {
    return childText((children as { props: { children?: React.ReactNode } }).props.children);
  }
  return "";
}

const components: Components = {
  // The page supplies its own H1, so demote the document title.
  h1: () => null,
  h2: ({ children }) => (
    <h2
      id={slug(childText(children))}
      className="mt-11 scroll-mt-6 border-t border-border pt-8 text-[22px] font-bold tracking-[-0.02em] first:mt-0 first:border-0 first:pt-0"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      id={slug(childText(children))}
      className="mt-7 scroll-mt-6 text-[16.5px] font-semibold tracking-[-0.01em]"
    >
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mt-3 leading-relaxed text-foreground/85">{children}</p>,
  ul: ({ children }) => (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-foreground/85 marker:text-muted">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 leading-relaxed text-foreground/85 marker:text-muted">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-0.5">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded-md border border-border bg-background px-1.5 py-0.5 font-mono text-[0.86em] text-foreground">
      {children}
    </code>
  ),
  hr: () => <hr className="mt-10 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="mt-4 rounded-xl bg-primary-soft px-4 py-3 text-foreground/85">
      {children}
    </blockquote>
  ),
  // Tables carry most of the reference detail, so they scroll rather than squash.
  table: ({ children }) => (
    // max-w-full caps the scroll container at the column width, otherwise the
    // table's min-width leaks out and the whole page scrolls sideways.
    <div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[460px] border-collapse text-[14.5px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-background">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-border px-4 py-2.5 text-left text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border/70 px-4 py-2.5 align-top leading-relaxed text-foreground/85 last:border-r-0">
      {children}
    </td>
  ),
  tr: ({ children }) => <tr className="last:[&>td]:border-b-0">{children}</tr>,
};

export default async function GuidePage() {
  const markdown = await loadGuide();

  // Build a contents list from the top-level headings.
  const headings = (markdown ?? "")
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, "").trim());

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Working guide"
        description="How the CRM works and when to touch each part of it."
      />

      {markdown === null ? (
        <EmptyState
          title="Guide not available"
          description="The guide file could not be read on the server. It's still in the repository at docs/USER_GUIDE.md."
          className="py-12"
        />
      ) : (
        // grid-cols-1 resolves to minmax(0,1fr); a bare auto column would size
        // itself to the widest table instead of the viewport.
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_216px]">
          <Card className="min-w-0">
            <CardContent className="p-6 sm:p-8">
              <article className="min-w-0 max-w-[68ch] text-[15.5px]">
                <Markdown remarkPlugins={[remarkGfm]} components={components}>
                  {markdown}
                </Markdown>
              </article>
            </CardContent>
          </Card>

          {headings.length > 0 && (
            <nav
              aria-label="Guide contents"
              className="hidden lg:sticky lg:top-6 lg:block lg:self-start"
            >
              <p className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                On this page
              </p>
              <ul className="flex flex-col gap-0.5">
                {headings.map((heading) => (
                  <li key={heading}>
                    <Link
                      href={`#${slug(heading)}`}
                      className="block rounded-lg px-3 py-1.5 text-[13.5px] text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                    >
                      {heading}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
