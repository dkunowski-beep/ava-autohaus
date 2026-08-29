# AVA 1.5.1 – Automatischer Angebots-Workflow

Neu:
- Manueller Button „Angebot nachfassen“ entfernt.
- Neuer Button: „📤 Angebot versendet“.
- Beim Klick speichert AVA den Versandzeitpunkt und setzt den Kunden in die Angebotsphase.
- Automatisch wird genau EIN Nachkontakt in 2 Tagen angelegt.
- Doppel-Klicks erzeugen keine doppelten Aufgaben.
- Bereits vorhandene doppelte Angebots-Follow-ups werden durch die Migration bereinigt.
- Sales Radar / Sales Focus erkennen jetzt:
  - Angebot versendet
  - Nachkontakt geplant
  - Angebots-Nachkontakt fällig
- Ist der Kunde bereits Käufer, kann kein Angebotsprozess mehr gestartet werden.

WICHTIG:
Vor Deployment einmal `supabase/ava_1_5_1_offer_workflow.sql` im Supabase SQL Editor ausführen.
