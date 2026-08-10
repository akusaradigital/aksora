"use client";

import { useState, useEffect, useRef } from "react";
import { ChatCircle, PaperPlaneTilt, Warning, Lock } from "@phosphor-icons/react";

// ── Types ──────────────────────────────────────────────────────────────────

type Comment = {
  id: number;
  authorName: string;
  content: string;
  createdAt: string;
};

type CommentThreadProps = {
  entityType: string;
  entityId: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const MIN_CONTENT = 1;
const MAX_CONTENT = 2000;

function formatCommentTime(value: string): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin === 1) return "1 minute ago";
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour === 1) return "1 hour ago";
    if (diffHour < 24) return `${diffHour} hours ago`;
    if (diffDay === 1) return "1 day ago";
    if (diffDay < 30) return `${diffDay} days ago`;
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function CommentThread({ entityType, entityId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [readOnly, setReadOnly] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNoAccess(false);

    fetch(`/api/dashboard/comments?entityType=${encodeURIComponent(entityType)}&entityId=${entityId}`)
      .then((res) => {
        if (res.status === 403) {
          if (!cancelled) setNoAccess(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setComments(data.comments || []);
        setReadOnly(!data.canWrite);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load comments");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [entityType, entityId]);

  // Don't render if user has no read access
  if (noAccess) return null;

  const trimmed = content.trim();
  const charCount = trimmed.length;

  function validate(): string | null {
    if (charCount === 0) return "Comment cannot be empty";
    if (charCount > MAX_CONTENT) return `Comment must be ${MAX_CONTENT} characters or fewer`;
    return null;
  }

  function handleContentChange(value: string) {
    setContent(value);
    setError(null);
    // Clear validation message when user starts typing valid content
    if (validationMsg) {
      const t = value.trim();
      if (t.length >= MIN_CONTENT && t.length <= MAX_CONTENT) {
        setValidationMsg(null);
      }
    }
  }

  async function handleSubmit() {
    const msg = validate();
    if (msg) {
      setValidationMsg(msg);
      return;
    }
    setValidationMsg(null);
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/dashboard/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, content: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit comment");
      }

      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setContent("");
        // Scroll to bottom after adding new comment
        setTimeout(() => {
          scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }, 50);
      }
    } catch (err: any) {
      // Retain draft text on failure
      setError(err.message || "Failed to submit comment");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="border-t border-gray-100 px-5 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <ChatCircle size={14} weight="bold" className="text-gray-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600">Comments</h3>
        {readOnly && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-gray-400">
            <Lock size={10} weight="bold" /> Read-only
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse  bg-gray-50" />
          ))}
        </div>
      )}

      {/* Comments list */}
      {!loading && (
        <div ref={scrollRef} className="max-h-60 space-y-3 overflow-y-auto pr-1">
          {comments.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className=" bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-gray-700">{comment.authorName}</span>
                  <span className="text-[10px] text-gray-400">{formatCommentTime(comment.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Input area */}
      {!loading && !readOnly && (
        <div className="mt-3">
          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment..."
              disabled={submitting}
              rows={2}
              className="w-full resize-none  border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[10px] font-medium ${charCount > MAX_CONTENT ? "text-rose-500" : "text-gray-400"}`}>
                {charCount}/{MAX_CONTENT}
              </span>
              <button
                onClick={handleSubmit}
                disabled={submitting || charCount === 0 || charCount > MAX_CONTENT}
                className="inline-flex items-center gap-1  bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <PaperPlaneTilt size={12} weight="bold" />
                {submitting ? "Sending..." : "Send"}
              </button>
            </div>
          </div>

          {/* Validation message */}
          {validationMsg && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-600">
              <Warning size={10} weight="bold" /> {validationMsg}
            </p>
          )}

          {/* Error message */}
          {error && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-rose-600">
              <Warning size={10} weight="bold" /> {error}
            </p>
          )}
        </div>
      )}

      {/* Read-only disabled input */}
      {!loading && readOnly && (
        <div className="mt-3">
          <textarea
            disabled
            placeholder="You do not have write access"
            rows={2}
            className="w-full resize-none  border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400 cursor-not-allowed"
          />
        </div>
      )}
    </div>
  );
}
