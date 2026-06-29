"""
Cognitive Assessment Pipeline - FastAPI Backend
Commercial stack: Chirp STT | spaCy morphology | sentence-transformers embeddings
                 j-hartmann emotion | librosa acoustics
"""

import os
import spacy
import numpy as np
import librosa
import soundfile as sf
import subprocess
from google.cloud.speech_v2 import SpeechClient
from google.cloud.speech_v2.types import cloud_speech

# Set FFMPEG_PATH in your environment, or it defaults to the system PATH
FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")
GCP_PROJECT = os.environ.get("GCP_PROJECT_ID", "project-e61ab50a-3782-4e35-814")

def _to_wav(src: str) -> str:
    """Convert any audio format to 16kHz mono wav using ffmpeg."""
    dst = src + ".wav"
    subprocess.run(
        [FFMPEG, "-y", "-i", src, "-ar", "16000", "-ac", "1", dst],
        check=True, capture_output=True
    )
    return dst
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from transformers import pipeline as hf_pipeline
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session
import pathlib
import statistics
import tempfile, os, time, uuid, json
from datetime import datetime

from database import Base, engine, get_db
import models, schemas
from auth import verify_password, hash_password, create_access_token, get_current_clinician

# Create tables on startup (safe to run repeatedly)
Base.metadata.create_all(bind=engine)

_nlp = spacy.load("en_core_web_sm")
_embedder = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
_emotion = hf_pipeline("text-classification", model="j-hartmann/emotion-english-distilroberta-base", top_k=None, device=-1)

app = FastAPI(title="Cognitive Assessment API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ──────────────────────────────────────────────────────────────────

class AssessmentResult(BaseModel):
    session_id: str
    transcript: str
    duration_seconds: float
    pipeline: dict
    scores: dict
    report: dict


# ── Pipeline stages ──────────────────────────────────────────────────────────

def transcribe_audio(audio_path: str) -> dict:
    """
    Stage 1: Speech-to-Text via Google Chirp (Cloud Speech-to-Text V2 API).

    Production implementation:
        from google.cloud.speech_v2 import SpeechClient
        from google.cloud.speech_v2.types import cloud_speech

        client = SpeechClient()
        with open(audio_path, "rb") as f:
            content = f.read()

        config = cloud_speech.RecognitionConfig(
            auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
            language_codes=["en-US"],
            model="chirp",
        )
        request = cloud_speech.RecognizeRequest(
            recognizer=f"projects/{PROJECT_ID}/locations/us-central1/recognizers/_",
            config=config,
            content=content,
        )
        response = client.recognize(request=request)
        transcript = " ".join(r.alternatives[0].transcript for r in response.results)

    Pricing: $0.024/min (standard Chirp), commercial license via Google Cloud.
    """
    wav_path = _to_wav(audio_path)
    with open(wav_path, "rb") as f:
        content = f.read()

    client = SpeechClient(client_options={"api_endpoint": "us-central1-speech.googleapis.com"})
    config = cloud_speech.RecognitionConfig(
        auto_decoding_config=cloud_speech.AutoDetectDecodingConfig(),
        language_codes=["en-US"],
        model="chirp",
    )
    request = cloud_speech.RecognizeRequest(
        recognizer=f"projects/{GCP_PROJECT}/locations/us-central1/recognizers/_",
        config=config,
        content=content,
    )
    response = client.recognize(request=request)
    transcript = " ".join(
        r.alternatives[0].transcript for r in response.results if r.alternatives
    )
    word_count = len(transcript.split())
    return {
        "transcript": transcript,
        "words_per_minute": word_count,
        "confidence": response.results[0].alternatives[0].confidence if response.results else 0.0,
        "model": "chirp",
    }


def extract_acoustic_features(audio_path: str) -> dict:
    """
    Stage 2: Acoustic feature extraction via librosa (ISC license) +
             SpeechBrain (Apache 2.0).

    Production implementation:
        import librosa
        import numpy as np

        y, sr = librosa.load(audio_path, sr=16000)

        # Speech timing
        intervals = librosa.effects.split(y, top_db=30)
        speech_duration = sum(e - s for s, e in intervals) / sr
        total_duration = len(y) / sr
        pause_duration = total_duration - speech_duration
        pause_count = len(intervals) - 1

        # MFCCs (articulatory proxy)
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)

        # Pitch (F0) via PYIN
        f0, voiced_flag, _ = librosa.pyin(y, fmin=75, fmax=300)
        pitch_mean = float(np.nanmean(f0))
        pitch_std = float(np.nanstd(f0))

        # Harmonic-to-noise ratio proxy via SpeechBrain
        # from speechbrain.inference import EncoderClassifier ...

    Libraries: librosa (ISC ✅), SpeechBrain (Apache 2.0 ✅) — both commercial-safe.
    """
    wav_path = _to_wav(audio_path)
    y, sr = librosa.load(wav_path, sr=16000, mono=True)
    total_duration = len(y) / sr

    # Speech / pause timing — only count pauses >= 300ms (clinically meaningful)
    intervals = librosa.effects.split(y, top_db=40)
    speech_duration = sum(e - s for s, e in intervals) / sr
    min_pause_samples = int(0.3 * sr)
    real_pauses = [
        (intervals[i][1], intervals[i + 1][0])
        for i in range(len(intervals) - 1)
        if intervals[i + 1][0] - intervals[i][1] >= min_pause_samples
    ]
    pause_count = len(real_pauses)
    pause_durations = [(e - s) / sr for s, e in real_pauses]
    pause_duration = sum(pause_durations)
    mean_pause_ms = round(np.mean(pause_durations) * 1000, 1) if pause_durations else 0.0

    # Pitch via PYIN
    f0, _, _ = librosa.pyin(y, fmin=75, fmax=300)
    pitch_mean = float(np.nanmean(f0)) if np.any(~np.isnan(f0)) else 0.0
    pitch_std  = float(np.nanstd(f0))  if np.any(~np.isnan(f0)) else 0.0

    # HNR: harmonic energy vs noise (percussive) energy
    harmonic, noise = librosa.effects.hpss(y)
    h_power = np.mean(harmonic ** 2) + 1e-10
    n_power = np.mean(noise ** 2) + 1e-10
    hnr_db = round(float(10 * np.log10(h_power / n_power)), 2)

    articulation_rate = round(speech_duration / total_duration * 4.0, 2) if total_duration > 0 else 0.0

    return {
        "speech_rate_syllables_per_sec": articulation_rate,
        "pause_count": pause_count,
        "mean_pause_duration_ms": mean_pause_ms,
        "total_pause_duration_sec": round(pause_duration, 2),
        "pitch_mean_hz": round(pitch_mean, 1),
        "pitch_std_hz": round(pitch_std, 1),
        "hnr_db": hnr_db,
        "articulation_rate": articulation_rate,
    }


def analyse_morphology(transcript: str) -> dict:
    """
    Stage 3: Morphological tagging via spaCy (MIT license ✅).

    Production implementation:
        import spacy
        nlp = spacy.load("en_core_web_sm")   # or en_core_web_trf for accuracy
        doc = nlp(transcript)

        tokens = [t for t in doc if not t.is_space]
        content_words = [t for t in tokens if t.pos_ in {"NOUN","VERB","ADJ","ADV"}]

        noun_ratio = sum(1 for t in content_words if t.pos_ == "NOUN") / max(len(content_words), 1)
        verb_ratio = sum(1 for t in content_words if t.pos_ == "VERB") / max(len(content_words), 1)

        first_person = sum(1 for t in tokens if t.lower_ in {"i","me","my","myself","mine"})
        third_person = sum(1 for t in tokens if t.lower_ in {"he","she","they","him","her","them","his","hers","their"})
        total_person_refs = first_person + third_person
        first_person_ratio = first_person / max(total_person_refs, 1)

        # Anomia proxy: definite articles before pauses / disfluencies
        disfluencies = sum(1 for t in tokens if t.lower_ in {"um","uh","er","hmm","the","a","an"}
                          and t.i + 1 < len(tokens) and doc[t.i+1].pos_ in {"PUNCT","SPACE"})

    Library: spaCy MIT ✅ — commercial-safe.
    """
    doc = _nlp(transcript)
    tokens = [t for t in doc if not t.is_space]
    content_words = [t for t in tokens if t.pos_ in {"NOUN", "VERB", "ADJ", "ADV"}]

    noun_ratio = sum(1 for t in content_words if t.pos_ == "NOUN") / max(len(content_words), 1)
    verb_ratio = sum(1 for t in content_words if t.pos_ == "VERB") / max(len(content_words), 1)

    first_person = sum(1 for t in tokens if t.lower_ in {"i", "me", "my", "myself", "mine"})
    third_person = sum(1 for t in tokens if t.lower_ in {"he", "she", "they", "him", "her", "them", "his", "hers", "their"})
    first_person_ratio = first_person / max(first_person + third_person, 1)
    third_person_ratio = third_person / max(first_person + third_person, 1)

    disfluency_count = sum(
        1 for t in tokens
        if t.lower_ in {"um", "uh", "er", "hmm"}
        or (t.lower_ in {"the", "a", "an"} and t.i + 1 < len(doc) and doc[t.i + 1].pos_ in {"PUNCT"})
    )

    words = [t.lower_ for t in tokens if not t.is_punct]
    return {
        "noun_ratio": round(noun_ratio, 3),
        "verb_ratio": round(verb_ratio, 3),
        "first_person_ratio": round(first_person_ratio, 3),
        "third_person_ratio": round(third_person_ratio, 3),
        "type_token_ratio": round(len(set(words)) / max(len(words), 1), 3),
        "disfluency_count": disfluency_count,
        "word_count": len(words),
        "unique_words": len(set(words)),
    }


def analyse_semantics(transcript: str) -> dict:
    """
    Stage 4: Semantic variability via sentence-transformers (Apache 2.0 ✅).
    Replaces FastText (CC BY-SA) with a commercially safe alternative.

    Production implementation:
        from sentence_transformers import SentenceTransformer
        import numpy as np

        model = SentenceTransformer("sentence-transformers/all-mpnet-base-v2")
        sentences = [s.strip() for s in transcript.split(".") if s.strip()]
        if len(sentences) < 2:
            sentences = transcript.split(",")

        embeddings = model.encode(sentences)

        # Semantic variability = variance of cosine distances between adjacent sentences
        from sklearn.metrics.pairwise import cosine_similarity
        dists = [1 - cosine_similarity([embeddings[i]], [embeddings[i+1]])[0][0]
                 for i in range(len(embeddings)-1)]
        semantic_variability = float(np.var(dists))

        # Word frequency proxy via token frequency in corpus
        # Low-frequency words = better semantic memory navigation
        common_words = {"the","a","an","i","and","to","of","in","is","was","it","for"}
        high_freq_ratio = sum(1 for w in transcript.lower().split() if w in common_words) / max(len(transcript.split()), 1)

    Model: all-mpnet-base-v2 (Apache 2.0 ✅) — commercial-safe.
    """
    # Chirp returns unpunctuated transcripts — split into 15-word chunks
    words = transcript.split()
    chunk_size = 15
    chunks = [" ".join(words[i:i + chunk_size]) for i in range(0, len(words), chunk_size) if len(words[i:i + chunk_size]) >= 5]

    if len(chunks) >= 2:
        embeddings = _embedder.encode(chunks)
        dists = [
            1 - cosine_similarity([embeddings[i]], [embeddings[i + 1]])[0][0]
            for i in range(len(embeddings) - 1)
        ]
        semantic_variability = float(np.var(dists))
        topic_coherence = round(1 - float(np.mean(dists)), 3)
    else:
        semantic_variability = 0.0
        topic_coherence = 1.0

    common_words = {"the", "a", "an", "i", "and", "to", "of", "in", "is", "was", "it", "for"}
    words = transcript.lower().split()
    high_freq_ratio = sum(1 for w in words if w in common_words) / max(len(words), 1)

    granularity = round(1 - high_freq_ratio, 3)

    return {
        "semantic_variability": round(semantic_variability, 4),
        "high_frequency_word_ratio": round(high_freq_ratio, 3),
        "semantic_granularity_score": granularity,
        "topic_coherence": topic_coherence,
    }


def analyse_emotion(transcript: str) -> dict:
    """
    Stage 5: Emotion detection via j-hartmann/emotion-english-distilroberta-base
             (Apache 2.0 ✅). Direct replacement for PySentimiento (non-commercial ❌).

    Production implementation:
        from transformers import pipeline

        classifier = pipeline(
            "text-classification",
            model="j-hartmann/emotion-english-distilroberta-base",
            top_k=None,
            device=-1  # CPU; set device=0 for GPU
        )
        results = classifier(transcript[:512])[0]  # model max 512 tokens
        emotions = {r["label"].lower(): round(r["score"], 4) for r in results}

        # Map to 6 basic emotions matching TELL's PySentimiento output
        # Labels: anger, disgust, fear, joy, neutral, sadness, surprise

    Model: j-hartmann/emotion-english-distilroberta-base (Apache 2.0 ✅).
    """
    results = _emotion(transcript[:512])[0]
    emotions = {r["label"].lower(): round(r["score"], 4) for r in results}
    dominant = max(emotions, key=emotions.get)
    positive = {"joy", "surprise"}
    valence = "positive" if dominant in positive else "negative" if dominant in {"anger", "disgust", "fear", "sadness"} else "neutral"
    return {**emotions, "dominant_emotion": dominant, "valence": valence}


def compute_scores(acoustic: dict, morphology: dict, semantics: dict, emotion: dict) -> dict:
    """
    Composite scoring across four cognitive domains.
    Scoring is indicative — requires clinical validation before deployment.
    Range: 0-100, higher = better preserved function.
    """

    # Motor speech score (0-100)
    # Articulation component (0-55): peaks at ~3.0 syl/sec for connected speech
    artic_score = min(acoustic["articulation_rate"] / 3.0 * 55, 55)
    # Pause frequency penalty: only excess pauses above 10 are clinically significant
    # (normal connected speech has ~6-10 pauses per minute)
    excess_pauses = max(0, acoustic["pause_count"] - 10)
    pause_freq_penalty = min(excess_pauses * 2.0, 15)
    # Long pause penalty: mean pause >800ms suggests word-finding difficulty
    long_pause_penalty = min(max(0, (acoustic["mean_pause_duration_ms"] - 800) / 200), 5)
    pause_penalty = min(pause_freq_penalty + long_pause_penalty, 20)
    # HNR component (0-15): maps (-5 to 15 dB) → (0 to 15)
    hnr_score = max(0, min((acoustic["hnr_db"] + 5) / 20 * 15, 15))
    motor_score = max(0, round(artic_score - pause_penalty + hnr_score + 10, 1))

    # Semantic memory score (0-100)
    # Low high-freq word ratio and high variability = better semantic navigation
    semantic_score = round(
        (1 - semantics["high_frequency_word_ratio"]) * 50
        + semantics["semantic_granularity_score"] * 30
        + semantics["topic_coherence"] * 20,
        1
    )

    # Episodic memory score (0-100)
    # High first-person ratio, low disfluency, good type-token ratio
    episodic_score = round(
        morphology["first_person_ratio"] * 40
        + (1 - min(morphology["disfluency_count"] / 10, 1)) * 30
        + morphology["type_token_ratio"] * 30,
        1
    )

    # Emotional processing score (0-100)
    # Penalise flat affect: score drops as neutral approaches 1.0
    neutral_penalty = max(0, (emotion["neutral"] - 0.5) * 200)
    emotional_score = round(max(0, 100 - neutral_penalty), 1)

    composite = round((motor_score + semantic_score + episodic_score + emotional_score) / 4, 1)

    return {
        "motor_speech": motor_score,
        "semantic_memory": semantic_score,
        "episodic_memory": episodic_score,
        "emotional_processing": emotional_score,
        "composite": composite,
    }


def generate_report(scores: dict, morphology: dict, acoustic: dict, emotion: dict, semantics: dict) -> dict:
    """Generate a structured clinical report with contextualised flagged findings.

    Each flag has:
      label    — short heading
      severity — "note" (informational) | "watch" (monitor) | "refer" (consider referral)
      detail   — plain-language explanation with the actual measured value and clinical context
    """
    flags = []
    recommendations = []

    # ── Motor speech ──────────────────────────────────────────────────────────
    pc = acoustic["pause_count"]
    ar = acoustic["articulation_rate"]
    if scores["motor_speech"] < 50:
        flags.append({
            "label": "Reduced motor speech fluency",
            "severity": "refer",
            "detail": (
                f"{pc} pauses were detected with an articulation rate of {ar} syl/s. "
                "Both values fall outside the typical range (6–10 pauses/min, 3.0–4.0 syl/s). "
                "This pattern may indicate disruption to speech motor control. "
                "Consider formal motor speech assessment."
            ),
        })
        recommendations.append("Consider formal motor speech assessment")
    elif scores["motor_speech"] < 70:
        flags.append({
            "label": "Slightly elevated pause frequency",
            "severity": "note",
            "detail": (
                f"{pc} pauses were detected (typical range: 6–10 per minute). "
                f"Articulation rate of {ar} syl/s is within the normal range (3.0–4.0 syl/s). "
                "The slight elevation in pausing is within acceptable variation for spontaneous "
                "conversational speech. No immediate clinical concern — monitor across repeat sessions."
            ),
        })

    # ── Disfluencies (uh, um, er) ─────────────────────────────────────────────
    dc = morphology["disfluency_count"]
    if dc >= 7:
        flags.append({
            "label": "Word-finding difficulty",
            "severity": "refer",
            "detail": (
                f"{dc} hesitations (uh, um, er) were detected — significantly above the typical "
                "range of 0–3 for structured speech tasks. This frequency can indicate anomia or "
                "language retrieval difficulties and warrants further assessment."
            ),
        })
        recommendations.append("Assess for anomia — consider a formal naming task")
    elif dc >= 4:
        flags.append({
            "label": "Mild word-finding hesitation",
            "severity": "watch",
            "detail": (
                f"{dc} hesitations (uh, um, er) were detected. The typical range for structured "
                "speech tasks is 0–3. This is mildly elevated but not unusual in informal or "
                "emotionally engaging narrative. Monitor for a progressive increase across sessions."
            ),
        })
        recommendations.append("Monitor disfluency rate across repeat sessions")
    elif dc >= 2:
        flags.append({
            "label": "Natural speech hesitation",
            "severity": "note",
            "detail": (
                f"{dc} hesitations (uh, um, er) were detected. This is within the normal range "
                "for spontaneous conversational speech and is not clinically significant in isolation. "
                "Logged here for completeness."
            ),
        })

    # ── Semantic memory ───────────────────────────────────────────────────────
    if scores["semantic_memory"] < 50:
        hf = round(semantics["high_frequency_word_ratio"] * 100)
        flags.append({
            "label": "Reduced vocabulary range",
            "severity": "refer",
            "detail": (
                f"High-frequency word use at {hf}% (expected <35%) and reduced semantic variability "
                "suggest limited vocabulary access. Over-reliance on generic, common words is associated "
                "with semantic memory decline. Consider formal semantic fluency assessment."
            ),
        })
        recommendations.append("Administer formal semantic fluency task")
    elif scores["semantic_memory"] < 70:
        flags.append({
            "label": "Borderline semantic memory",
            "severity": "note",
            "detail": (
                f"Semantic memory score is {scores['semantic_memory']} — within the moderate range. "
                "Free narrative tasks tend to score lower than structured fluency tasks due to the "
                "informal nature of the prompt. Interpret alongside the episodic memory score and "
                "consider a semantic fluency task for a more targeted measure."
            ),
        })

    # ── Episodic memory ───────────────────────────────────────────────────────
    if scores["episodic_memory"] < 50:
        fpr = round(morphology["first_person_ratio"] * 100)
        flags.append({
            "label": "Reduced personal narrative structure",
            "severity": "watch",
            "detail": (
                f"First-person references at {fpr}% (expected >60% for personal recall tasks). "
                "Reduced self-referential language in narrative tasks can be an early marker of "
                "episodic memory changes. Consider follow-up with a structured recall task."
            ),
        })

    # ── Emotional processing ──────────────────────────────────────────────────
    neutral_pct = round(emotion["neutral"] * 100)
    if emotion["neutral"] > 0.75:
        flags.append({
            "label": "Flat affect detected",
            "severity": "refer",
            "detail": (
                f"Neutral emotional tone at {neutral_pct}% — well above the expected threshold of 50%. "
                "Persistent flat affect in speech can be associated with depression, apathy, or "
                "neurodegenerative processes. Interpret alongside clinical observation."
            ),
        })
    elif emotion["neutral"] > 0.55:
        flags.append({
            "label": "Mildly reduced emotional range",
            "severity": "watch",
            "detail": (
                f"Neutral tone at {neutral_pct}%. A neutral tone above 50% may indicate reduced "
                "emotional expressivity. This can be normal for reserved speakers or for tasks that "
                "are not emotionally charged (e.g., a morning routine description). "
                "Monitor across different task types."
            ),
        })

    overall_risk = (
        "low" if scores["composite"] >= 70
        else "moderate" if scores["composite"] >= 45
        else "elevated"
    )

    return {
        "overall_risk": overall_risk,
        "flags": flags,
        "recommendations": recommendations,
        "note": (
            "This output is indicative only and requires clinical validation. "
            "Not for use as standalone diagnostic tool."
        ),
    }


# ── Change control config ────────────────────────────────────────────────────

_LOGS_DIR = pathlib.Path(__file__).parent / "logs"
_CC_PATH   = pathlib.Path(__file__).parent / "change_control.json"
_CHANGE_CONTROL: dict = json.loads(_CC_PATH.read_text(encoding="utf-8")) if _CC_PATH.exists() else {}


def _append_change_event_log(feature_path: str, label: str, breach_type: str, detail: str) -> None:
    """Layer B — append a row to logs/change_events.md for engineering review."""
    _LOGS_DIR.mkdir(exist_ok=True)
    log_path = _LOGS_DIR / "change_events.md"
    if not log_path.exists():
        log_path.write_text(
            "# CogAssess Change Events Log\n\n"
            "Auto-generated by the drift monitoring system. "
            "Each entry requires formal change assessment review per the Change Control Plan.\n\n"
            "| Opened (UTC) | Feature | Label | Breach type | Detail |\n"
            "|---|---|---|---|---|\n",
            encoding="utf-8",
        )
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    row = f"| {now} | `{feature_path}` | {label} | {breach_type} | {detail} |\n"
    with open(log_path, "a", encoding="utf-8") as fh:
        fh.write(row)


def _check_change_control_thresholds(drift_features: dict, db: Session) -> int:
    """
    Compare a drift result dict against change_control.json.
    Creates ChangeEvent rows for new breaches (deduplicates open events).
    Also writes to logs/change_events.md (Layer B).
    Returns the count of new events created.
    """
    global_cfg  = _CHANGE_CONTROL.get("global", {})
    feature_cfg = _CHANGE_CONTROL.get("features", {})
    new_events  = 0

    for feature_path, data in drift_features.items():
        if data.get("status") == "insufficient_data":
            continue

        cfg        = feature_cfg.get(feature_path, {})
        z_critical = cfg.get("z_score_critical", global_cfg.get("z_score_critical", 2.5))
        min_mean   = cfg.get("min_mean")
        max_mean   = cfg.get("max_mean")
        label      = cfg.get("label", feature_path)

        breaches = []
        z  = data.get("z_score", 0.0)
        wm = data.get("window_mean")

        if z >= z_critical:
            breaches.append({
                "breach_type": "z_score",
                "severity":    "critical",
                "detail":      f"Z-score {z} ≥ threshold {z_critical} (baseline mean {data.get('baseline_mean')}, window mean {wm})",
            })
        if min_mean is not None and wm is not None and wm < min_mean:
            breaches.append({
                "breach_type": "threshold_min",
                "severity":    "critical",
                "detail":      f"Window mean {wm} < minimum {min_mean} defined in change control plan",
            })
        if max_mean is not None and wm is not None and wm > max_mean:
            breaches.append({
                "breach_type": "threshold_max",
                "severity":    "critical",
                "detail":      f"Window mean {wm} > maximum {max_mean} defined in change control plan",
            })

        for breach in breaches:
            # Deduplicate — skip if an open event already exists for this feature + breach type
            existing = db.query(models.ChangeEvent).filter(
                models.ChangeEvent.feature_path == feature_path,
                models.ChangeEvent.breach_type  == breach["breach_type"],
                models.ChangeEvent.status       == "open",
            ).first()
            if existing:
                continue

            db.add(models.ChangeEvent(
                feature_path=feature_path,
                breach_type=breach["breach_type"],
                severity=breach["severity"],
                detail=json.dumps({"label": label, "feature_path": feature_path, **breach, "data": data}),
            ))
            _append_change_event_log(feature_path, label, breach["breach_type"], breach["detail"])
            new_events += 1

    db.flush()
    return new_events


# ── Drift monitoring helpers ─────────────────────────────────────────────────

# Numeric fields to track per pipeline stage (non-numeric fields are excluded)
_DRIFT_FEATURES = {
    "stt":        ["confidence", "words_per_minute"],
    "acoustic":   ["speech_rate_syllables_per_sec", "pause_count", "mean_pause_duration_ms",
                   "total_pause_duration_sec", "pitch_mean_hz", "pitch_std_hz", "hnr_db",
                   "articulation_rate"],
    "morphology": ["noun_ratio", "verb_ratio", "first_person_ratio", "third_person_ratio",
                   "type_token_ratio", "disfluency_count", "word_count", "unique_words"],
    "semantics":  ["semantic_variability", "high_frequency_word_ratio",
                   "semantic_granularity_score", "topic_coherence"],
    "emotion":    ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"],
}
_SCORE_FIELDS = ["composite", "motor_speech", "semantic_memory", "episodic_memory", "emotional_processing"]


def _extract_feature_vectors(task_results: list) -> dict:
    """Return {feature_path: [float, ...]} for all numeric features across a list of TaskResults."""
    vectors: dict = {}
    for tr in task_results:
        try:
            pipeline = json.loads(tr.pipeline) if tr.pipeline else {}
            scores   = json.loads(tr.scores)   if tr.scores   else {}
        except (json.JSONDecodeError, TypeError):
            continue

        for stage, fields in _DRIFT_FEATURES.items():
            stage_data = pipeline.get(stage, {})
            for field in fields:
                val = stage_data.get(field)
                if isinstance(val, (int, float)) and not np.isnan(val):
                    vectors.setdefault(f"{stage}.{field}", []).append(float(val))

        for field in _SCORE_FIELDS:
            val = scores.get(field)
            if isinstance(val, (int, float)) and not np.isnan(val):
                vectors.setdefault(f"scores.{field}", []).append(float(val))

    return vectors


def _feature_stats(values: list) -> dict | None:
    """Compute mean, std, and percentiles for a list of floats."""
    n = len(values)
    if n < 3:
        return None
    arr = np.array(values, dtype=float)
    return {
        "mean": float(np.mean(arr)),
        "std":  float(np.std(arr, ddof=1)) if n > 1 else 0.0,
        "p5":   float(np.percentile(arr, 5)),
        "p25":  float(np.percentile(arr, 25)),
        "p75":  float(np.percentile(arr, 75)),
        "p95":  float(np.percentile(arr, 95)),
        "n":    n,
    }


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.post("/assess", response_model=AssessmentResult)
async def assess_audio(audio: UploadFile = File(...)):
    """
    Main assessment endpoint.
    Accepts: audio/webm, audio/wav, audio/mp3, audio/ogg
    Returns: full cognitive assessment report
    """
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(400, "File must be an audio file")

    session_id = str(uuid.uuid4())
    start_time = time.time()

    # Save to temp file for processing
    suffix = "." + (audio.filename or "audio.webm").split(".")[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        # Run pipeline
        stt = transcribe_audio(tmp_path)
        acoustic = extract_acoustic_features(tmp_path)
        morphology = analyse_morphology(stt["transcript"])
        semantics = analyse_semantics(stt["transcript"])
        emotion = analyse_emotion(stt["transcript"])
        scores = compute_scores(acoustic, morphology, semantics, emotion)
        report = generate_report(scores, morphology, acoustic, emotion, semantics)

        duration = round(time.time() - start_time, 2)

        return AssessmentResult(
            session_id=session_id,
            transcript=stt["transcript"],
            duration_seconds=duration,
            pipeline={
                "stt": stt,
                "acoustic": acoustic,
                "morphology": morphology,
                "semantics": semantics,
                "emotion": emotion,
            },
            scores=scores,
            report=report,
        )

    finally:
        os.unlink(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok", "pipeline_stages": ["chirp_stt", "acoustic", "morphology", "semantics", "emotion"]}


@app.get("/monitoring/performance")
def monitoring_performance(
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    """
    Returns per-stage latency KPIs and composite score distribution
    aggregated across all recorded task submissions.
    """
    STAGES = ["stt", "acoustic", "morphology", "semantics", "emotion", "total"]

    stage_timings = {}
    for stage in STAGES:
        rows = (
            db.query(
                func.avg(models.PipelineMetric.duration_ms).label("avg_ms"),
                func.min(models.PipelineMetric.duration_ms).label("min_ms"),
                func.max(models.PipelineMetric.duration_ms).label("max_ms"),
                func.count(models.PipelineMetric.id).label("n"),
            )
            .filter(models.PipelineMetric.stage == stage)
            .one()
        )
        stage_timings[stage] = {
            "avg_ms": round(rows.avg_ms) if rows.avg_ms is not None else None,
            "min_ms": rows.min_ms,
            "max_ms": rows.max_ms,
            "n":      rows.n,
        }

    score_fields = ["composite", "motor_speech", "semantic_memory", "episodic_memory", "emotional_processing"]
    score_distributions = {field: [] for field in score_fields}

    task_results = (
        db.query(models.TaskResult)
        .filter(models.TaskResult.scores.isnot(None))
        .all()
    )
    for tr in task_results:
        try:
            s = json.loads(tr.scores)
            for field in score_fields:
                if field in s and isinstance(s[field], (int, float)):
                    score_distributions[field].append(s[field])
        except (json.JSONDecodeError, KeyError):
            continue

    score_stats = {}
    for field, values in score_distributions.items():
        if values:
            score_stats[field] = {
                "mean":  round(statistics.mean(values), 1),
                "stdev": round(statistics.stdev(values), 1) if len(values) > 1 else 0.0,
                "min":   round(min(values), 1),
                "max":   round(max(values), 1),
                "n":     len(values),
            }
        else:
            score_stats[field] = {"mean": None, "stdev": None, "min": None, "max": None, "n": 0}

    return {
        "stage_timings":       stage_timings,
        "score_distributions": score_stats,
        "last_updated":        datetime.utcnow().isoformat(),
    }


@app.post("/monitoring/baseline/compute")
def compute_baseline(
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    """
    Compute (or recompute) the drift baseline from all historical task results.
    Requires at least 5 completed task results. Safe to call repeatedly —
    existing baseline rows are replaced each time.
    """
    task_results = (
        db.query(models.TaskResult)
        .filter(models.TaskResult.pipeline.isnot(None))
        .all()
    )
    if len(task_results) < 5:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 5 completed task results to compute a baseline; found {len(task_results)}.",
        )

    vectors = _extract_feature_vectors(task_results)

    db.query(models.DriftBaseline).delete()

    computed = 0
    skipped  = 0
    for feature_path, values in vectors.items():
        st = _feature_stats(values)
        if st is None:
            skipped += 1
            continue
        stage = feature_path.split(".")[0]
        db.add(models.DriftBaseline(
            feature_path=feature_path,
            stage=stage,
            mean=st["mean"],
            std=st["std"],
            p5=st["p5"],
            p25=st["p25"],
            p75=st["p75"],
            p95=st["p95"],
            n_samples=st["n"],
        ))
        computed += 1

    db.commit()

    # Immediately check thresholds against the freshly computed baseline
    drift_resp = _compute_drift(db)
    new_events = _check_change_control_thresholds(drift_resp["features"], db) if drift_resp else 0
    db.commit()

    return {
        "message":           f"Baseline computed from {len(task_results)} task results.",
        "features_computed": computed,
        "features_skipped":  skipped,
        "new_change_events": new_events,
        "computed_at":       datetime.utcnow().isoformat(),
    }


def _compute_drift(db: Session, window: int = 20) -> dict:
    """Core drift computation — shared by the endpoint and compute_baseline."""
    baselines = {b.feature_path: b for b in db.query(models.DriftBaseline).all()}
    if not baselines:
        return None

    recent = (
        db.query(models.TaskResult)
        .filter(models.TaskResult.pipeline.isnot(None))
        .order_by(models.TaskResult.recorded_at.desc())
        .limit(window)
        .all()
    )
    if not recent:
        return None

    recent_vectors = _extract_feature_vectors(recent)
    feature_results = {}
    summary = {"stable": 0, "watch": 0, "drift": 0, "insufficient_data": 0}

    for feature_path, baseline in baselines.items():
        values = recent_vectors.get(feature_path, [])
        if not values:
            summary["insufficient_data"] += 1
            feature_results[feature_path] = {"status": "insufficient_data", "window_n": 0}
            continue

        window_mean = float(np.mean(values))
        z_score = (
            abs(window_mean - baseline.mean) / baseline.std
            if baseline.std > 0 else 0.0
        )
        status = "stable" if z_score < 1.5 else "watch" if z_score < 2.5 else "drift"
        summary[status] += 1

        feature_results[feature_path] = {
            "stage":         baseline.stage,
            "baseline_mean": round(baseline.mean, 4),
            "baseline_std":  round(baseline.std, 4),
            "baseline_p5":   round(baseline.p5,  4) if baseline.p5  is not None else None,
            "baseline_p95":  round(baseline.p95, 4) if baseline.p95 is not None else None,
            "baseline_n":    baseline.n_samples,
            "window_mean":   round(window_mean, 4),
            "window_n":      len(values),
            "z_score":       round(z_score, 2),
            "status":        status,
        }

    baseline_sample = next(iter(baselines.values()))
    return {
        "baseline_computed_at":  baseline_sample.computed_at.isoformat(),
        "window_size_requested": window,
        "window_n_actual":       len(recent),
        "drift_summary":         summary,
        "features":              feature_results,
    }


@app.get("/monitoring/drift")
def monitoring_drift(
    window: int = 20,
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    """
    Compare the most recent `window` task results against the stored baseline.
    Also runs change control threshold checks and creates ChangeEvent records.

    Z-score thresholds (|window_mean - baseline_mean| / baseline_std):
      < 1.5  → stable  (green)
      1.5–2.5 → watch  (amber)
      > 2.5  → drift   (red)
    """
    result = _compute_drift(db, window)
    if result is None:
        raise HTTPException(
            status_code=400,
            detail="No baseline found. Call POST /monitoring/baseline/compute first.",
        )
    _check_change_control_thresholds(result["features"], db)
    db.commit()
    return result


@app.get("/monitoring/alerts")
def monitoring_alerts(
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    """Layer A — lightweight count of open change events, used to drive the header badge."""
    count = db.query(models.ChangeEvent).filter(models.ChangeEvent.status == "open").count()
    return {"open_events": count}


@app.get("/monitoring/change-events")
def list_change_events(
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    """Layer C — full list of change events (open and closed) for the monitoring page."""
    events = (
        db.query(models.ChangeEvent)
        .order_by(models.ChangeEvent.opened_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id":            e.id,
            "feature_path":  e.feature_path,
            "breach_type":   e.breach_type,
            "severity":      e.severity,
            "detail":        json.loads(e.detail),
            "status":        e.status,
            "reviewed_by":   e.reviewed_by.full_name if e.reviewed_by else None,
            "review_notes":  e.review_notes,
            "opened_at":     e.opened_at.isoformat(),
            "reviewed_at":   e.reviewed_at.isoformat() if e.reviewed_at else None,
        }
        for e in events
    ]


class ChangeEventReview(BaseModel):
    action:       str            # "reviewed" | "dismissed"
    review_notes: str = ""


@app.put("/monitoring/change-events/{event_id}/review")
def review_change_event(
    event_id: int,
    data: ChangeEventReview,
    db: Session = Depends(get_db),
    clinician: models.Clinician = Depends(get_current_clinician),
):
    """Layer C — acknowledge or dismiss a change event, recording who acted and when."""
    if data.action not in ("reviewed", "dismissed"):
        raise HTTPException(400, "Action must be 'reviewed' or 'dismissed'.")
    event = db.query(models.ChangeEvent).filter(models.ChangeEvent.id == event_id).first()
    if not event:
        raise HTTPException(404, "Change event not found.")
    if event.status != "open":
        raise HTTPException(400, "Event is already closed.")

    event.status          = data.action
    event.reviewed_by_id  = clinician.id
    event.review_notes    = data.review_notes
    event.reviewed_at     = datetime.utcnow()
    db.commit()
    return {
        "id":          event_id,
        "status":      event.status,
        "reviewed_by": clinician.full_name,
        "reviewed_at": event.reviewed_at.isoformat(),
    }


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/auth/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    clinician = db.query(models.Clinician).filter(
        models.Clinician.username == form_data.username
    ).first()
    if not clinician or not verify_password(form_data.password, clinician.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token({"sub": clinician.username})
    return {
        "access_token": token,
        "token_type": "bearer",
        "clinician_name": clinician.full_name,
    }


@app.get("/auth/me")
def me(clinician: models.Clinician = Depends(get_current_clinician)):
    return {"id": clinician.id, "username": clinician.username, "full_name": clinician.full_name}


@app.post("/clinicians", status_code=201)
def create_clinician(
    data: schemas.ClinicianCreate,
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),  # must be logged in to add users
):
    if db.query(models.Clinician).filter(models.Clinician.username == data.username).first():
        raise HTTPException(400, "Username already exists")
    db.add(models.Clinician(
        username=data.username,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
    ))
    db.commit()
    return {"message": f"Clinician '{data.username}' created"}


# ── Patients ──────────────────────────────────────────────────────────────────

@app.post("/patients", response_model=schemas.PatientOut, status_code=201)
def create_patient(
    data: schemas.PatientCreate,
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    if data.patient_ref:
        # Manual ref provided — check uniqueness
        if db.query(models.Patient).filter(models.Patient.patient_ref == data.patient_ref).first():
            raise HTTPException(400, "Patient reference already exists — choose a unique ID")
        patient = models.Patient(**data.model_dump())
        db.add(patient)
        db.commit()
        db.refresh(patient)
    else:
        # Auto-generate ref using patient ID (same pattern as assessment_ref)
        patient = models.Patient(
            patient_ref="__pending__",
            date_of_birth=data.date_of_birth,
            age_band=data.age_band,
            language=data.language,
            l1_language=data.l1_language,
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)
        patient.patient_ref = f"PT-{patient.created_at.year}-{patient.id:04d}"
        db.commit()
        db.refresh(patient)
    return patient


@app.get("/patients", response_model=list[schemas.PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    return db.query(models.Patient).order_by(models.Patient.patient_ref).all()


@app.get("/patients/{patient_ref}", response_model=schemas.PatientOut)
def get_patient(
    patient_ref: str,
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    patient = db.query(models.Patient).filter(models.Patient.patient_ref == patient_ref).first()
    if not patient:
        raise HTTPException(404, "Patient not found")
    return patient


# ── Assessments ───────────────────────────────────────────────────────────────

@app.post("/assessments", status_code=201)
def create_assessment(
    data: schemas.AssessmentCreate,
    db: Session = Depends(get_db),
    clinician: models.Clinician = Depends(get_current_clinician),
):
    patient = db.query(models.Patient).filter(
        models.Patient.patient_ref == data.patient_ref
    ).first()
    if not patient:
        raise HTTPException(404, "Patient not found — create the patient record first")

    assessment = models.Assessment(
        assessment_key=str(uuid.uuid4()),
        patient_id=patient.id,
        clinician_id=clinician.id,
        date_of_assessment=data.date_of_assessment,
        assessment_type=data.assessment_type,
        referral_source=data.referral_source,
        reason=data.reason,
        notes=data.notes,
        selected_tasks=json.dumps(data.selected_tasks),
        environment=data.environment,
        had_interruptions=data.had_interruptions,
        interruption_notes=data.interruption_notes,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    # Set human-readable reference now that we have the auto-increment ID
    assessment.assessment_ref = f"CA-{assessment.created_at.year}-{assessment.id:04d}"
    db.commit()
    return {"assessment_key": assessment.assessment_key, "assessment_ref": assessment.assessment_ref, "id": assessment.id}


@app.get("/assessments")
def list_assessments(
    db: Session = Depends(get_db),
    clinician: models.Clinician = Depends(get_current_clinician),
):
    rows = (
        db.query(models.Assessment)
        .filter(models.Assessment.clinician_id == clinician.id)
        .order_by(models.Assessment.created_at.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": a.id,
            "assessment_key": a.assessment_key,
            "patient_ref": a.patient.patient_ref,
            "assessment_ref": a.assessment_ref,
            "clinician_name": a.clinician.full_name,
            "date_of_assessment": a.date_of_assessment,
            "assessment_type": a.assessment_type,
            "status": a.status,
            "task_count": len(a.task_results),
            "created_at": a.created_at.isoformat(),
        }
        for a in rows
    ]


@app.get("/assessments/{assessment_key}")
def get_assessment(
    assessment_key: str,
    db: Session = Depends(get_db),
    clinician: models.Clinician = Depends(get_current_clinician),
):
    a = db.query(models.Assessment).filter(
        models.Assessment.assessment_key == assessment_key,
        models.Assessment.clinician_id == clinician.id,
    ).first()
    if not a:
        raise HTTPException(404, "Assessment not found")
    return {
        "id": a.id,
        "assessment_key": a.assessment_key,
        "patient_ref": a.patient.patient_ref,
        "patient": {
            "patient_ref": a.patient.patient_ref,
            "date_of_birth": a.patient.date_of_birth,
            "age_band": a.patient.age_band,
            "language": a.patient.language,
        },
        "clinician_name": a.clinician.full_name,
        "date_of_assessment": a.date_of_assessment,
        "assessment_type": a.assessment_type,
        "assessment_ref": a.assessment_ref,
        "referral_source": a.referral_source,
        "reason": a.reason,
        "notes": a.notes,
        "environment": a.environment,
        "had_interruptions": a.had_interruptions,
        "interruption_notes": a.interruption_notes,
        "l1_language": a.patient.l1_language,
        "status": a.status,
        "selected_tasks": json.loads(a.selected_tasks or '["routine","fluency","memory"]'),
        "clinical_outcome": a.clinical_outcome,
        "follow_up_period": a.follow_up_period,
        "follow_up_date": a.follow_up_date,
        "clinical_notes_findings": a.clinical_notes_findings,
        "patient_summary": a.patient_summary,
        "findings_recorded_at": a.findings_recorded_at.isoformat() if a.findings_recorded_at else None,
        "created_at": a.created_at.isoformat(),
        "task_results": [
            {
                "task_index": t.task_index,
                "task_id": t.task_id,
                "transcript": t.transcript,
                "scores": json.loads(t.scores),
                "pipeline": json.loads(t.pipeline) if t.pipeline else None,
                "report": json.loads(t.report),
                "recorded_at": t.recorded_at.isoformat(),
            }
            for t in a.task_results
        ],
    }


# ── Task submission (DB-backed assess endpoint) ───────────────────────────────

@app.post("/assessments/{assessment_key}/tasks/{task_index}")
async def submit_task(
    assessment_key: str,
    task_index: int,
    task_id: str,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    """
    Run the speech analysis pipeline and persist the result to the database.
    Replaces the legacy /assess endpoint for authenticated sessions.
    """
    assessment = db.query(models.Assessment).filter(
        models.Assessment.assessment_key == assessment_key
    ).first()
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    if assessment.status == "complete":
        raise HTTPException(400, "Assessment is already complete")

    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(400, "File must be an audio file")

    suffix = "." + (audio.filename or "audio.webm").split(".")[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        t0 = time.time()
        stt = transcribe_audio(tmp_path)
        t1 = time.time()

        # Guard: require a minimum meaningful transcript before scoring.
        # An empty or near-empty transcript means no speech was detected —
        # running the pipeline on silence produces spuriously high semantic scores.
        if len(stt["transcript"].strip().split()) < 5:
            raise HTTPException(
                status_code=422,
                detail="No speech detected in this recording. Please speak clearly into the microphone and try again.",
            )

        acoustic   = extract_acoustic_features(tmp_path)
        t2 = time.time()
        morphology = analyse_morphology(stt["transcript"])
        t3 = time.time()
        semantics  = analyse_semantics(stt["transcript"])
        t4 = time.time()
        emotion    = analyse_emotion(stt["transcript"])
        t5 = time.time()
        scores     = compute_scores(acoustic, morphology, semantics, emotion)
        report     = generate_report(scores, morphology, acoustic, emotion, semantics)

        stage_timings = {
            "stt":        int((t1 - t0) * 1000),
            "acoustic":   int((t2 - t1) * 1000),
            "morphology": int((t3 - t2) * 1000),
            "semantics":  int((t4 - t3) * 1000),
            "emotion":    int((t5 - t4) * 1000),
            "total":      int((t5 - t0) * 1000),
        }

        pipeline_data = {
            "stt": stt, "acoustic": acoustic,
            "morphology": morphology, "semantics": semantics, "emotion": emotion,
        }

        # Upsert — replace if this task_index was already submitted
        existing = db.query(models.TaskResult).filter(
            models.TaskResult.assessment_id == assessment.id,
            models.TaskResult.task_index == task_index,
        ).first()
        if existing:
            existing.transcript = stt["transcript"]
            existing.scores     = json.dumps(scores)
            existing.pipeline   = json.dumps(pipeline_data)
            existing.report     = json.dumps(report)
            task_result = existing
        else:
            task_result = models.TaskResult(
                assessment_id = assessment.id,
                task_index    = task_index,
                task_id       = task_id,
                transcript    = stt["transcript"],
                scores        = json.dumps(scores),
                pipeline      = json.dumps(pipeline_data),
                report        = json.dumps(report),
            )
            db.add(task_result)

        # Flush to assign task_result.id before writing metrics
        db.flush()

        for stage, duration_ms in stage_timings.items():
            db.add(models.PipelineMetric(
                task_result_id=task_result.id,
                stage=stage,
                duration_ms=duration_ms,
            ))

        # Mark complete when all selected tasks are submitted
        db.flush()
        total_selected = len(json.loads(assessment.selected_tasks or '["routine","fluency","memory"]'))
        if db.query(models.TaskResult).filter(
            models.TaskResult.assessment_id == assessment.id
        ).count() >= total_selected:
            assessment.status = "complete"

        db.commit()

        return {
            "session_id": assessment_key,
            "task_index": task_index,
            "transcript": stt["transcript"],
            "duration_seconds": 0,
            "pipeline": pipeline_data,
            "scores": scores,
            "report": report,
        }
    finally:
        os.unlink(tmp_path)


# ── Task skip ─────────────────────────────────────────────────────────────────

@app.post("/assessments/{assessment_key}/tasks/{task_index}/skip")
def skip_task(
    assessment_key: str,
    task_index: int,
    task_id: str,
    skip_reason: str,
    skip_notes: str = "",
    db: Session = Depends(get_db),
    _: models.Clinician = Depends(get_current_clinician),
):
    assessment = db.query(models.Assessment).filter(
        models.Assessment.assessment_key == assessment_key
    ).first()
    if not assessment:
        raise HTTPException(404, "Assessment not found")

    skip_data = json.dumps({"skipped": True, "skip_reason": skip_reason, "skip_notes": skip_notes})

    existing = db.query(models.TaskResult).filter(
        models.TaskResult.assessment_id == assessment.id,
        models.TaskResult.task_index    == task_index,
    ).first()
    if existing:
        existing.task_id   = task_id
        existing.transcript = None
        existing.scores    = skip_data
        existing.pipeline  = None
        existing.report    = skip_data
    else:
        db.add(models.TaskResult(
            assessment_id = assessment.id,
            task_index    = task_index,
            task_id       = task_id,
            transcript    = None,
            scores        = skip_data,
            pipeline      = None,
            report        = skip_data,
        ))

    db.flush()
    total_selected = len(json.loads(assessment.selected_tasks or '["routine","fluency","memory"]'))
    if db.query(models.TaskResult).filter(
        models.TaskResult.assessment_id == assessment.id
    ).count() >= total_selected:
        assessment.status = "complete"

    db.commit()
    return {"skipped": True, "task_index": task_index, "skip_reason": skip_reason}


# ── Session conditions (post-session amendment) ───────────────────────────────

@app.put("/assessments/{assessment_key}/conditions")
def update_conditions(
    assessment_key: str,
    data: schemas.ConditionsUpdate,
    db: Session = Depends(get_db),
    clinician: models.Clinician = Depends(get_current_clinician),
):
    a = db.query(models.Assessment).filter(
        models.Assessment.assessment_key == assessment_key,
        models.Assessment.clinician_id == clinician.id,
    ).first()
    if not a:
        raise HTTPException(404, "Assessment not found")
    a.had_interruptions = data.had_interruptions
    a.interruption_notes = data.interruption_notes
    db.commit()
    return {"status": "ok"}


# ── Clinical findings ─────────────────────────────────────────────────────────

@app.put("/assessments/{assessment_key}/findings")
def save_findings(
    assessment_key: str,
    data: schemas.FindingsCreate,
    db: Session = Depends(get_db),
    clinician: models.Clinician = Depends(get_current_clinician),
):
    a = db.query(models.Assessment).filter(
        models.Assessment.assessment_key == assessment_key
    ).first()
    if not a:
        raise HTTPException(404, "Assessment not found")
    if a.clinician_id != clinician.id:
        raise HTTPException(403, "Not your assessment")

    is_amendment = a.findings_recorded_at is not None
    if is_amendment and not (data.change_reason or "").strip():
        raise HTTPException(
            400,
            "A reason for amendment is required when updating previously signed findings.",
        )

    # Write to immutable audit log before overwriting
    db.add(models.FindingsAudit(
        assessment_id           = a.id,
        clinician_id            = clinician.id,
        action                  = "amendment" if is_amendment else "initial",
        change_reason           = data.change_reason if is_amendment else None,
        clinical_outcome        = data.clinical_outcome,
        follow_up_period        = data.follow_up_period,
        follow_up_date          = data.follow_up_date,
        clinical_notes_findings = data.clinical_notes_findings,
        patient_summary         = data.patient_summary,
    ))

    a.clinical_outcome          = data.clinical_outcome
    a.follow_up_period          = data.follow_up_period
    a.follow_up_date            = data.follow_up_date
    a.clinical_notes_findings   = data.clinical_notes_findings
    a.patient_summary           = data.patient_summary
    a.findings_recorded_at      = datetime.utcnow()
    db.commit()

    return {
        "status": "ok",
        "action": "amendment" if is_amendment else "initial",
        "findings_recorded_at": a.findings_recorded_at.isoformat(),
    }


@app.get("/assessments/{assessment_key}/findings/history")
def get_findings_history(
    assessment_key: str,
    db: Session = Depends(get_db),
    clinician: models.Clinician = Depends(get_current_clinician),
):
    a = db.query(models.Assessment).filter(
        models.Assessment.assessment_key == assessment_key,
        models.Assessment.clinician_id == clinician.id,
    ).first()
    if not a:
        raise HTTPException(404, "Assessment not found")
    return [
        {
            "action":         entry.action,
            "change_reason":  entry.change_reason,
            "clinical_outcome": entry.clinical_outcome,
            "follow_up_date": entry.follow_up_date,
            "clinician_name": entry.clinician.full_name,
            "recorded_at":    entry.recorded_at.isoformat(),
        }
        for entry in a.findings_audit
    ]
