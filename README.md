# AVA 1.4.1 — Push Subject + Calendar Delete Fix

Server-side push fix:
- AVA Push now uses the real AVA HTTPS URL as the VAPID subject instead of an invalid `.local` mail address.
- This addresses Apple's `403 BadJwtToken` rejection.

Calendar delete fix:
- Uses the new secure `ava_delete_calendar_event` RPC.
- Deletes only events owned by the signed-in user.
- Clear success/error feedback.
- Edit dialog closes only after a confirmed successful delete.

All AVA 1.4.0 voice/calendar and 1.3.9 push re-subscription functionality remains included.
