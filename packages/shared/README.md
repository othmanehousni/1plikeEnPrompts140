# Database Migration with Drizzle and Supabase

## Setup

1. Create a `.env` file in the `packages/shared` directory with your Supabase connection string:

```
DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

## Commands

- Generate migration files:
  ```
  npm run db:generate
  ```

- Push schema changes to Supabase:
  ```
  npm run db:push
  ```

- Apply SQL migration manually (if needed):
  ```
  psql -U postgres -h [YOUR-PROJECT-REF].supabase.co -d postgres -f drizzle/0001_rename_lastActive_to_lastSynced.sql
  ```

## Recent Changes

- Renamed `lastActive` to `lastSynced` in the courses table
- The `lastSynced` timestamp is now updated automatically after each sync operation
- Added API endpoint at `/api/sync` to update the `lastSynced` timestamp

## Notes

- The schema is defined in `src/db/schema.ts`
- Migration files are stored in the `drizzle` directory
- Make sure your Supabase database has the correct permissions set up 