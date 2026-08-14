# Backup Notes

## Production

Production database backups rely on Neon Postgres point-in-time recovery (PITR).

- Check the retention window in the Neon dashboard at `console.neon.tech`.
- Open your project, then go to **Project settings > Backup/Restore** to verify PITR retention and restore options.

## Local Development

`scripts/backup.mjs` is only for local development.

- It expects a running Docker container named `aksora-db`.
- It is not a production backup path and does not apply to Neon.

## Restore

If you need to restore production data, use Neon’s PITR or branching restore flow from the dashboard.

- Start from the backup/restore controls in the Neon project dashboard.
- Choose a point in time or branch restore target.
- Verify the exact steps in the Neon dashboard before running a restore, since the UI flow can change.
