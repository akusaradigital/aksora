import { describe, expect, it } from "vitest";
import { getRequiredFieldErrors } from "@/lib/form-validation";

describe("form-validation", () => {
  it("returns missing required field errors only for editable fields", () => {
    const fields = [
      { name: "title", label: "Title", required: true },
      { name: "notes", label: "Notes", required: true, readonly: true },
      { name: "status", label: "Status", required: true },
      { name: "hidden", label: "Hidden", required: true },
      { name: "optional", label: "Optional" },
    ];

    const formData = new FormData();
    formData.set("title", "  ");
    formData.set("status", "Open");

    expect(getRequiredFieldErrors(fields, formData, ["hidden"])).toEqual({
      title: "Title is required.",
    });
  });
});
