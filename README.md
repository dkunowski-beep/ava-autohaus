# AVA 1.3.1 — Team Assistant Build Fix

Fixes the Vercel compile error:
`the name TeamView is defined multiple times`

The previous AVA code already contained a TeamView component. AVA 1.3 added the new Team Assistant view under the same function name, causing the Next.js build to fail.

1.3.1 removes the obsolete duplicate and keeps the new Team Assistant implementation.

The Supabase Team Assistant migration is still included under:
`supabase/ava_1_3_team_assistant.sql`

Apply that migration only after this version deploys successfully.
