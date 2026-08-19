"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Bug,
  Checks,
  ClipboardText,
  Kanban,
  Lightning,
  PlayCircle,
  Rocket,
  SquaresFour,
  X,
  CheckCircle,
  Confetti,
} from "@phosphor-icons/react";

const ONBOARDING_KEY_PREFIX = "aksora:onboarding:completed";
const ONBOARDING_STEP_KEY_PREFIX = "aksora:onboarding:step";
const ONBOARDING_DISMISSED_KEY_PREFIX = "aksora:onboarding:dismissed";

type TourStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetSelector?: string;
  targetHref?: string;
  position?: "top" | "bottom" | "left" | "right";
  action?: string;
};

const defaultTourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Aksora!",
    description: "Let's take a quick tour to help you get started. This will only take a minute.",
    icon: <Rocket size={20} weight="bold" />,
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description: "This is your command center. See bug counts, test pass rates, sprint progress, and team activity at a glance.",
    icon: <SquaresFour size={20} weight="bold" />,
    targetHref: "/dashboard",
  },
  {
    id: "test-plans",
    title: "Start with Test Plans",
    description: "Create a test plan to define your testing strategy. Plans organize what needs to be tested for a release or feature.",
    icon: <ClipboardText size={20} weight="bold" />,
    targetHref: "/test-plans",
    action: "Try creating your first test plan",
  },
  {
    id: "test-cases",
    title: "Write Test Cases",
    description: "Break down your plan into individual test cases with steps, expected results, and preconditions. Group them into suites for better organization.",
    icon: <Checks size={20} weight="bold" />,
    targetHref: "/test-cases",
    action: "Add a test case to get started",
  },
  {
    id: "test-execution",
    title: "Execute Test Sessions",
    description: "Run your test cases in sessions. Mark each case as passed, failed, or blocked. Track execution progress in real-time.",
    icon: <PlayCircle size={20} weight="bold" />,
    targetHref: "/test-execution",
  },
  {
    id: "bugs",
    title: "Track Bugs",
    description: "When tests fail, log bugs directly. Link them to test cases, assign severity, and track resolution through your workflow.",
    icon: <Bug size={20} weight="bold" />,
    targetHref: "/bugs",
    action: "Report your first bug",
  },
  {
    id: "tasks",
    title: "Manage Tasks",
    description: "Track development work, follow-ups, and improvements. Use Kanban view for visual workflow management.",
    icon: <Kanban size={20} weight="bold" />,
    targetHref: "/tasks",
  },
  {
    id: "shortcuts",
    title: "Pro Tips",
    description: "Use Ctrl+K to open the Command Palette for quick navigation and actions. Press N on any module page to create a new entry instantly.",
    icon: <Lightning size={20} weight="bold" />,
  },
];

const roleTourMap: Record<string, TourStep[]> = {
  qa: defaultTourSteps,
  pm: [
    { id: "welcome", title: "Welcome to Aksora!", description: "Quick tour for keeping sprint health and quality in view.", icon: <Rocket size={20} weight="bold" /> },
    { id: "dashboard", title: "Watch the dashboard", description: "See bug counts, test pass rates, sprint progress, and team activity at a glance.", icon: <SquaresFour size={20} weight="bold" />, targetHref: "/dashboard" },
    { id: "reporting", title: "Use weekly reports", description: "Check the weekly digest to spot blocked work, bug aging, and risks before they grow.", icon: <ClipboardText size={20} weight="bold" />, targetHref: "/weekly-report" },
    { id: "tasks", title: "Track delivery", description: "Keep follow-ups and sprint work in one place so the team stays aligned.", icon: <Kanban size={20} weight="bold" />, targetHref: "/tasks" },
    { id: "shortcuts", title: "Pro Tips", description: "Use Ctrl+K for quick navigation and N to create new entries from module pages.", icon: <Lightning size={20} weight="bold" /> },
  ],
  fe: [
    { id: "welcome", title: "Welcome to Aksora!", description: "Quick tour for QA handoff, bugs, and delivery flow.", icon: <Rocket size={20} weight="bold" /> },
    { id: "dashboard", title: "Watch the dashboard", description: "See what is blocked, what passed, and what still needs attention.", icon: <SquaresFour size={20} weight="bold" />, targetHref: "/dashboard" },
    { id: "bugs", title: "Track bugs", description: "Review bugs with steps, severity, and evidence so fixes stay focused.", icon: <Bug size={20} weight="bold" />, targetHref: "/bugs" },
    { id: "tasks", title: "Manage tasks", description: "Keep follow-up work visible instead of letting it disappear in chat.", icon: <Kanban size={20} weight="bold" />, targetHref: "/tasks" },
    { id: "shortcuts", title: "Pro Tips", description: "Use Ctrl+K for quick navigation and N to create new entries from module pages.", icon: <Lightning size={20} weight="bold" /> },
  ],
  be: [
    { id: "welcome", title: "Welcome to Aksora!", description: "Quick tour for bug intake and QA handoff.", icon: <Rocket size={20} weight="bold" /> },
    { id: "bugs", title: "Triage bugs", description: "Open bugs with clear context and evidence so fixes are easier to ship.", icon: <Bug size={20} weight="bold" />, targetHref: "/bugs" },
    { id: "test-execution", title: "Check execution", description: "Review failed cases and blocked sessions before they become rework.", icon: <PlayCircle size={20} weight="bold" />, targetHref: "/test-execution" },
    { id: "tasks", title: "Track tasks", description: "Use tasks to keep follow-up work visible across the team.", icon: <Kanban size={20} weight="bold" />, targetHref: "/tasks" },
    { id: "shortcuts", title: "Pro Tips", description: "Use Ctrl+K for quick navigation and N to create new entries from module pages.", icon: <Lightning size={20} weight="bold" /> },
  ],
};

export function OnboardingTour({ role = "" }: { role?: string }) {
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const normalizedRole = (role || "qa").toLowerCase();
  const tourSteps = roleTourMap[normalizedRole] || defaultTourSteps;
  const completedKey = `${ONBOARDING_KEY_PREFIX}:${normalizedRole}`;
  const stepKey = `${ONBOARDING_STEP_KEY_PREFIX}:${normalizedRole}`;
  const dismissedKey = `${ONBOARDING_DISMISSED_KEY_PREFIX}:${normalizedRole}`;

  useEffect(() => {
    setMounted(true);
    try {
      const isDone = window.localStorage.getItem(completedKey) === "true";
      const isDismissed = window.localStorage.getItem(dismissedKey) === "true";
      if (isDone || isDismissed) {
        setVisible(false);
        return;
      }
      const savedStep = window.localStorage.getItem(stepKey);
      if (savedStep) setCurrentStep(Number(savedStep) || 0);
      // Show tour after a short delay to let the page settle
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(stepKey, String(currentStep));
    } catch {
      // ignore
    }
  }, [currentStep, mounted]);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      window.localStorage.setItem(dismissedKey, "true");
    } catch {
      // ignore
    }
  }, []);

  const complete = useCallback(() => {
    setCompleted(true);
    try {
      window.localStorage.setItem(completedKey, "true");
    } catch {
      // ignore
    }
    setTimeout(() => setVisible(false), 3000);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep >= tourSteps.length - 1) {
      complete();
    } else {
      const next = currentStep + 1;
      setCurrentStep(next);
      const step = tourSteps[next];
      if (step.targetHref && pathname !== step.targetHref) {
        router.push(step.targetHref);
      }
    }
  }, [currentStep, complete, pathname, router]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      const step = tourSteps[prev];
      if (step.targetHref && pathname !== step.targetHref) {
        router.push(step.targetHref);
      }
    }
  }, [currentStep, pathname, router]);

  if (!mounted || !visible) return null;

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const modal = (
    <div className="fixed bottom-5 right-5 z-[550] w-[380px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom-3 fade-in duration-200">
      <div className="border border-gray-200 bg-white shadow-xl">
        {/* Progress bar */}
        <div className="h-1 w-full bg-gray-100">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {completed ? (
          <div className="px-5 py-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center bg-emerald-50 text-emerald-600">
              <Confetti size={28} weight="bold" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">You&apos;re all set!</h3>
            <p className="mt-1.5 text-sm text-gray-500">
              You know the basics. Start by creating a test plan or reporting a bug. Happy testing!
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-4 pb-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-blue-50 text-blue-600">
                  {step.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
                    Step {currentStep + 1} of {tourSteps.length}
                  </p>
                  <h3 className="text-sm font-bold text-gray-900">{step.title}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="p-1 text-gray-400 hover:text-gray-600 transition"
                title="Skip tour"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-3">
              <p className="text-[13px] leading-relaxed text-gray-600">{step.description}</p>
              {step.action && (
                <div className="mt-2.5 flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-2">
                  <Lightning size={12} weight="bold" className="shrink-0 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">{step.action}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
              <button
                type="button"
                onClick={dismiss}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition"
              >
                Skip tour
              </button>
              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex h-8 items-center gap-1.5 border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                  >
                    <ArrowLeft size={12} weight="bold" />
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex h-8 items-center gap-1.5 bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                  {currentStep >= tourSteps.length - 1 ? "Finish" : "Next"}
                  {currentStep < tourSteps.length - 1 && <ArrowRight size={12} weight="bold" />}
                  {currentStep >= tourSteps.length - 1 && <CheckCircle size={12} weight="bold" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/**
 * Hook to check if onboarding is completed.
 * Useful for conditionally showing help hints.
 */
export function useOnboardingStatus(role = "") {
  const [isCompleted, setIsCompleted] = useState(true);

  useEffect(() => {
    try {
      const normalizedRole = (role || "qa").toLowerCase();
      const done = window.localStorage.getItem(`${ONBOARDING_KEY_PREFIX}:${normalizedRole}`) === "true";
      const dismissed = window.localStorage.getItem(`${ONBOARDING_DISMISSED_KEY_PREFIX}:${normalizedRole}`) === "true";
      setIsCompleted(done || dismissed);
    } catch {
      setIsCompleted(true);
    }
  }, [role]);

  return { isCompleted };
}

/**
 * Reset onboarding state (useful for settings page)
 */
export function resetOnboarding(role = "") {
  try {
    if (role) {
      const normalizedRole = role.toLowerCase();
      window.localStorage.removeItem(`${ONBOARDING_KEY_PREFIX}:${normalizedRole}`);
      window.localStorage.removeItem(`${ONBOARDING_STEP_KEY_PREFIX}:${normalizedRole}`);
      window.localStorage.removeItem(`${ONBOARDING_DISMISSED_KEY_PREFIX}:${normalizedRole}`);
      return;
    }

    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(`${ONBOARDING_KEY_PREFIX}:`) || key.startsWith(`${ONBOARDING_STEP_KEY_PREFIX}:`) || key.startsWith(`${ONBOARDING_DISMISSED_KEY_PREFIX}:`))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
