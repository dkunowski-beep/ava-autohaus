# AVA 1.4.2
Fix: Der Termin-löschen-Button war sichtbar, aber der Parent hatte den onDelete-Handler nicht an CalendarEventForm übergeben. Der Handler ist jetzt korrekt verbunden. Das Fenster schließt erst nach erfolgreicher Löschung. Zusätzlich gibt es eine defensive Fehlermeldung, falls die Verbindung künftig fehlen sollte.
Der bereits serverseitig deployte Push/VAPID-Subject-Fix bleibt aktiv.
