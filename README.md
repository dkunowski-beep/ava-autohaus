# AVA 1.4.5 – Kundenübergabe

Neu:
- Kunden und Interessenten können aus ihrer Akte an einen aktiven Kollegen übergeben werden.
- Button: „↗ An Kollegen übergeben“.
- Sicherheitsabfrage vor der Übergabe.
- Die Zuständigkeit wechselt wirklich: keine Kopie und keine gemeinsame Freigabe.
- Der Datensatz verschwindet aus der Kundenliste des bisherigen Verkäufers und erscheint beim neuen Verkäufer.
- Zugehörige Termine, Dokumente und offene Aufgaben werden mit übertragen.
- Die Übergabe wird dauerhaft in der Kundenhistorie dokumentiert.
- Der Empfänger erhält Team-Nachricht + AVA-Benachrichtigung; die vorhandene Push-Pipeline bleibt unverändert.

Vor Deployment einmal `supabase/ava_1_4_5_customer_handover.sql` im Supabase SQL Editor ausführen.

Enthält weiterhin die Fixes aus AVA 1.4.4 (Natural Voice Calendar), Team-Chats, Kalender-Löschen und Push.
