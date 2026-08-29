# AVA 1.5.0 – Dynamischer Verkaufsprozess

AVA führt Käufer jetzt Schritt für Schritt durch den Autohaus-Prozess:

Bestellt → Fahrzeug da → Unterlagen da → Unterschrieben → Zugelassen → Abholung → Ausgeliefert → Nachkontakt

Funktionen:
- Nach Kauf: Lieferstatus-Aufgabe nach 21 Tagen.
- „Auto ist geliefert“ beendet offene Lieferstatus-Aufgaben und erstellt „Zulassungsunterlagen anfordern“.
- „Zulassungsunterlagen sind da“ erstellt die Aufgabe für die Unterschrift.
- „Zulassungsanträge unterschrieben“ schaltet auf Zulassung läuft.
- „Fahrzeug ist zugelassen“ erstellt „Abholtermin vereinbaren“.
- Abholtermin wird über die bestehende Kalender-Synchronisierung direkt im Kalender gespeichert.
- „Fahrzeug ausgeliefert“ nutzt den bestehenden Delivery-RPC und markiert den Prozess als ausgeliefert.
- Kundenhistorie protokolliert die Prozessschritte.
- Alte passive Delivery-Checkliste wurde durch den aktiven Verkaufsprozess ersetzt.

WICHTIG: Vor Deployment einmal `supabase/ava_1_5_0_sales_process.sql` im Supabase SQL Editor ausführen.
