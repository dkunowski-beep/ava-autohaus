# AVA 1.6.1 – Auslieferungsplanung

- Kein manuelles `YYYY-MM-DD HH:MM` mehr.
- Eigener Dialog mit Datumsauswahl und Uhrzeit.
- Uhrzeit kann komfortabel gewählt werden (15-Minuten-Schritte).
- Bestätigter Auslieferungstermin wird weiterhin automatisch in den AVA-Kalender übernommen.
- `planned_delivery_at` wird am Kunden gespeichert.
- Danach springt der Verkaufsprozess auf `delivery_scheduled`.
- Die bestehende Logik „Fahrzeug ausgeliefert“ / automatischer Nachkontakt am Folgetag bleibt erhalten.

Für dieses Frontend-Update ist keine zusätzliche SQL-Migration nötig, sofern AVA 1.6.0 wie zuletzt eingerichtet ist.
