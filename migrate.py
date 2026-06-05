"""
Database migration script — run once after updating models.

    python migrate.py

Safe to run on an existing database; skips columns that already exist.
"""
import sqlite3

DB_PATH = "cogassess.db"

MIGRATIONS = [
    # (table, column, definition)
    ("assessments", "selected_tasks",          'TEXT DEFAULT \'["routine","fluency","memory"]\''),
    ("assessments", "assessment_ref",          "TEXT"),
    ("assessments", "environment",             "TEXT DEFAULT 'Quiet clinical room'"),
    ("assessments", "had_interruptions",       "TEXT DEFAULT 'None'"),
    ("assessments", "interruption_notes",      "TEXT"),
    ("assessments", "clinical_outcome",        "TEXT"),
    ("assessments", "follow_up_period",        "TEXT"),
    ("assessments", "follow_up_date",          "TEXT"),
    ("assessments", "clinical_notes_findings", "TEXT"),
    ("assessments", "patient_summary",         "TEXT"),
    ("assessments", "findings_recorded_at",    "TEXT"),
    ("patients",    "l1_language",             "TEXT DEFAULT 'English'"),
]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

for table, column, definition in MIGRATIONS:
    cursor.execute(f"PRAGMA table_info({table})")
    existing = [row[1] for row in cursor.fetchall()]
    if column not in existing:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        conn.commit()
        print(f"  [OK] Added column '{column}' to '{table}'")
    else:
        print(f"  -- '{table}.{column}' already exists, skipped")

conn.close()
print("\nMigration complete.")
