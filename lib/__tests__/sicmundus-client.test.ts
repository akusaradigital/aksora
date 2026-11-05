/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from "vitest";
import {
  getStoredSicmundusCreds,
  setStoredSicmundusCreds,
  clearStoredSicmundusCreds,
  hasStoredSicmundusCreds,
  getSicmundusAuthPayload,
  SICMUNDUS_CREDS_STORAGE_KEY,
} from "@/lib/sicmundus-client";

describe("sicmundus-client localStorage credential management", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no credentials are saved", () => {
    expect(getStoredSicmundusCreds()).toBeNull();
    expect(hasStoredSicmundusCreds()).toBe(false);
    expect(getSicmundusAuthPayload()).toEqual({});
  });

  it("stores and retrieves credentials without touching database", () => {
    setStoredSicmundusCreds({
      username: "alex.wright",
      password: "secretpassword123",
      validated: true,
      userName: "Alexander Wright",
      userEmail: "alex@company.com",
    });

    const stored = getStoredSicmundusCreds();
    expect(stored).not.toBeNull();
    expect(stored?.username).toBe("alex.wright");
    expect(stored?.password).toBe("secretpassword123");
    expect(stored?.validated).toBe(true);
    expect(stored?.userName).toBe("Alexander Wright");
    expect(hasStoredSicmundusCreds()).toBe(true);

    expect(getSicmundusAuthPayload()).toEqual({
      username: "alex.wright",
      password: "secretpassword123",
    });
  });

  it("clears credentials properly", () => {
    setStoredSicmundusCreds({
      username: "alex.wright",
      password: "secretpassword123",
    });
    expect(hasStoredSicmundusCreds()).toBe(true);

    clearStoredSicmundusCreds();
    expect(hasStoredSicmundusCreds()).toBe(false);
    expect(getStoredSicmundusCreds()).toBeNull();
    expect(localStorage.getItem(SICMUNDUS_CREDS_STORAGE_KEY)).toBeNull();
  });
});
