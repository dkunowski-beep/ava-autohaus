# AVA 1.3.5 — Real Push VAPID Fix

- Frontend public VAPID key synchronized with the newly generated web-push key pair.
- Private VAPID key remains only in Supabase Secrets.
- Existing real push workflow remains unchanged.

After deployment, Anton's iPhone must create a NEW push subscription because the application server key changed.
