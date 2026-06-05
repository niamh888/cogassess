"""
Cognitive Assessment Pipeline - FastAPI Backend
Commercial stack: Chirp STT | spaCy morphology | sentence-transformers embeddings
                 j-hartmann emotion | librosa acoustics
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import tempfile, os, time, uuid

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
    # STUB — replace with Chirp API call above
    return {
        "transcript": "I usually wake up around seven in the morning and then I make breakfast. "
                      "Sometimes I forget where I put my keys. Yesterday I went to the... "
                      "the place where you buy things. The shop. I had a good day.",
        "words_per_minute": 112,
        "confidence": 0.94,
        "model": "chirp"
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
    # STUB — replace with librosa/SpeechBrain calls above
    return {
        "speech_rate_syllables_per_sec": 3.8,
        "pause_count": 4,
        "mean_pause_duration_ms": 820,
        "total_pause_duration_sec": 3.3,
        "pitch_mean_hz": 187.4,
        "pitch_std_hz": 31.2,
        "hnr_db": 18.6,
        "articulation_rate": 4.1,
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
    # STUB — replace with spaCy calls above
    words = transcript.lower().split()
    return {
        "noun_ratio": 0.31,
        "verb_ratio": 0.22,
        "first_person_ratio": 0.71,
        "third_person_ratio": 0.08,
        "type_token_ratio": round(len(set(words)) / max(len(words), 1), 3),
        "disfluency_count": 2,
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
    # STUB — replace with sentence-transformers calls above
    return {
        "semantic_variability": 0.18,
        "high_frequency_word_ratio": 0.44,
        "semantic_granularity_score": 0.61,
        "topic_coherence": 0.73,
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
    # STUB — replace with transformers pipeline above
    return {
        "joy": 0.31,
        "sadness": 0.18,
        "anger": 0.04,
        "fear": 0.09,
        "disgust": 0.03,
        "surprise": 0.07,
        "neutral": 0.28,
        "dominant_emotion": "joy",
        "valence": "positive",
    }


def compute_scores(acoustic: dict, morphology: dict, semantics: dict, emotion: dict) -> dict:
    """
    Composite scoring across four cognitive domains.
    Scoring is indicative — requires clinical validation before deployment.
    Range: 0-100, higher = better preserved function.
    """

    # Motor speech score (0-100)
    # Penalise high pause count, low articulation, poor HNR
    pause_penalty = min(acoustic["pause_count"] * 8, 40)
    hnr_score = min(acoustic["hnr_db"] * 2.5, 50)
    motor_score = max(0, round(100 - pause_penalty + hnr_score - 50, 1))

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
    # Balanced emotional range, not flat neutral
    neutral_excess = max(0, emotion["neutral"] - 0.5) * 60
    emotional_score = round(max(0, 100 - neutral_excess * 100), 1)

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
