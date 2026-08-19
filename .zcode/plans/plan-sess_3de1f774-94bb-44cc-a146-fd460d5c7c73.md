Saya akan langsung kerjakan tiga hal yang kamu minta: ownership transfer, pending invites panel, dan workspace templates + branding ringan.

Rencana implementasi:

1. Ownership transfer
- Pakai schema yang sudah ada: `Workspace.createdByUserId` dan `WorkspaceMembership.role`.
- Tambah action/route untuk transfer owner dari satu user ke user lain di workspace yang sama.
- Saat transfer:
  - update `createdByUserId` ke owner baru,
  - pastikan membership owner baru jadi `admin`,
  - owner lama tetap di workspace tapi bisa didemote ke role non-admin yang aman.
- Tidak perlu migration schema baru untuk fitur ini.

2. Pending invites panel
- Reuse data dari `Invite` table dan endpoint invite existing.
- Perluas `settings/workspaces` supaya selain switcher, ada panel invite aktif/pending per workspace.
- Tampilkan minimal:
  - role,
  - workspace target,
  - expiry,
  - copy link,
  - revoke.
- Ini lebih ke perapihan admin flow daripada sistem baru.

3. Workspace templates + branding ringan
- Tambah field branding ringan ke workspace, minimal:
  - display name (sudah ada),
  - accent color,
  - icon/logo path atau placeholder key,
  - template type.
- Template awal bisa hardcoded dulu sebagai preset create workspace, misalnya:
  - QA Team,
  - Product Team,
  - Engineering Team,
  - Agency Team.
- Branding ringan dipakai dulu di workspaces page dan switcher, tanpa refactor seluruh app theme.
- Ini kemungkinan butuh migration schema kecil di `Workspace` table untuk `accentColor`, `templateKey`, dan mungkin `iconPath`.

4. Integrasi UI
- Fokus utama di `/settings/workspaces` sebagai pusat admin workspace.
- Di situ saya gabungkan:
  - workspace switcher,
  - create/invite flow,
  - pending invites,
  - branding/template metadata,
  - ownership transfer.
- Jadi kita tidak menyebar fitur ke banyak halaman baru kalau belum perlu.

5. Verifikasi
- Transfer owner hanya boleh dilakukan oleh admin workspace aktif.
- Invite panel harus tetap kompatibel dengan invite lama.
- Template/branding harus non-blocking: workspace lama tanpa field baru tetap aman.
- Tidak ada drop field lama.

Lazier alternative: ownership transfer + pending invites dulu, lalu branding/template belakangan. Tapi kalau kamu minta gas tiga-tiganya, saya kerjakan bertahap dalam satu batch ini dengan perubahan schema kecil dan non-destructive.