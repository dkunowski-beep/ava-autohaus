# AVA 1.4.3 — Team Chats

New Team Chat experience:
- One conversation per colleague instead of a long list of separate message cards.
- Direct reply box inside each conversation.
- “Antworten” action focuses the existing conversation reply box.
- Each user can delete a message only from their own view.
- Deleting a message does NOT remove it from the other colleague's account.
- Unread counters per conversation.
- Assigned tasks stay separated below the chat.

Supabase:
- Added `deleted_by_sender_at` and `deleted_by_recipient_at`.
- Added secure RPC `ava_hide_team_message`.

All AVA 1.4.2 calendar delete fixes and current push infrastructure remain included.
