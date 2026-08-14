# Aturan Kerja untuk Worker Agent (Codex / OpenCode)

Dibaca oleh setiap AI agent (codex, opencode, atau agent lain) yang menerima task
dari koordinator di proyek Aksora ini. Tujuannya: kerja cepat, efisien, dan **tidak
menambah bug baru** ke aplikasi yang sudah berjalan.

## Aturan Wajib

1. **Scope ketat.** Kerjakan HANYA file dan bug yang diminta di prompt task.
   Jangan restyle UI, jangan refactor "sambil lewat", jangan ubah file lain
   walau kelihatan "bisa dirapikan". Kalau nemu masalah lain di luar scope,
   LAPORKAN saja di ringkasan akhir — jangan langsung diperbaiki tanpa diminta.

2. **Jangan rusak encoding file.** Dilarang memproses file teks lewat pipeline
   yang bisa mengubah karakter non-ASCII (©, ·, —, é, dll) atau menambahkan
   BOM (byte-order-mark). Kalau edit lewat shell/PowerShell:
   - Gunakan tool edit internal (apply_patch / edit tool) sebagai pilihan utama.
   - Kalau terpaksa pakai `Set-Content`/`Out-File`, WAJIB pakai
     `-Encoding utf8NoBOM` (bukan `utf8` biasa, bukan default).
   - Setelah edit file yang mengandung karakter non-ASCII, verifikasi ulang
     isinya tidak berubah jadi mojibake (contoh rusak: `©` → `Â©`).

3. **JANGAN PERNAH jalankan `git commit`, `git push`, atau `git add` diikuti
   commit apa pun, dalam kondisi APA PUN, meski kamu pikir itu "beres" atau
   "aman untuk di-commit".** Semua perubahan dibiarkan uncommitted di working
   tree. HANYA koordinator yang commit/push, dan itu pun cuma kalau user
   (bukan koordinator sendiri) memintanya secara eksplisit. Insiden nyata:
   sebuah worker pernah menjalankan git commit sendiri dan membundel SELURUH
   perubahan sesi (ratusan file, banyak fitur tidak terkait) ke dalam satu
   commit dengan pesan yang menyesatkan (cuma menyebut sebagian kecil dari
   yang sebenarnya berubah) -- itu HARUS diperbaiki manual setelahnya. Kalau
   kamu merasa perlu commit demi alasan apa pun (checkpoint, snapshot, dll),
   JANGAN lakukan itu -- laporkan saja ke koordinator dan biarkan working
   tree apa adanya.

4. **Verifikasi sebelum lapor selesai.** Minimal jalankan yang relevan dengan
   scope kamu:
   - `npx tsc --noEmit` — pastikan tidak ada error baru di file yang kamu sentuh.
   - `npx vitest run <file test terkait>` — pastikan test terkait lulus.
   - Jangan asal lapor "selesai" tanpa menjalankan ini.

5. **Efisien, jangan boros token/waktu.** Jangan jalankan full test
   suite/full build berulang-ulang kalau tidak diminta — cukup scope yang
   relevan, kecuali koordinator eksplisit minta full check/QA. Kalau
   koordinator bilang "skip QA, fokus fix", jangan tetap jalankan full
   verification besar-besaran.

6. **Kalau ragu, tanya atau laporkan — jangan menebak.** Kalau ada ambiguitas
   soal fix yang benar (misal ada 2 kemungkinan root cause), pilih yang paling
   minimal-risk dan sebutkan asumsinya di laporan akhir, jangan diam-diam
   membuat keputusan arsitektural besar sendiri.

7. **Hindari kerja duplikat.** Kalau tahu ada worker lain yang mungkin sedang
   menyentuh file yang sama, prioritaskan file yang eksplisit ada di scope
   kamu saja.

8. **Jangan pernah mengarang batasan/fitur yang tidak ada.** Dilarang keras
   menambahkan atau mengklaim (di logic MAUPUN di copy/teks UI) adanya
   allowlist, blocklist, approval gate, restriksi akses, atau fitur apa pun
   yang tidak diminta eksplisit dan tidak benar-benar ada di behavior
   aplikasi. Ini berlaku dua arah:
   - Di kode: jangan tambah hardcoded email/user allowlist, permission check
     baru, atau logic pembatasan apa pun tanpa instruksi eksplisit dan detail
     lengkap dari koordinator.
   - Di copy/teks: jangan tulis klaim ("hanya akun yang di-approve",
     "khusus member terdaftar", dll) yang tidak match dengan behavior nyata
     kode. Sebelum menulis klaim soal behavior aplikasi, verifikasi dulu ke
     kode sumbernya (baca API route/logic terkait) — jangan asumsi atau
     mengarang supaya terdengar meyakinkan.
   Insiden sebelumnya: allowlist email hardcoded ditambahkan ke Google
   Sign-In tanpa diminta (harus di-revert), dan klaim "allowlisted accounts"
   /"approved workspace members" dikarang di halaman login padahal registrasi
   aplikasi ini sebenarnya terbuka (tanpa invite = bikin workspace sendiri,
   dengan invite = join workspace pengundang). Kedua insiden ini TIDAK BOLEH
   terulang dalam bentuk apa pun.

9. **Jangan pernah mengubah test supaya cocok dengan klaim/teks yang kamu
   karang sendiri.** Kalau test yang sudah ada gagal setelah kamu ubah UI/
   copy, urutan yang benar adalah: (a) pastikan teks/copy baru itu akurat
   dan jujur dulu (cek behavior nyata di kode), BARU (b) update assertion
   test supaya mencocokkan teks akurat tersebut. Jangan pernah membalik
   urutan ini (menulis klaim dulu, lalu memaksa test menyetujuinya).
   Dilarang keras menyembunyikan teks dari user (`hidden`, `sr-only` yang
   disalahgunakan, `display: none`, dsb) semata-mata supaya sebuah test
   tetap lulus — itu memanipulasi test, bukan memperbaikinya. Test harus
   memverifikasi apa yang benar-benar dilihat/dialami user.

10. **Semua teks/copy yang tampil di UI aplikasi WAJIB pakai English.** Ini
    berlaku untuk semua halaman/komponen yang dilihat end-user: label,
    heading, deskripsi, pesan error, placeholder, tombol, dokumentasi
    in-app (misal /docs/api), dsb — TIDAK ADA teks Bahasa Indonesia di UI,
    kecuali user secara eksplisit minta sebaliknya untuk konteks tertentu.
    Ini tidak berlaku untuk laporan/komunikasi kamu ke koordinator (boleh
    tetap Bahasa Indonesia seperti biasa) — aturan ini murni soal konten
    yang dirender ke pengguna aplikasi.

## Format Laporan Akhir

Selalu tutup task dengan ringkasan singkat:
- File apa saja yang diubah
- Apa yang diperbaiki (1 baris per fix)
- Hasil validasi (tsc/test/lint) — pass/fail
- Ada tidaknya temuan di luar scope yang sengaja TIDAK diperbaiki (dan kenapa)
