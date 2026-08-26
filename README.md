# AVA 1.3 — Team Assistant

New:
- Team area with internal messages
- Send a normal message to a colleague
- Convert a message directly into an assigned To-do
- Recipient sees assigned tasks under “Meine To-dos”
- Sender and recipient are visible
- Recipient gets an AVA notification: “Neue Nachricht/Aufgabe von …”
- Sender gets an AVA notification when an assigned task is completed
- Read/unread team messages
- Dedicated “Mir zugewiesen” overview
- Dark futuristic AVA design retained

Database:
`supabase/ava_1_3_team_assistant.sql` contains the required migration.
The connected Supabase project denied migration permission during this build, so this SQL still needs to be applied to the project before Team messaging can work.

All AVA 1.2 Smart Assistant + Calendar Pro functionality remains included.
