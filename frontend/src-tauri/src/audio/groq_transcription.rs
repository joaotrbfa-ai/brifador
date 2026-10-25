// Groq cloud transcription - the "final transcription" pass for a saved recording.
//
// The live transcript (local Parakeet on ~3 s VAD clips) is only good enough to follow a
// meeting. After the meeting, the whole recording is sent to Groq's Whisper large-v3 in
// long chunks (up to 10 minutes, cut at pauses found by the VAD), which gives Whisper
// enough context for proper sentences, names and punctuation. The result replaces the
// live transcript and is what the summary is generated from.

use crate::state::AppState;
use anyhow::{anyhow, Result};
use log::{info, warn};
use serde::Deserialize;
use std::time::Duration;
use tauri::{AppHandle, Manager, Runtime};

pub const GROQ_PROVIDER: &str = "groq";
pub const GROQ_DEFAULT_MODEL: &str = "whisper-large-v3";

const GROQ_TRANSCRIPTIONS_URL: &str = "https://api.groq.com/openai/v1/audio/transcriptions";
const SAMPLE_RATE: u32 = 16_000;

/// 10 minutes of 16 kHz mono PCM16 is ~19.2 MB, under the 25 MB free-tier upload limit.
const MAX_CHUNK_MS: f64 = 600_000.0;
/// Look for a pause to cut at in the last 2 minutes before the chunk limit.
const CUT_SEARCH_WINDOW_MS: f64 = 120_000.0;
/// Never produce chunks shorter than this when cutting early at a pause.
const MIN_CHUNK_MS: f64 = 1_000.0;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(300);
const MAX_ATTEMPTS: u32 = 4;
/// A 429 asking us to wait longer than this means the hourly/daily quota is spent.
const MAX_RETRY_AFTER_SECS: f64 = 120.0;
/// Whisper's prompt is capped at 224 tokens; ~800 characters stays safely under it.
const MAX_PROMPT_CHARS: usize = 800;

/// Settings needed to call Groq.
#[derive(Debug, Clone)]
pub struct GroqOptions {
    pub api_key: String,
    pub model: String,
    /// ISO-639-1 code such as "pt"; None lets Whisper detect the language.
    pub language: Option<String>,
    /// Names and terms used as the Whisper prompt.
    pub vocabulary: Option<String>,
}

/// Final-transcription settings as stored in `transcript_settings`.
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct FinalTranscriptionSettings {
    /// "groq" when the post-meeting pass is on, None when off.
    #[serde(rename = "finalProvider")]
    pub final_provider: Option<String>,
    pub vocabulary: Option<String>,
    #[serde(rename = "hasApiKey")]
    pub has_api_key: bool,
}

pub async fn load_final_settings(pool: &sqlx::SqlitePool) -> Result<(FinalTranscriptionSettings, Option<String>)> {
    let row: Option<(Option<String>, Option<String>, Option<String>)> = sqlx::query_as(
        "SELECT finalProvider, vocabulary, groqApiKey FROM transcript_settings WHERE id = '1' LIMIT 1",
    )
    .fetch_optional(pool)
    .await?;

    let (final_provider, vocabulary, api_key) = row.unwrap_or((None, None, None));
    let api_key = api_key.filter(|k| !k.trim().is_empty());
    Ok((
        FinalTranscriptionSettings {
            final_provider: final_provider.filter(|p| !p.is_empty()),
            vocabulary,
            has_api_key: api_key.is_some(),
        },
        api_key,
    ))
}

pub async fn save_final_settings(
    pool: &sqlx::SqlitePool,
    final_provider: Option<&str>,
    vocabulary: Option<&str>,
    api_key: Option<&str>,
) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO transcript_settings (id, provider, model, finalProvider, vocabulary)
        VALUES ('1', 'parakeet', $1, $2, $3)
        ON CONFLICT(id) DO UPDATE SET
            finalProvider = excluded.finalProvider,
            vocabulary = excluded.vocabulary
        "#,
    )
    .bind(crate::config::DEFAULT_PARAKEET_MODEL)
    .bind(final_provider)
    .bind(vocabulary)
    .execute(pool)
    .await?;

    if let Some(key) = api_key.map(str::trim).filter(|k| !k.is_empty()) {
        sqlx::query("UPDATE transcript_settings SET groqApiKey = $1 WHERE id = '1'")
            .bind(key)
            .execute(pool)
            .await?;
    }
    Ok(())
}

/// Build Groq options from the saved settings (key and vocabulary).
pub async fn load_groq_options<R: Runtime>(
    app: &AppHandle<R>,
    language: Option<String>,
    model: Option<String>,
) -> Result<GroqOptions> {
    let app_state = app
        .try_state::<AppState>()
        .ok_or_else(|| anyhow!("App state not available"))?;
    let (settings, api_key) = load_final_settings(app_state.db_manager.pool()).await?;
    let api_key = api_key.ok_or_else(|| {
        anyhow!("Configure a chave da Groq em Configurações → Transcrição para usar a transcrição na nuvem.")
    })?;

    Ok(GroqOptions {
        api_key,
        model: model
            .filter(|m| m.starts_with("whisper-"))
            .unwrap_or_else(|| GROQ_DEFAULT_MODEL.to_string()),
        language: normalize_language(language),
        vocabulary: settings.vocabulary,
    })
}

/// "auto"/"auto-translate"/empty mean "let Whisper detect"; anything else is forced.
fn normalize_language(language: Option<String>) -> Option<String> {
    language
        .map(|l| l.trim().to_lowercase())
        .filter(|l| !l.is_empty() && l != "auto" && l != "auto-translate")
}

/// Transcribe a 16 kHz mono recording with Groq.
///
/// `speech_ms` are the VAD speech ranges of the whole recording; they decide where chunks
/// are cut and let us drop text Whisper invents over silence. Returns
/// `(text, start_ms, end_ms)` tuples in recording time, ready for
/// `create_transcript_segments`.
pub async fn transcribe_with_groq<P, C>(
    samples_16k: &[f32],
    speech_ms: &[(f64, f64)],
    options: &GroqOptions,
    mut on_progress: P,
    is_cancelled: C,
) -> Result<Vec<(String, f64, f64)>>
where
    P: FnMut(usize, usize),
    C: Fn() -> bool,
{
    let total_ms = samples_16k.len() as f64 * 1000.0 / SAMPLE_RATE as f64;
    let chunks: Vec<(f64, f64)> = plan_chunks(total_ms, speech_ms, MAX_CHUNK_MS)
        .into_iter()
        .filter(|chunk| overlap_ms(*chunk, speech_ms) > 0.0)
        .collect();
    info!(
        "Groq: {:.1}s of audio in {} chunk(s), model={}, language={:?}",
        total_ms / 1000.0,
        chunks.len(),
        options.model,
        options.language
    );

    let client = reqwest::Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;
    let prompt = options.vocabulary.as_deref().and_then(build_prompt);

    let mut results = Vec::new();
    for (index, &(start_ms, end_ms)) in chunks.iter().enumerate() {
        if is_cancelled() {
            return Err(anyhow!("Retranscription cancelled"));
        }
        on_progress(index, chunks.len());

        let start = ms_to_sample(start_ms).min(samples_16k.len());
        let end = ms_to_sample(end_ms).min(samples_16k.len());
        let wav = encode_wav_pcm16(&samples_16k[start..end], SAMPLE_RATE);

        let response =
            send_with_retry(&client, options, prompt.as_deref(), wav, &is_cancelled).await?;
        let kept = map_segments(&response, start_ms, end_ms, speech_ms);
        info!(
            "Groq chunk {}/{} ({:.0}s-{:.0}s): {} segment(s) kept of {}",
            index + 1,
            chunks.len(),
            start_ms / 1000.0,
            end_ms / 1000.0,
            kept.len(),
            response.segments.len().max(1)
        );
        results.extend(kept);
    }
    on_progress(chunks.len(), chunks.len());
    Ok(results)
}

fn ms_to_sample(ms: f64) -> usize {
    (ms.max(0.0) * SAMPLE_RATE as f64 / 1000.0).round() as usize
}

/// Split `[0, total_ms]` into chunks of at most `max_chunk_ms`, cutting in the middle of
/// the widest pause between VAD speech ranges near the limit. Falls back to any pause in
/// the chunk, then to a hard cut when someone talks for the whole window.
fn plan_chunks(total_ms: f64, speech_ms: &[(f64, f64)], max_chunk_ms: f64) -> Vec<(f64, f64)> {
    let mut speech: Vec<(f64, f64)> = speech_ms.to_vec();
    speech.sort_by(|a, b| a.0.total_cmp(&b.0));
    let gaps: Vec<(f64, f64)> = speech
        .windows(2)
        .filter(|pair| pair[1].0 > pair[0].1)
        .map(|pair| (pair[0].1, pair[1].0))
        .collect();

    let mut chunks = Vec::new();
    let mut cursor = 0.0;
    while total_ms - cursor > max_chunk_ms {
        let limit = cursor + max_chunk_ms;
        let widest_gap_mid = |from: f64| {
            gaps.iter()
                .map(|&(gap_start, gap_end)| ((gap_start + gap_end) / 2.0, gap_end - gap_start))
                .filter(|&(mid, _)| mid > from && mid <= limit)
                .max_by(|a, b| a.1.total_cmp(&b.1))
                .map(|(mid, _)| mid)
        };
        let cut = widest_gap_mid((limit - CUT_SEARCH_WINDOW_MS).max(cursor + MIN_CHUNK_MS))
            .or_else(|| widest_gap_mid(cursor + MIN_CHUNK_MS))
            .unwrap_or(limit);
        chunks.push((cursor, cut));
        cursor = cut;
    }
    if total_ms > cursor {
        chunks.push((cursor, total_ms));
    }
    chunks
}

fn overlap_ms(range: (f64, f64), speech_ms: &[(f64, f64)]) -> f64 {
    speech_ms
        .iter()
        .map(|&(s, e)| (e.min(range.1) - s.max(range.0)).max(0.0))
        .sum()
}

/// 16-bit PCM mono WAV, written by hand (44-byte header + samples).
fn encode_wav_pcm16(samples: &[f32], sample_rate: u32) -> Vec<u8> {
    let data_len = (samples.len() * 2) as u32;
    let mut wav = Vec::with_capacity(44 + data_len as usize);
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&(36 + data_len).to_le_bytes());
    wav.extend_from_slice(b"WAVE");
    wav.extend_from_slice(b"fmt ");
    wav.extend_from_slice(&16u32.to_le_bytes()); // fmt chunk size
    wav.extend_from_slice(&1u16.to_le_bytes()); // PCM
    wav.extend_from_slice(&1u16.to_le_bytes()); // mono
    wav.extend_from_slice(&sample_rate.to_le_bytes());
    wav.extend_from_slice(&(sample_rate * 2).to_le_bytes()); // byte rate
    wav.extend_from_slice(&2u16.to_le_bytes()); // block align
    wav.extend_from_slice(&16u16.to_le_bytes()); // bits per sample
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&data_len.to_le_bytes());
    for &sample in samples {
        let value = (sample.clamp(-1.0, 1.0) * i16::MAX as f32).round() as i16;
        wav.extend_from_slice(&value.to_le_bytes());
    }
    wav
}

fn build_prompt(vocabulary: &str) -> Option<String> {
    let terms = vocabulary
        .split(|c| c == '\n' || c == ',' || c == ';')
        .map(str::trim)
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>();
    if terms.is_empty() {
        return None;
    }
    let mut prompt = format!("Vocabulário: {}.", terms.join(", "));
    if prompt.chars().count() > MAX_PROMPT_CHARS {
        prompt = prompt.chars().take(MAX_PROMPT_CHARS).collect();
    }
    Some(prompt)
}

#[derive(Debug, Deserialize)]
struct GroqVerboseResponse {
    #[serde(default)]
    text: String,
    #[serde(default)]
    segments: Vec<GroqSegment>,
}

#[derive(Debug, Deserialize)]
struct GroqSegment {
    start: f64,
    end: f64,
    text: String,
    #[serde(default)]
    avg_logprob: Option<f64>,
    #[serde(default)]
    no_speech_prob: Option<f64>,
    #[serde(default)]
    compression_ratio: Option<f64>,
}

async fn send_with_retry<C: Fn() -> bool>(
    client: &reqwest::Client,
    options: &GroqOptions,
    prompt: Option<&str>,
    wav: Vec<u8>,
    is_cancelled: &C,
) -> Result<GroqVerboseResponse> {
    let mut attempt = 0;
    loop {
        attempt += 1;
        let file = reqwest::multipart::Part::bytes(wav.clone())
            .file_name("audio.wav")
            .mime_str("audio/wav")
            .map_err(|e| anyhow!("Invalid MIME type: {}", e))?;
        let mut form = reqwest::multipart::Form::new()
            .part("file", file)
            .text("model", options.model.clone())
            .text("temperature", "0")
            .text("response_format", "verbose_json")
            .text("timestamp_granularities[]", "segment");
        if let Some(language) = &options.language {
            form = form.text("language", language.clone());
        }
        if let Some(prompt) = prompt {
            form = form.text("prompt", prompt.to_string());
        }

        let wait = match client
            .post(GROQ_TRANSCRIPTIONS_URL)
            .bearer_auth(&options.api_key)
            .multipart(form)
            .send()
            .await
        {
            Ok(response) if response.status().is_success() => {
                return response
                    .json::<GroqVerboseResponse>()
                    .await
                    .map_err(|e| anyhow!("Resposta inesperada da Groq: {}", e));
            }
            Ok(response) => {
                let status = response.status();
                let retry_after = response
                    .headers()
                    .get(reqwest::header::RETRY_AFTER)
                    .and_then(|v| v.to_str().ok())
                    .and_then(|v| v.trim().parse::<f64>().ok());
                let body = response.text().await.unwrap_or_default();
                match status.as_u16() {
                    401 | 403 => {
                        return Err(anyhow!("Chave da Groq inválida ou sem permissão ({}).", status))
                    }
                    429 => {
                        let secs = retry_after.unwrap_or(10.0);
                        if secs > MAX_RETRY_AFTER_SECS {
                            return Err(anyhow!(
                                "Limite grátis da Groq atingido; tente de novo em {:.0} min.",
                                (secs / 60.0).ceil()
                            ));
                        }
                        Duration::from_secs_f64(secs.max(1.0))
                    }
                    500..=599 => Duration::from_secs(2u64.pow(attempt)),
                    _ => return Err(anyhow!("A Groq recusou o áudio ({}): {}", status, body)),
                }
            }
            Err(e) => {
                warn!("Groq request failed (attempt {}): {}", attempt, e);
                Duration::from_secs(2u64.pow(attempt))
            }
        };

        if attempt >= MAX_ATTEMPTS {
            return Err(anyhow!(
                "Não foi possível falar com a Groq depois de {} tentativas. Verifique a internet.",
                MAX_ATTEMPTS
            ));
        }
        warn!("Groq: retrying in {:.0}s (attempt {}/{})", wait.as_secs_f64(), attempt, MAX_ATTEMPTS);
        let deadline = tokio::time::Instant::now() + wait;
        while tokio::time::Instant::now() < deadline {
            if is_cancelled() {
                return Err(anyhow!("Retranscription cancelled"));
            }
            tokio::time::sleep(Duration::from_millis(250)).await;
        }
    }
}

/// Convert a chunk's segments to recording time and drop what Whisper invents:
/// repetition loops, YouTube-subtitle boilerplate, and text over stretches the VAD
/// heard as silence.
fn map_segments(
    response: &GroqVerboseResponse,
    chunk_start_ms: f64,
    chunk_end_ms: f64,
    speech_ms: &[(f64, f64)],
) -> Vec<(String, f64, f64)> {
    if response.segments.is_empty() {
        let text = response.text.trim();
        return if text.is_empty() || is_boilerplate(text) {
            Vec::new()
        } else {
            vec![(text.to_string(), chunk_start_ms, chunk_end_ms)]
        };
    }

    response
        .segments
        .iter()
        .filter_map(|segment| {
            let text = segment.text.trim();
            let start = (chunk_start_ms + segment.start * 1000.0).min(chunk_end_ms);
            let end = (chunk_start_ms + segment.end * 1000.0).clamp(start, chunk_end_ms);
            let duration = (end - start).max(1.0);
            let speech_fraction = overlap_ms((start, end), speech_ms) / duration;
            let no_speech = segment.no_speech_prob.unwrap_or(0.0);
            let logprob = segment.avg_logprob.unwrap_or(0.0);

            let drop = text.is_empty()
                || is_boilerplate(text)
                || segment.compression_ratio.unwrap_or(0.0) > 2.4
                || (speech_fraction < 0.2 && (no_speech > 0.5 || logprob < -1.0))
                || (no_speech > 0.8 && logprob < -1.0);
            if drop {
                info!("Groq: dropped segment {:.1}s-{:.1}s (likely not speech)", start / 1000.0, end / 1000.0);
                None
            } else {
                Some((text.to_string(), start, end))
            }
        })
        .collect()
}

/// Phrases Whisper hallucinates in Portuguese over silence or music (learned from
/// subtitled videos). Dropped only when they are (almost) the whole segment.
const BOILERPLATE: &[&str] = &[
    "legendas pela comunidade",
    "legendado por",
    "legendas por",
    "legenda por",
    "obrigado por assistir",
    "obrigada por assistir",
    "inscreva-se no canal",
    "se inscreva no canal",
    "ative o sininho",
];

fn is_boilerplate(text: &str) -> bool {
    let normalized = text.to_lowercase();
    if normalized.contains("amara.org") {
        return true;
    }
    BOILERPLATE.iter().any(|phrase| {
        normalized.contains(phrase)
            && normalized.chars().count() <= phrase.chars().count() + 25
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn short_recording_is_one_chunk() {
        assert_eq!(plan_chunks(30_000.0, &[(0.0, 30_000.0)], MAX_CHUNK_MS), vec![(0.0, 30_000.0)]);
    }

    #[test]
    fn chunks_are_cut_at_the_widest_pause_near_the_limit() {
        // 25 min of speech in 20 s turns separated by 1 s pauses, with one 4 s pause
        // after the turn that ends at 9:05 (545 s).
        let mut speech = Vec::new();
        let mut t = 0.0;
        let mut turn = 0;
        while t < 1_480_000.0 {
            speech.push((t, t + 20_000.0));
            t += 20_000.0 + if turn == 25 { 4_000.0 } else { 1_000.0 };
            turn += 1;
        }
        let chunks = plan_chunks(1_500_000.0, &speech, MAX_CHUNK_MS);

        assert!(chunks.iter().all(|(s, e)| e - s <= MAX_CHUNK_MS));
        assert_eq!(chunks.first().unwrap().0, 0.0);
        assert_eq!(chunks.last().unwrap().1, 1_500_000.0);
        for pair in chunks.windows(2) {
            assert_eq!(pair[0].1, pair[1].0, "chunks must be contiguous");
        }
        // First cut lands in the middle of the 4 s pause, not inside a speech turn.
        let first_cut = chunks[0].1;
        assert!(speech.iter().all(|&(s, e)| first_cut <= s || first_cut >= e));
        assert!((first_cut - 547_000.0).abs() < 1.0, "cut at {}", first_cut);
    }

    #[test]
    fn continuous_speech_falls_back_to_hard_cut() {
        let chunks = plan_chunks(1_300_000.0, &[(0.0, 1_300_000.0)], MAX_CHUNK_MS);
        assert_eq!(chunks, vec![(0.0, 600_000.0), (600_000.0, 1_200_000.0), (1_200_000.0, 1_300_000.0)]);
    }

    #[test]
    fn wav_header_and_size_are_valid() {
        let wav = encode_wav_pcm16(&[0.0, 1.0, -1.0, 0.5], 16_000);
        assert_eq!(wav.len(), 44 + 8);
        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(u32::from_le_bytes(wav[4..8].try_into().unwrap()), 36 + 8);
        assert_eq!(&wav[8..16], b"WAVEfmt ");
        assert_eq!(u32::from_le_bytes(wav[24..28].try_into().unwrap()), 16_000);
        assert_eq!(&wav[36..40], b"data");
        assert_eq!(i16::from_le_bytes([wav[46], wav[47]]), i16::MAX);
        assert_eq!(i16::from_le_bytes([wav[48], wav[49]]), -i16::MAX);
        // 10 minutes stays under the 25 MB free-tier limit.
        assert!(44 + 600 * 16_000 * 2 < 25 * 1024 * 1024);
    }

    #[test]
    fn verbose_json_is_mapped_to_recording_time_and_filtered() {
        let response: GroqVerboseResponse = serde_json::from_value(serde_json::json!({
            "text": "...",
            "segments": [
                {"start": 0.0, "end": 4.0, "text": " Bom dia, pessoal.", "avg_logprob": -0.2, "no_speech_prob": 0.01, "compression_ratio": 1.1},
                {"start": 4.0, "end": 9.0, "text": " Legendas pela comunidade Amara.org", "avg_logprob": -0.4, "no_speech_prob": 0.3, "compression_ratio": 1.0},
                {"start": 9.0, "end": 14.0, "text": " Obrigado.", "avg_logprob": -1.3, "no_speech_prob": 0.7, "compression_ratio": 0.9},
                {"start": 14.0, "end": 20.0, "text": " sim sim sim sim sim sim sim sim", "avg_logprob": -0.3, "no_speech_prob": 0.0, "compression_ratio": 3.1},
                {"start": 20.0, "end": 25.0, "text": " Vamos falar do orçamento.", "avg_logprob": -0.3, "no_speech_prob": 0.05, "compression_ratio": 1.2}
            ]
        }))
        .unwrap();
        // VAD heard speech at 60-64 s and 80-85 s of the recording (chunk starts at 60 s);
        // 69-74 s was silence.
        let speech = [(60_000.0, 64_000.0), (80_000.0, 85_000.0)];
        let kept = map_segments(&response, 60_000.0, 660_000.0, &speech);

        assert_eq!(
            kept,
            vec![
                ("Bom dia, pessoal.".to_string(), 60_000.0, 64_000.0),
                ("Vamos falar do orçamento.".to_string(), 80_000.0, 85_000.0),
            ]
        );
    }

    #[test]
    fn response_without_segments_uses_whole_chunk() {
        let response: GroqVerboseResponse =
            serde_json::from_value(serde_json::json!({"text": " Olá a todos."})).unwrap();
        assert_eq!(
            map_segments(&response, 1_000.0, 5_000.0, &[(1_000.0, 5_000.0)]),
            vec![("Olá a todos.".to_string(), 1_000.0, 5_000.0)]
        );
    }

    #[test]
    fn boilerplate_only_when_it_is_the_whole_segment() {
        assert!(is_boilerplate("Obrigado por assistir!"));
        assert!(is_boilerplate("Legendas pela comunidade Amara.org"));
        assert!(!is_boilerplate(
            "E aí no final da aula eu falei obrigado por assistir, mas a turma já tinha saído toda"
        ));
    }

    #[test]
    fn language_and_prompt_normalization() {
        assert_eq!(normalize_language(Some("pt".into())), Some("pt".into()));
        assert_eq!(normalize_language(Some("auto".into())), None);
        assert_eq!(normalize_language(Some("auto-translate".into())), None);
        assert_eq!(normalize_language(None), None);
        assert_eq!(
            build_prompt("Brifador\nGroq, Parakeet;  \n"),
            Some("Vocabulário: Brifador, Groq, Parakeet.".to_string())
        );
        assert_eq!(build_prompt("  \n "), None);
        assert!(build_prompt(&"palavra, ".repeat(500)).unwrap().chars().count() <= MAX_PROMPT_CHARS);
    }
}
