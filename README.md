# AVA 1.3.3 — Real Push

Real Web Push for the Team Assistant:
- Registers an iPhone/desktop PWA PushSubscription
- Stores the subscription privately in Supabase
- Team messages call the secure `ava-push` Supabase Edge Function
- Assigned tasks push “Neue Aufgabe von …”
- Normal messages push “Neue Nachricht von …”
- Completing an assigned task pushes back to the sender
- Service worker displays push notifications even when AVA is not open
- Tapping the push opens/focuses AVA

Infrastructure already prepared:
- `ava_push_subscriptions` table
- `ava-push` Edge Function

Required after deploy:
Configure Supabase Edge Function secrets:
`AVA_VAPID_PUBLIC_KEY`
`AVA_VAPID_PRIVATE_KEY`

Then each iPhone must press “Echte Push-Mitteilungen auf diesem Gerät aktivieren” once in AVA.
