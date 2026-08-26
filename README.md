# AVA 1.3.6 — Urgent Voice Confirmation Fix

Restores a clear action after speech recognition.

Voice flow:
1. Speak command.
2. AVA shows “Erkannt” with the recognized sentence.
3. User chooses “✓ In AVA übernehmen” or “Verwerfen”.
4. Nothing is saved automatically before confirmation.

The confirmation bar is sticky on mobile so it remains visible on iPhone even with longer voice content.
All existing voice commands continue to use the existing `runVoiceCommand` logic.
