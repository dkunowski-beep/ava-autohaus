# AVA 1.4.18 – Kontaktquelle Speichern Fix

Fix:
- Kontaktquelle wurde im Bearbeiten-Formular korrekt geändert, aber beim Speichern nicht an Supabase gesendet.
- `contact_source` ist jetzt Bestandteil des zentralen Kunden-Speicher-Payloads.
- Funktioniert für neue Kunden und Änderungen bestehender Kunden.
- Kein neues SQL nötig, sofern die 1.4.10-Migration bereits ausgeführt wurde.
