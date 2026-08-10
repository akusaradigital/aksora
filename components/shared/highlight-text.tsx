"use client";

import Link from "next/link";

const TRACE_REGEX = /\b((?:TASK|BUG|TC|SES|PLAN|SUITE)-\d+)\b/g;

function getTraceHref(tag: string) {
  if (tag.startsWith("TASK")) return "/tasks";
  if (tag.startsWith("BUG")) return "/bugs";
  if (tag.startsWith("TC")) return "/test-cases";
  if (tag.startsWith("PLAN")) return "/test-plans";
  if (tag.startsWith("SUITE")) return "/test-suites";
  if (tag.startsWith("SES")) return "/test-execution";
  return "/";
}

export function HighlightText({ 
  text, 
  query,
  linkify = true
}: { 
  text: string; 
  query: string;
  linkify?: boolean;
}) {
  if (!text) return <span>-</span>;
  
  // First, if no query and no linkify needed, just return text
  if (!query.trim() && !linkify) return <span>{text}</span>;

  // We need to split the text by BOTH the search query AND the traceability tags
  // This is tricky. Let's do a multi-step approach or a combined regex.
  
  const escapedQuery = query.trim() ? query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : null;
  const combinedRegex = escapedQuery 
    ? new RegExp(`(${escapedQuery})|\\b((?:TASK|BUG|TC|SES|PLAN|SUITE)-\\d+)\\b`, "gi")
    : TRACE_REGEX;

  const _parts = text.split(combinedRegex);
  // parts will contain: [text_before, match1, match2, text_after...]
  // Since we have two capturing groups in combinedRegex (if query exists), 
  // we need to be careful with the mapping.
  
  // Simplified approach: just use a flat map and check each part
  
  // Note: String.split with capturing groups returns the matches in the array.
  // Group 1: Query match
  // Group 2: Tag match (if combined)
  
  return (
    <span>
      {text.split(combinedRegex).map((part, i) => {
        if (!part) return null;
        // Check if it's the query
        if (escapedQuery && part.toLowerCase() === query.toLowerCase()) {
          return (
            <span key={i} className="bg-sky-100 text-sky-900 font-bold px-0.5 rounded-sm">
              {part}
            </span>
          );
        }

        // Check if it's a traceability tag
        if (linkify && part.match(/^(?:TASK|BUG|TC|SES|PLAN|SUITE)-\d+$/i)) {
          const upper = part.toUpperCase();
          return (
            <Link
              key={i}
              href={getTraceHref(upper)}
              className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline decoration-indigo-300 underline-offset-2"
              onClick={(e) => e.stopPropagation()} // Prevent triggering parent row clicks
            >
              {upper}
            </Link>
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
