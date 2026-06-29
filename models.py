from datetime import datetime
from sqlalchemy import Column, Float, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base


class Clinician(Base):
    __tablename__ = "clinicians"

    id            = Column(Integer, primary_key=True)
    username      = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name     = Column(String, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    assessments   = relationship("Assessment", back_populates="clinician")


class Patient(Base):
    __tablename__ = "patients"

    id          = Column(Integer, primary_key=True)
    patient_ref = Column(String, unique=True, nullable=False, index=True)
    date_of_birth = Column(String)
    age_band    = Column(String)
    language    = Column(String, default="en")   # assessment language
    l1_language = Column(String, default="English")  # patient's first language
    created_at  = Column(DateTime, default=datetime.utcnow)

    assessments = relationship("Assessment", back_populates="patient")


class Assessment(Base):
    __tablename__ = "assessments"

    id               = Column(Integer, primary_key=True)
    assessment_key   = Column(String, unique=True, nullable=False, index=True)
    assessment_ref   = Column(String, unique=True, index=True)   # human-readable e.g. CA-2026-0001
    patient_id       = Column(Integer, ForeignKey("patients.id"), nullable=False)
    clinician_id     = Column(Integer, ForeignKey("clinicians.id"), nullable=False)
    date_of_assessment = Column(String, nullable=False)
    assessment_type  = Column(String, default="initial")   # initial | repeat
    referral_source  = Column(String)
    reason           = Column(String)
    notes            = Column(String)
    status               = Column(String, default="in_progress")
    clinical_outcome_label = Column(String, nullable=True)   # "normal" | "mci" | "dementia" | "other"
    selected_tasks       = Column(Text, default='["routine","fluency","memory"]')
    environment          = Column(String, default="Quiet clinical room")
    had_interruptions    = Column(String, default="None")
    interruption_notes   = Column(String)
    # Clinical findings (recorded after results reviewed)
    clinical_outcome     = Column(String)
    follow_up_period     = Column(String)
    follow_up_date       = Column(String)
    clinical_notes_findings = Column(Text)   # internal only
    patient_summary      = Column(Text)      # patient-facing text
    findings_recorded_at = Column(DateTime)
    created_at           = Column(DateTime, default=datetime.utcnow)

    patient        = relationship("Patient", back_populates="assessments")
    clinician      = relationship("Clinician", back_populates="assessments")
    task_results   = relationship(
        "TaskResult", back_populates="assessment",
        order_by="TaskResult.task_index",
    )
    findings_audit = relationship(
        "FindingsAudit", back_populates="assessment",
        order_by="FindingsAudit.recorded_at",
    )


class FindingsAudit(Base):
    """Immutable audit log — one row per save of clinical findings."""
    __tablename__ = "findings_audit"

    id                      = Column(Integer, primary_key=True)
    assessment_id           = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    clinician_id            = Column(Integer, ForeignKey("clinicians.id"), nullable=False)
    action                  = Column(String, nullable=False)  # "initial" | "amendment"
    change_reason           = Column(Text, nullable=True)
    clinical_outcome        = Column(String, nullable=True)
    follow_up_period        = Column(String, nullable=True)
    follow_up_date          = Column(String, nullable=True)
    clinical_notes_findings = Column(Text, nullable=True)
    patient_summary         = Column(Text, nullable=True)
    recorded_at             = Column(DateTime, default=datetime.utcnow)

    assessment = relationship("Assessment", back_populates="findings_audit")
    clinician  = relationship("Clinician")


class TaskResult(Base):
    __tablename__ = "task_results"

    id            = Column(Integer, primary_key=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False)
    task_index    = Column(Integer, nullable=False)
    task_id       = Column(String, nullable=False)
    transcript    = Column(Text)
    scores        = Column(Text, nullable=False)   # JSON string
    pipeline      = Column(Text)                   # JSON string
    report        = Column(Text, nullable=False)   # JSON string
    recorded_at   = Column(DateTime, default=datetime.utcnow)

    assessment    = relationship("Assessment", back_populates="task_results")
    metrics       = relationship("PipelineMetric", back_populates="task_result",
                                 cascade="all, delete-orphan")


class PipelineMetric(Base):
    """Per-stage timing record written after every successful task submission."""
    __tablename__ = "pipeline_metrics"

    id             = Column(Integer, primary_key=True)
    task_result_id = Column(Integer, ForeignKey("task_results.id"), nullable=False)
    stage          = Column(String, nullable=False)  # stt | acoustic | morphology | semantics | emotion | total
    duration_ms    = Column(Integer, nullable=False)
    recorded_at    = Column(DateTime, default=datetime.utcnow)

    task_result    = relationship("TaskResult", back_populates="metrics")


class ChangeEvent(Base):
    """Records a threshold breach that requires formal change assessment review."""
    __tablename__ = "change_events"

    id               = Column(Integer, primary_key=True)
    feature_path     = Column(String, nullable=False)
    breach_type      = Column(String, nullable=False)  # "z_score" | "threshold_min" | "threshold_max"
    severity         = Column(String, nullable=False)  # "watch" | "critical"
    detail           = Column(Text, nullable=False)    # JSON: label, actual values, limits
    status           = Column(String, default="open")  # "open" | "reviewed" | "dismissed"
    reviewed_by_id   = Column(Integer, ForeignKey("clinicians.id"), nullable=True)
    review_notes     = Column(Text, nullable=True)
    opened_at        = Column(DateTime, default=datetime.utcnow)
    reviewed_at      = Column(DateTime, nullable=True)

    reviewed_by      = relationship("Clinician")


class DriftBaseline(Base):
    """Baseline feature statistics computed from historical task results.
    Recomputed on demand via POST /monitoring/baseline/compute."""
    __tablename__ = "drift_baselines"

    id               = Column(Integer, primary_key=True)
    feature_path     = Column(String, nullable=False, unique=True)
    stage            = Column(String, nullable=False)
    mean             = Column(Float, nullable=False)
    std              = Column(Float, nullable=False)
    p5               = Column(Float)
    p25              = Column(Float)
    p75              = Column(Float)
    p95              = Column(Float)
    skewness         = Column(Float)
    kurtosis_excess  = Column(Float)
    raw_values       = Column(Text)       # JSON float array — used for K-S test
    n_samples        = Column(Integer, nullable=False)
    computed_at      = Column(DateTime, default=datetime.utcnow)
