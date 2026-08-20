import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
  searchParams: vi.fn(),
  confirmModal: vi.fn(() => null),
  toast: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush, replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: mocks.searchParams }),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: mocks.toast,
}));

vi.mock("@/components/ui/confirm-modal", () => ({
  ConfirmModal: mocks.confirmModal,
}));

vi.mock("@/lib/utils", () => ({
  cn: (...classes: Array<string | undefined | false>) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/hooks/use-translation", () => ({
  useTranslation: () => ({
    dict: {
      common: {
        backToHome: "Back to Home",
        backToSignIn: "Back to sign in",
      },
      login: {
        workspaceAccess: "Workspace access",
        tagCreateAccount: "Create Account",
        tagPasswordRecovery: "Password Recovery",
        tagVerifyEmail: "Verify Email",
        tagWelcomeBack: "Welcome Back",
        tagTwoFactor: "Two-Factor Authentication",
        titleSignup: "Create Your Account",
        titleForgot: "Reset Password",
        titleVerifyOtp: "Verify Your Email",
        titleVerifyMfa: "Enter Authenticator Code",
        titleSignin: "Sign In to Aksora",
        subtitleSignup: "Start collaborating with your team on software quality.",
        subtitleForgot: "Enter your email and we'll send you reset instructions.",
        subtitleVerifyOtp: "We sent a 6-digit code to {email}.",
        subtitleVerifyMfa: "Please open your authenticator app.",
        subtitleSignin: "Sign in with Google or email to access your workspace.",
        orUseEmail: "or use email",
        fullName: "Full Name",
        emailAddress: "Email Address",
        password: "Password",
        forgotPassword: "Forgot password?",
        rememberMe: "Remember me",
        showPassword: "Show password",
        hidePassword: "Hide password",
        jobRole: "Job Role",
        selectYourRole: "Select your role",
        workspaceCompanyName: "Workspace / Company Name",
        processing: "Processing...",
        signUp: "Sign Up",
        sendResetLink: "Send Reset Link",
        signIn: "Sign In",
        noAccountPrefix: "Don't have an account?",
        signUpHere: "Sign up here",
        haveAccountPrefix: "Already have an account?",
        signInHere: "Sign in here",
        leftBadge: "Enterprise QA Workspace",
        leftHeadingLine1: "One Team.",
        leftHeadingLine2: "One Unified Flow.",
        leftParagraph: "Simplify how your team manages testing.",
        footerBuiltBy: "Built by Akusara Digital.",
        errorNameRequired: "Name is required.",
        errorEmailRequired: "Email address is required.",
        errorPasswordRequired: "Password is required.",
        errorRoleRequired: "Role is required.",
        errorCompanyRequired: "Company name is required.",
        resetLinkSent: "A reset link has been sent.",
        welcomeBack: "Welcome back!",
        authFailed: "Authentication failed",
        unexpectedError: "An unexpected error occurred.",
        registrationSuccessTitle: "Registration Successful",
        registrationSuccessMessage: "Your account has been created.",
        signInNow: "Sign In Now",
        close: "Close",
      },
      otp: {
        verificationCode: "Verification Code",
        verify: "Verify",
        verifying: "Verifying...",
        resendCode: "Resend code",
        sending: "Sending...",
        resendCooldown: "Resend ({seconds}s)",
        errorEnterCode: "Enter the 6-digit code.",
        errorInvalidCode: "Invalid code.",
        errorVerificationFailed: "Verification failed.",
        newCodeSent: "A new code has been sent.",
        errorCouldNotResend: "Could not resend the code.",
      },
    },
    locale: "en",
    setLocale: () => {},
  }),
}));

import LoginPage, { LoginContent } from "@/app/login/page";

describe("login page", () => {
  it("renders the sign-in form and honors next query param", () => {
    mocks.searchParams.mockReturnValue("/dashboard");

    const html = renderToStaticMarkup(<LoginContent />);

    expect(html).toContain("Sign In to Aksora");
    expect(html).toContain("Sign in with Google or email to access your workspace.");
    expect(html).toContain("Sign In");
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });
});
