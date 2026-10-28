import { describe, expect, it } from "vitest";
import { formatFileSize } from "@/lib/image-compress";

describe("image-compress - utility functions", () => {
  it("formats file sizes correctly for human display", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(45 * 1024)).toBe("45.0 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
    expect(formatFileSize(3.5 * 1024 * 1024)).toBe("3.50 MB");
    expect(formatFileSize(100 * 1024)).toBe("100.0 KB");
  });
});
