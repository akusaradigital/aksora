/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { DurationInput } from "@/components/shared/duration-input";
import { decomposeDuration, composeDuration, formatDuration } from "@/lib/utils";

// Mock @phosphor-icons/react
vi.mock("@phosphor-icons/react", () => ({
  Clock: (props: Record<string, unknown>) => <svg data-testid="icon-clock" {...props} />,
}));

describe("Duration Utils", () => {
  it("decomposes minutes into hours and minutes correctly", () => {
    expect(decomposeDuration(240)).toEqual({ hours: 4, minutes: 0, totalMinutes: 240 });
    expect(decomposeDuration(90)).toEqual({ hours: 1, minutes: 30, totalMinutes: 90 });
    expect(decomposeDuration(45)).toEqual({ hours: 0, minutes: 45, totalMinutes: 45 });
    expect(decomposeDuration(0)).toEqual({ hours: 0, minutes: 0, totalMinutes: 0 });
    expect(decomposeDuration(null)).toEqual({ hours: 0, minutes: 0, totalMinutes: 0 });
    expect(decomposeDuration("120")).toEqual({ hours: 2, minutes: 0, totalMinutes: 120 });
  });

  it("composes hours and minutes into total minutes", () => {
    expect(composeDuration(4, 0)).toBe(240);
    expect(composeDuration(1, 30)).toBe(90);
    expect(composeDuration("2", "15")).toBe(135);
    expect(composeDuration(0, 45)).toBe(45);
  });

  it("formats duration for display", () => {
    expect(formatDuration(240)).toBe("4j (240m)");
    expect(formatDuration(90)).toBe("1j 30m (90m)");
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(0)).toBe("-");
    expect(formatDuration(null)).toBe("-");
  });
});

describe("DurationInput Component", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Jam and Menit inputs initialized from minutes", () => {
    render(<DurationInput name="durationMinutes" value={240} />);

    expect(screen.getByDisplayValue("4")).toBeDefined();
    expect(screen.getByDisplayValue("0")).toBeDefined();
    expect(screen.getByText("240 menit")).toBeDefined();

    const hidden = document.querySelector('input[type="hidden"][name="durationMinutes"]') as HTMLInputElement;
    expect(hidden).toBeDefined();
    expect(hidden.value).toBe("240");
  });

  it("updates total minutes when user changes hours", () => {
    const handleChange = vi.fn();
    render(<DurationInput name="durationMinutes" value={0} onChange={handleChange} />);

    const hoursInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(hoursInput, { target: { value: "2" } });

    expect(handleChange).toHaveBeenCalledWith(120);
    expect(screen.getByText("120 menit")).toBeDefined();
  });

  it("updates total minutes when user changes minutes", () => {
    const handleChange = vi.fn();
    render(<DurationInput name="durationMinutes" value={60} onChange={handleChange} />);

    const minutesInput = screen.getAllByRole("spinbutton")[1];
    fireEvent.change(minutesInput, { target: { value: "30" } });

    expect(handleChange).toHaveBeenCalledWith(90);
    expect(screen.getByText("90 menit")).toBeDefined();
  });

  it("updates hours, minutes, and total when clicking a quick preset", () => {
    const handleChange = vi.fn();
    render(<DurationInput name="durationMinutes" value={0} onChange={handleChange} />);

    const presetBtn = screen.getByRole("button", { name: "4h (240m)" });
    fireEvent.click(presetBtn);

    expect(handleChange).toHaveBeenCalledWith(240);
    expect(screen.getByDisplayValue("4")).toBeDefined();
    expect(screen.getByDisplayValue("0")).toBeDefined();
    expect(screen.getByText("240 menit")).toBeDefined();
  });
});
