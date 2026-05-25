import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Local Lore",
  description:
    "The story behind Local Lore, an AI-powered local history explorer.",
};

export default function AboutPage() {
  return (
    <div className="min-h-full bg-stone-50 text-stone-800">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl px-6 py-8 text-center">
          <h1 className="font-lore text-3xl text-amber-900 sm:text-4xl">
            Local Lore
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            AI-powered local history explorer
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10 sm:py-12">
        <p className="font-lore text-2xl text-amber-900">Hi, I&apos;m Ajay.</p>

        <div className="mt-8 space-y-5 text-[0.95rem] leading-relaxed text-stone-700">
          <p>
            The idea for Local Lore came from when I studied abroad in Lund,
            Sweden for my final semester of university. I did a good amount of
            traveling around Europe, which I knew was extremely rich in history.
            But I was surprised when I would just accidentally stumble upon the
            remains of some ancient civilization or the place where thousands of
            people died a hundred years ago.
          </p>
          <p>
            I also took a class in Lund about the evolution of humanity, and
            along the way learned some gruesome history about the Battle of Lund
            and a cool restaurant that used to be someone&apos;s house from like
            500 years ago. I also loved learning about the history of Isla
            Vista, where I spent most of my time at UC Santa Barbara.
          </p>
          <p>
            I learned a whole lot making this project, particularly trying to
            make it sustainably free forever. I&apos;m a sucker for free tiers,
            but it also comes with its limitations and challenges. This project
            is hosted on Vercel (free), and the Wikipedia data is also free and
            widely available, but the AI step for consolidating the Wikipedia
            articles is the true bottleneck.
          </p>
          <p>
            Claude and OpenAI doesn&apos;t have a free tier API endpoint, but
            Gemini offers 15 Requests Per Minute / 500 Requests Per Day for their
            Gemini 3.1 Flash Lite model. To account for (hopefully) if this
            project gets a lot of traffic, I used a message queue specifically
            made for serverless architecture, QStash, to enqueue requests to
            ensure each new location is processed within the Gemini&apos;s rate
            limits. I also put Supabase as a caching layer so that everyone&apos;s
            searches are saved for others to read and not thrown away (unless
            you turn on Private Mode).
          </p>
        </div>

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-800">
            Daily limits
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Below are the hard limits of this project, which I think should be
            more than enough per day:
          </p>
          <ul className="mt-4 space-y-4 text-sm text-stone-700">
            <li className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <span className="font-medium text-stone-900">
                Gemini 3.1 Flash Lite
              </span>
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-stone-600">
                <li>15 requests per minute</li>
                <li>500 requests per day</li>
                <li>250K peak tokens per minute</li>
              </ul>
            </li>
            <li className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <span className="font-medium text-stone-900">Supabase</span>
              <ul className="mt-2 list-inside list-disc text-stone-600">
                <li>2 GB database size</li>
              </ul>
            </li>
            <li className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <span className="font-medium text-stone-900">
                Upstash QStash Message Broker
              </span>
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-stone-600">
                <li>1,000 messages per day</li>
                <li>50 GB monthly bandwidth</li>
              </ul>
            </li>
            <li className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <span className="font-medium text-stone-900">Upstash Redis</span>
              <ul className="mt-2 list-inside list-disc space-y-0.5 text-stone-600">
                <li>10,000 commands per second</li>
                <li>256 MB data size</li>
                <li>50 GB monthly bandwidth</li>
              </ul>
            </li>
          </ul>
        </section>

        <p className="mt-10 text-[0.95rem] leading-relaxed text-stone-700">
          I think these limitations made me a more resourceful engineer,
          and I&apos;m hoping to add more features!
        </p>

        <p className="mt-8 text-[0.95rem] text-stone-700">
          Check out my other projects on{" "}
          <a
            href="https://ajayliu.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-900"
          >
            ajayliu.com
          </a>
        </p>

        <nav
          className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
          aria-label="Contact and social links"
        >
          <a
            href="https://www.linkedin.com/in/ajayliu"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-900"
          >
            LinkedIn
          </a>
          <span className="text-stone-300" aria-hidden>
            ·
          </span>
          <a
            href="https://github.com/ajayliu"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-900"
          >
            GitHub
          </a>
          <span className="text-stone-300" aria-hidden>
            ·
          </span>
          <a
            href="mailto:contact@ajayliu.com"
            className="font-medium text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-900"
          >
            contact@ajayliu.com
          </a>
        </nav>

        <p className="mt-10 border-t border-stone-200 pt-8 text-center text-sm text-zinc-500">
          <Link
            href="/"
            className="text-amber-700 hover:text-amber-900 hover:underline"
          >
            ← Back to the map
          </Link>
        </p>
      </main>
    </div>
  );
}
