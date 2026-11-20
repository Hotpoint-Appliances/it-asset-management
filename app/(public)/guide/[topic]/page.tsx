import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { AudienceBadges, GuideText } from "@/components/guide/GuideText";
import { findGuideTopic, guideTopics } from "@/lib/guide/topics";

type Props = { params: Promise<{ topic: string }> };

export function generateStaticParams() {
  return guideTopics.map((t) => ({ topic: t.slug }));
}

// Only the topics above exist; anything else is a 404 rather than a render attempt.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = findGuideTopic((await params).topic);
  if (!topic) return {};
  return { title: `${topic.title} · Guide`, description: topic.summary };
}

export default async function GuideTopicPage({ params }: Props) {
  const topic = findGuideTopic((await params).topic);
  if (!topic) notFound();

  const index = guideTopics.indexOf(topic);
  const prev = guideTopics[index - 1];
  const next = guideTopics[index + 1];
  const Icon = topic.icon;

  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <span className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-xl">
          <Icon weight="bold" className="h-5 w-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{topic.title}</h1>
          <p className="text-muted-foreground text-base">{topic.summary}</p>
        </div>
        <AudienceBadges who={topic.who} />
        {topic.sections.length > 1 && (
          <nav
            aria-label="On this page"
            className="border-border border-l-2 pl-4"
          >
            <ul className="flex flex-col gap-1.5 text-sm">
              {topic.sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {topic.sections.map((s) => (
        // scroll-mt clears the sticky header when an anchor is followed.
        <section
          key={s.id}
          id={s.id}
          aria-labelledby={`${s.id}-title`}
          className="flex scroll-mt-24 flex-col gap-4"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2
              id={`${s.id}-title`}
              className="text-xl font-semibold tracking-tight"
            >
              {s.title}
            </h2>
            {s.who && <AudienceBadges who={s.who} />}
          </div>
          {s.intro && (
            <p className="text-muted-foreground text-sm leading-relaxed">
              <GuideText text={s.intro} />
            </p>
          )}
          {s.steps && (
            <ol className="flex flex-col gap-3">
              {s.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed">
                  <span
                    aria-hidden="true"
                    className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  >
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground pt-0.5">
                    <GuideText text={step} />
                  </span>
                </li>
              ))}
            </ol>
          )}
          {s.notes && (
            <ul className="text-muted-foreground marker:text-primary/60 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed">
              {s.notes.map((note, i) => (
                <li key={i}>
                  <GuideText text={note} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <nav
        aria-label="More topics"
        className="border-border grid gap-3 border-t pt-6 sm:grid-cols-2"
      >
        {prev ? (
          <PagerLink
            href={`/guide/${prev.slug}`}
            label="Previous"
            title={prev.title}
          />
        ) : (
          <PagerLink href="/guide" label="Previous" title="Overview" />
        )}
        {next && (
          <PagerLink
            href={`/guide/${next.slug}`}
            label="Next"
            title={next.title}
            forward
          />
        )}
      </nav>
    </article>
  );
}

function PagerLink({
  href,
  label,
  title,
  forward = false,
}: {
  href: string;
  label: string;
  title: string;
  forward?: boolean;
}) {
  const Arrow = forward ? ArrowRightIcon : ArrowLeftIcon;
  return (
    <Link
      href={href}
      className={`border-border hover:border-primary/40 focus-visible:ring-ring flex flex-col gap-1 rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none ${forward ? "sm:col-start-2 sm:items-end sm:text-right" : ""}`}
    >
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {!forward && <Arrow weight="bold" className="h-3.5 w-3.5" />}
        {label}
        {forward && <Arrow weight="bold" className="h-3.5 w-3.5" />}
      </span>
      <span className="text-sm font-medium">{title}</span>
    </Link>
  );
}
