import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarBlank, Clock, User } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Blog — Insights on QA Strategy, Testing & Quality Engineering",
  description:
    "Expert insights on test management, QA strategy, automation, and quality engineering best practices from the Aksora team.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 3600;

const posts = [
  {
    slug: "why-spreadsheets-fail-qa-teams",
    title: "Why Spreadsheets Fail QA Teams at Scale — And What to Do About It",
    excerpt: "Spreadsheets served QA teams well in the early days. But as teams grow beyond 5 people and test suites exceed 200 cases, the cracks become fractures. We analyze the five failure modes and present a structured migration path.",
    date: "May 15, 2026",
    readTime: "7 min read",
    category: "Strategy",
    author: "Aksora Team",
  },
  {
    slug: "test-case-writing-guide",
    title: "The Anatomy of a High-Quality Test Case: A Practical Framework",
    excerpt: "A well-written test case is the foundation of reliable QA. We break down the structure — preconditions, steps, expected results — and share the framework our team uses to maintain a living test library.",
    date: "May 10, 2026",
    readTime: "5 min read",
    category: "Best Practices",
    author: "Aksora Team",
  },
  {
    slug: "qa-metrics-that-matter",
    title: "QA Metrics That Drive Decisions: A Data-Driven Approach to Quality",
    excerpt: "Not all metrics are actionable. We identify the five metrics that correlate with actual quality outcomes — and three vanity metrics that waste your team's attention.",
    date: "May 5, 2026",
    readTime: "6 min read",
    category: "Metrics & Analytics",
    author: "Aksora Team",
  },
  {
    slug: "sprint-testing-workflow",
    title: "Integrating QA Into Sprint Cycles Without Slowing Down Delivery",
    excerpt: "The tension between speed and quality is a false dichotomy. Here's how high-performing teams embed QA into every sprint phase — from planning to retrospective — without becoming a bottleneck.",
    date: "April 28, 2026",
    readTime: "8 min read",
    category: "Workflow",
    author: "Aksora Team",
  },
  {
    slug: "bug-triage-process",
    title: "Building a Bug Triage Process That Actually Works",
    excerpt: "Most bug backlogs grow indefinitely because triage is ad-hoc. We share a repeatable triage framework with severity matrices, SLA targets, and escalation paths that keep your backlog healthy.",
    date: "April 20, 2026",
    readTime: "6 min read",
    category: "Process",
    author: "Aksora Team",
  },
];

export default function BlogPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-3">Blog & Resources</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Insights on Quality Engineering</h1>
          <p className="mt-4 text-[15px] text-gray-400 max-w-2xl mx-auto">
            Expert perspectives on test management strategy, QA processes, and quality metrics. Written by practitioners, for practitioners.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-5 py-12">
          <article className="border-2 border-blue-100 bg-blue-50/30 p-8 hover:border-blue-200 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-blue-600 px-2.5 py-1">Featured</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5">{posts[0].category}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900">{posts[0].title}</h2>
            <p className="mt-3 text-[13px] text-gray-600 leading-relaxed">{posts[0].excerpt}</p>
            <div className="mt-5 flex items-center gap-4 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><User size={11} weight="bold" />{posts[0].author}</span>
              <span className="flex items-center gap-1"><CalendarBlank size={11} weight="bold" />{posts[0].date}</span>
              <span className="flex items-center gap-1"><Clock size={11} weight="bold" />{posts[0].readTime}</span>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600">
              Coming soon
            </span>
          </article>
        </div>
      </section>

      {/* All Posts */}
      <section className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <h2 className="text-lg font-bold text-gray-900 mb-8">All Articles</h2>
          <div className="space-y-5">
            {posts.slice(1).map((post) => (
              <article key={post.slug} className="border border-gray-200 bg-white p-6 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5">{post.category}</span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <CalendarBlank size={11} weight="bold" aria-hidden="true" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock size={11} weight="bold" aria-hidden="true" />
                    {post.readTime}
                  </span>
                </div>
                <h3 className="text-[14px] font-bold text-gray-900">{post.title}</h3>
                <p className="mt-2 text-[12px] text-gray-500 leading-relaxed">{post.excerpt}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                  Coming soon
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center">
          <h2 className="text-xl font-bold text-gray-900">Stay updated on QA best practices</h2>
          <p className="mt-2 text-[13px] text-gray-500 max-w-md mx-auto">
            Get notified when we publish new articles. No spam, unsubscribe anytime.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="w-full sm:flex-1 border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-blue-600 focus:ring-0 focus:outline-none transition-colors"
            />
            <button className="w-full sm:w-auto bg-blue-600 px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center">
          <h2 className="text-2xl font-bold">Put these insights into practice</h2>
          <p className="mt-3 text-[14px] text-gray-400 max-w-lg mx-auto">
            Aksora gives you the tools to implement modern QA workflows. Start free, scale when ready.
          </p>
          <Link href="/login" className="mt-6 group inline-flex items-center gap-2 bg-blue-600 px-7 py-3 text-[13px] font-semibold text-white hover:bg-blue-500 transition-all hover:translate-y-[-1px]">
            Start Free
            <ArrowRight size={14} weight="bold" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
