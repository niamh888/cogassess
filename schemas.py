from typing import Optional, List
from pydantic import BaseModel


# ── Auth ──────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str
    clinician_name: str


# ── Patients ──────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    patient_ref: str
    date_of_birth: Optional[str] = None
    age_band: Optional[str] = None
    language: str = "en"
    l1_language: str = "English"


class PatientOut(BaseModel):
    id: int
    patient_ref: str
    date_of_birth: Optional[str]
    age_band: Optional[str]
    language: str
    l1_language: str = "English"

    model_config = {"from_attributes": True}


# ── Assessments ───────────────────────────────────────────────────────────────

class AssessmentCreate(BaseModel):
    patient_ref: str
    date_of_assessment: str
    assessment_type: str = "initial"
    referral_source: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    selected_tasks: List[str] = ["routine", "fluency", "memory"]
    environment: str = "Quiet clinical room"
    had_interruptions: str = "None"
    interruption_notes: Optional[str] = None


class AssessmentOut(BaseModel):
    id: int
    assessment_key: str
    patient_ref: str
    clinician_name: str
    date_of_assessment: str
    assessment_type: str
    referral_source: Optional[str]
    reason: Optional[str]
    notes: Optional[str]
    status: str
    task_count: int

    model_config = {"from_attributes": True}


# ── Clinical findings ─────────────────────────────────────────────────────────

class FindingsCreate(BaseModel):
    clinical_outcome: str
    follow_up_period: Optional[str] = None
    follow_up_date: Optional[str] = None
    clinical_notes_findings: Optional[str] = None
    patient_summary: Optional[str] = None
    change_reason: Optional[str] = None  # required when amending existing signed findings


# ── Clinician management ──────────────────────────────────────────────────────

class ClinicianCreate(BaseModel):
    username: str
    password: str
    full_name: str
