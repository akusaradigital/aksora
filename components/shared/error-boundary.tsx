"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { WarningCircle, CopySimple } from "@phosphor-icons/react";
import { InlineAlert } from "@/components/ui/inline-alert";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  detailsOpen: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    detailsOpen: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private copyError = () => {
    const { error, errorInfo } = this.state;
    const text = [
      `Error: ${error?.message}`,
      ``,
      `Stack:`,
      error?.stack,
      ``,
      `Component Stack:`,
      errorInfo?.componentStack,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      const isDev = process.env.NODE_ENV === "development";
      const { error, errorInfo, detailsOpen, copied } = this.state;

      return (
        <div className="flex min-h-[200px] w-full flex-col items-center justify-center  border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center  bg-rose-100 text-rose-600 mb-4">
            <WarningCircle size={28} weight="fill" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Something went wrong</h3>
          <InlineAlert
            variant="error"
            message="Component failed to load. Please try refreshing the page or check your data format."
            compact
            className="mt-3 max-w-xs justify-center px-0"
          />
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className=" bg-white px-4 py-2 text-xs font-bold text-rose-600 shadow-sm border border-rose-100 hover:bg-rose-100 transition"
            >
              Try Again
            </button>
            {isDev && (
              <button
                onClick={this.copyError}
                className=" bg-white px-4 py-2 text-xs font-bold text-gray-600 shadow-sm border border-gray-200 hover:bg-gray-100 transition flex items-center gap-1.5"
              >
                <CopySimple size={13} weight="bold" />
                {copied ? "Copied!" : "Copy Error"}
              </button>
            )}
          </div>
          {isDev && error && (
            <div className="mt-4 w-full max-w-2xl text-left">
              <button
                onClick={() => this.setState((s) => ({ detailsOpen: !s.detailsOpen }))}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 transition"
              >
                <svg
                  className={`h-3 w-3 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <path d="M6 8L1 3h10L6 8z" />
                </svg>
                {detailsOpen ? "Hide" : "Show"} error details
              </button>
              {detailsOpen && (
                <div className="mt-2  border border-rose-200 bg-white p-4 text-left">
                  <p className="text-xs font-bold text-rose-700 mb-1">{error.message}</p>
                  <pre className="text-[11px] text-gray-600 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                    {error.stack}
                  </pre>
                  {errorInfo?.componentStack && (
                    <>
                      <p className="text-xs font-bold text-gray-500 mt-3 mb-1">Component Stack:</p>
                      <pre className="text-[11px] text-gray-500 overflow-auto max-h-32 whitespace-pre-wrap break-all">
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
