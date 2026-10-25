/// Supported audio file extensions for import and retranscription.
///
/// Includes native Symphonia formats (MP4, M4A, WAV, MP3, FLAC, OGG, AAC)
/// and FFmpeg-backed formats (MKV, WebM, WMA, plus the phone formats Opus, AMR,
/// 3GP and CAF).
pub const AUDIO_EXTENSIONS: &[&str] = &[
    "mp4", "m4a", "wav", "mp3", "flac", "ogg", "aac", "mkv", "webm", "wma",
    "opus", "amr", "3gp", "caf",
];
