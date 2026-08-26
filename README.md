# AVA 1.3.2 — Team Assistant Runtime Fix

Fixes the client-side exception after refreshing AVA 1.3.1.

Fixed:
- TodayView now correctly receives team members and the current user ID.
- The Team navigation now uses the new Team Assistant component signature.
- Defensive defaults keep AVA stable before the Team Supabase migration is applied.

Next step after successful deployment:
Apply `supabase/ava_1_3_team_assistant.sql` in Supabase.
