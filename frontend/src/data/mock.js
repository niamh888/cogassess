export const MOCK_RESULT = {
  session_id: "a3f8b1c2-demo",
  transcript: "I usually wake up around seven in the morning and then I make breakfast. Sometimes I forget where I put my keys. Yesterday I went to the... the place where you buy things. The shop. I had a good day.",
  duration_seconds: 2.1,
  pipeline: {
    stt: { transcript: "...", words_per_minute: 112, confidence: 0.94, model: "chirp" },
    acoustic: { articulation_rate: 3.8, pause_count: 4, mean_pause_duration_ms: 820, hnr_db: 18.6 },
    morphology: { noun_ratio: 0.31, verb_ratio: 0.22, first_person_ratio: 0.71, disfluency_count: 2, type_token_ratio: 0.61, unique_words: 68, word_count: 112 },
    semantics: { semantic_variability: 0.18, high_frequency_word_ratio: 0.44, semantic_granularity_score: 0.61, topic_coherence: 0.73 },
    emotion: { joy: 0.31, sadness: 0.18, anger: 0.04, fear: 0.09, disgust: 0.03, surprise: 0.07, neutral: 0.28, dominant_emotion: "joy", valence: "positive" },
  },
  scores: { motor_speech: 62, semantic_memory: 58, episodic_memory: 71, emotional_processing: 83, composite: 69 },
  report: {
    overall_risk: "moderate",
    flags: [
      { label: "Borderline semantic memory", severity: "note", detail: "Semantic memory score is 58 — within the moderate range. Free narrative tasks tend to score lower than structured fluency tasks. Interpret alongside the episodic memory score." },
      { label: "Natural speech hesitation", severity: "note", detail: "2 hesitations (uh, um, er) were detected. This is within the normal range for spontaneous conversational speech and is not clinically significant in isolation." },
    ],
    recommendations: ["Administer formal semantic fluency task", "Monitor for anomia progression"],
    note: "This output is indicative only and requires clinical validation. Not for use as standalone diagnostic tool.",
  },
};
