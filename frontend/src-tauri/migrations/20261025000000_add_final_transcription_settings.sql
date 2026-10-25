-- Final transcription (post-meeting pass) settings.
-- finalProvider: 'groq' to re-transcribe the saved recording in the cloud after the
-- meeting (the result replaces the live transcript and feeds the summary); NULL = off.
-- vocabulary: names and terms passed as the Whisper prompt to bias spelling.
ALTER TABLE transcript_settings ADD COLUMN finalProvider TEXT;
ALTER TABLE transcript_settings ADD COLUMN vocabulary TEXT;
