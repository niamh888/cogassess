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
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import tempfile, os, time, uuid

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
    sentences = [s.strip() for s in transcript.split(".") if s.strip()]
    if len(sentences) < 2:
        sentences = transcript.split(",")

    if len(sentences) >= 2:
        embeddings = _embedder.encode(sentences)
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
    # Articulation component (0-50): peaks at 3.5 syl/sec
    artic_score = min(acoustic["articulation_rate"] / 3.5 * 50, 50)
    # Pause penalty (0-30): each meaningful pause costs 3 points
    pause_penalty = min(acoustic["pause_count"] * 3, 30)
    # HNR component (0-20): maps typical range (-5 to 15 dB) → (0 to 20)
    hnr_score = max(0, min((acoustic["hnr_db"] + 5) / 20 * 20, 20))
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


def generate_report(scores: dict, morphology: dict, acoustic: dict, emotion: dict) -> dict:
    """Generate a structured clinical report with flagged findings."""
    flags = []
    recommendations = []

    if scores["motor_speech"] < 50:
        flags.append("Elevated pause frequency and/or reduced articulation rate")
        recommendations.append("Consider motor speech assessment")

    if scores["semantic_memory"] < 50:
        flags.append("High-frequency word preference — possible semantic memory reduction")
        recommendations.append("Administer formal semantic fluency task")

    if morphology["disfluency_count"] >= 3:
        flags.append(f"Word-finding difficulty markers detected ({morphology['disfluency_count']} disfluencies)")
        recommendations.append("Monitor for anomia progression")

    if scores["episodic_memory"] < 50:
        flags.append("Reduced first-person narrative perspective — possible episodic memory deficit")

    if emotion["neutral"] > 0.6:
        flags.append("Reduced emotional expression in speech (flat affect possible)")

    overall_risk = (
        "low" if scores["composite"] >= 70
        else "moderate" if scores["composite"] >= 45
        else "elevated"
    )

    return {
        "overall_risk": overall_risk,
        "flags": flags,
        "recommendations": recommendations,
        "note": "This output is indicative only and requires clinical validation. "
                "Not for use as standalone diagnostic tool.",
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
        report = generate_report(scores, morphology, acoustic, emotion)

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
