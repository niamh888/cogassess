from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
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

    patient      = relationship("Patient", back_populates="assessments")
    clinician    = relationship("Clinician", back_populates="assessments")
    task_results = relationship(
        "TaskResult", back_populates="assessment",
        order_by="TaskResult.task_index",
    )


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
