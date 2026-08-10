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
      "1. Penyempurnaan Visual & UI: Menghapus garis ungu di My Library dan Menyesuaikan ukuran ikon agar lebih proporsional.\n" +
      "2. Keamanan Akses: Menambahkan restriksi pada jalur /vania sehingga pengguna yang belum login tidak dapat mengaksesnya.\n" +
      "3. Optimasi Interaksi: Menerapkan auto-lock pada pilihan grup proyek, Menerapkan auto-collapse pada generator gambar/video, dan Menutup modal otomatis saat klik di luar area.\n" +
      "4. Alur Navigasi & Fitur Baru: Mengarahkan ke bagian Prompt setelah penghapusan dan Menambahkan fitur Edit & Delete proyek.",
    );
  });
});

