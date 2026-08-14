import { describe, expect, it } from "vitest";
import { generateDeploymentNotes } from "@/lib/deployment-notes";

describe("generateDeploymentNotes", () => {
  it("summarizes mixed changelog lines into thematic notes", () => {
    const notes = generateDeploymentNotes(
      "1. remove purple line in my library (slide 7)\n" +
      "2. forbid unlogged-in user to access path under /vania (slide 8)\n" +
      "3. resize icon (slide 9)\n" +
      "4. auto lock project group selection when accessed from group button (slide 10)\n" +
      "5. auto collapse option in image and video generator (slide 11)\n" +
      "6. close modal when clicked from outside the detail modal (slide 12)\n" +
      "7. redirect to prompt section when delete prompt (slide 14)\n" +
      "8. edit & delete feature for project (Backlog Row 998)",
    );

    expect(notes).toBe(
      "1. Visual & UI Improvements: Remove the purple line in My Library and Adjust the icon size to keep the layout balanced.\n" +
      "2. Access Security: Add a restriction to the /vania path so unauthenticated users cannot access it.\n" +
      "3. Interaction Optimization: Apply auto-lock to project group selection, Apply auto-collapse in the image and video generator, and Close the modal automatically when clicking outside the area.\n" +
      "4. Navigation Flow & New Features: Redirect to the Prompt section after deletion and Add Edit & Delete project functionality.",
    );
  });
});

