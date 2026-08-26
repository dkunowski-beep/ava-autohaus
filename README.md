# AVA 1.3.7 — iPhone Voice Apply Fix

- The mobile confirmation button now has a real async execution wrapper.
- Shows “AVA übernimmt den Befehl…” and “Wird übernommen…” while saving.
- Catches and displays execution errors instead of appearing to do nothing.
- Normalizes iPhone dictation punctuation/quotes.
- More tolerant intent detection for “Interessent/Kunde anlegen”.
- Clears the recognized command after a successful prospect creation while retaining the success message.
- Keeps all 1.3.6 voice confirmation UI and 1.3.5 VAPID changes.
