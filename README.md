# AVA 1.6.0 – Automatisierte Verkaufsakte

Großer Umbau:
- Verkaufsakte ist jetzt eine große, mittig angezeigte Arbeitsfläche statt eines schmalen Drawers.
- Desktop: große 2-Spalten-Verkaufsakte; mobil: Vollbild.
- Der Verkaufsprozess und die nächste AVA-Aufgabe stehen im Mittelpunkt.
- AVA-Aufgaben werden automatisch aus Ereignissen und Prozessschritten erzeugt.
- Verkäufer bestätigt nur noch Ereignisse: Angebot versendet, Kunde erreicht/nicht erreicht, Auto da, Unterlagen da, unterschrieben, zugelassen, ausgeliefert.
- Nicht erreicht -> derselbe Kontakt wird automatisch auf morgen verschoben.
- Lieferstatus erreicht -> nächster Lieferstatus automatisch +21 Tage, solange das Fahrzeug noch nicht da ist.
- Kaufabschluss schließt alte Verkaufsaufgaben und startet automatisch den 21-Tage-Lieferstatus.
- Prozessschritte schließen die vorherige AVA-Aufgabe und erzeugen die nächste.
- Angebotsversand bleibt idempotent: genau ein Follow-up in 2 Tagen.
- Kundenübersicht, nächster Termin, Dokumente und Historie sind kompakt in der neuen Akte organisiert.

WICHTIG:
Vor Deployment einmal `supabase/ava_1_6_0_automation.sql` im Supabase SQL Editor ausführen.
Danach AVA 1.6.0 deployen.
