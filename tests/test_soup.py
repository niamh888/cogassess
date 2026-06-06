"""
test_soup.py — SOUP (Software of Unknown Provenance) verification tests.

Test cases:
  TC-SOUP-001: Safety-relevant SOUP packages have exact version pins in requirements.txt
  TC-SOUP-002: Safety-relevant SOUP packages are installed and importable
  TC-SOUP-003: pip audit reports no HIGH or CRITICAL CVEs in installed packages
"""

import importlib.metadata
import os
import re
import subprocess
import sys

import pytest

# ── Paths ─────────────────────────────────────────────────────────────────────

_PROJECT_ROOT    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_REQUIREMENTS    = os.path.join(_PROJECT_ROOT, "requirements.txt")

# ── SOUP registry — derived from CA-SOUP-001 ─────────────────────────────────
#
# Each entry: (pip-name, safety-classification, must-be-exact-pin)
# must-be-exact-pin = True means the package MUST use == in requirements.txt
# per the CA-SOUP-001 version pinning policy.

_SAFETY_RELEVANT_SOUP = [
    ("fastapi",                 "safety-relevant",   True),
    ("sqlalchemy",              "safety-relevant",   True),
    ("passlib",                 "security-relevant", True),
    ("bcrypt",                  "security-relevant", True),
    ("python-jose",             "security-relevant", True),
    ("google-cloud-speech",     "safety-relevant",   True),
    ("librosa",                 "safety-relevant",   True),
    ("soundfile",               "safety-relevant",   True),
    ("spacy",                   "safety-relevant",   True),
    ("sentence-transformers",   "safety-relevant",   True),
    ("transformers",            "safety-relevant",   True),
]

# Packages that pip-importlib names differently from their pip install name
_PIP_TO_IMPORTLIB = {
    "python-jose":           "python_jose",
    "google-cloud-speech":   "google_cloud_speech",
    "sentence-transformers": "sentence_transformers",
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _parse_requirements() -> dict[str, str]:
    """
    Parse requirements.txt and return {normalised-package-name: version-spec}.
    Comments and blank lines are ignored. Package names are lowercased and
    hyphens/underscores normalised to hyphens.
    """
    specs: dict[str, str] = {}
    if not os.path.exists(_REQUIREMENTS):
        return specs

    with open(_REQUIREMENTS, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # Strip extras like passlib[bcrypt] → passlib
            line_no_extras = re.sub(r"\[.*?\]", "", line)
            # Match: name<op>version or name (no version)
            m = re.match(r"^([A-Za-z0-9_\-]+)\s*([><=!~].+)?$", line_no_extras)
            if m:
                name = m.group(1).lower().replace("_", "-")
                spec = (m.group(2) or "").strip()
                specs[name] = spec
    return specs


def _is_exact_pin(spec: str) -> bool:
    """Return True if the version spec is an exact pin (starts with ==)."""
    return spec.startswith("==")


# ─────────────────────────────────────────────────────────────────────────────
# TC-SOUP-001
# ─────────────────────────────────────────────────────────────────────────────

def test_soup_packages_have_exact_version_pins():
    """
    TC-SOUP-001: Safety-relevant SOUP packages have exact version pins in requirements.txt.

    Per CA-SOUP-001 Section 6.2 (Version Pinning):
    'All safety-relevant and security-relevant SOUP components shall have their
    versions explicitly pinned in requirements.txt using == notation.'

    This test:
      1. Parses requirements.txt
      2. Verifies each of the 11 safety/security-relevant SOUP packages is present
      3. Verifies each uses an exact == pin, not a floating >= or ~= spec
    """
    assert os.path.exists(_REQUIREMENTS), (
        f"requirements.txt not found at {_REQUIREMENTS}"
    )

    specs = _parse_requirements()
    unpinned = []
    missing  = []

    for pkg, classification, must_pin in _SAFETY_RELEVANT_SOUP:
        normalised = pkg.lower().replace("_", "-")
        if normalised not in specs:
            missing.append(f"{pkg} ({classification}) — not found in requirements.txt")
        elif must_pin and not _is_exact_pin(specs[normalised]):
            unpinned.append(
                f"{pkg} ({classification}) — spec is '{specs[normalised]}', "
                f"must be an exact == pin per CA-SOUP-001 §6.2"
            )

    failures = []
    if missing:
        failures.append("Missing packages:\n  " + "\n  ".join(missing))
    if unpinned:
        failures.append("Unpinned packages:\n  " + "\n  ".join(unpinned))

    assert not failures, (
        "TC-SOUP-001 FAILED — version pinning violations found:\n\n"
        + "\n\n".join(failures)
        + "\n\nRemediation: update requirements.txt to use == for all "
          "safety-relevant and security-relevant SOUP components."
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-SOUP-002
# ─────────────────────────────────────────────────────────────────────────────

def test_soup_packages_are_installed():
    """
    TC-SOUP-002: Safety-relevant SOUP packages are installed in the current environment.

    Uses importlib.metadata to check installed package versions — this queries
    the package registry directly and is not affected by sys.modules mocking in
    conftest.py. Verifies that each of the 11 safety/security-relevant SOUP
    packages is present and returns a non-empty version string.

    Note: GCP Chirp, spaCy NLP model (en_core_web_sm), and the HuggingFace
    model weights are runtime downloads, not pip packages — they are not checked
    here. AI model version pinning is verified in TC-SOUP-001 via requirements.txt.
    """
    not_installed = []

    for pkg, classification, _ in _SAFETY_RELEVANT_SOUP:
        # Resolve the importlib.metadata package name
        meta_name = _PIP_TO_IMPORTLIB.get(pkg, pkg.lower().replace("-", "_"))
        # Also try hyphenated form
        try:
            version = importlib.metadata.version(meta_name)
        except importlib.metadata.PackageNotFoundError:
            try:
                version = importlib.metadata.version(pkg)
            except importlib.metadata.PackageNotFoundError:
                not_installed.append(
                    f"{pkg} ({classification}) — not installed "
                    f"(tried: '{meta_name}', '{pkg}')"
                )
                continue

        assert version, (
            f"{pkg} ({classification}) is installed but returned empty version"
        )

    assert not not_installed, (
        "TC-SOUP-002 FAILED — the following safety-relevant SOUP packages "
        "are not installed in the current environment:\n\n  "
        + "\n  ".join(not_installed)
        + "\n\nRemediation: run 'pip install -r requirements.txt' to install "
          "all required dependencies."
    )


# ─────────────────────────────────────────────────────────────────────────────
# TC-SOUP-003
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.skip(
    reason="Requires pip-audit to be installed — run 'pip install pip-audit' "
           "and remove this skip. pip-audit performs CVE scanning against all "
           "installed packages and reports HIGH and CRITICAL findings. "
           "This test is part of the annual SOUP CVE review required by CA-SOUP-001 §6.1."
)
def test_no_critical_cves_in_soup_packages():
    """
    TC-SOUP-003: pip audit reports no HIGH or CRITICAL CVEs in installed packages.

    Runs 'pip audit --json' and parses the output to check for vulnerabilities
    with severity HIGH or CRITICAL. Any such finding causes this test to fail,
    and a finding entry is written to the anomaly log by run_tests.py.

    Per CA-SOUP-001 Section 4 (Anomaly List Review Process), CVE review must be
    conducted at least annually and on any triggered event (new CVE disclosed).

    PREREQUISITE: pip-audit must be installed ('pip install pip-audit').
    Remove @pytest.mark.skip once pip-audit is available in the environment.
    """
    import json

    result = subprocess.run(
        [sys.executable, "-m", "pip_audit", "--json", "--progress-spinner=off"],
        capture_output=True,
        text=True,
        cwd=_PROJECT_ROOT,
    )

    # pip-audit exits non-zero when vulnerabilities are found;
    # we parse the JSON ourselves to distinguish critical from minor findings
    try:
        audit_data = json.loads(result.stdout)
    except json.JSONDecodeError:
        pytest.fail(
            f"TC-SOUP-003: pip-audit output could not be parsed as JSON.\n"
            f"stdout: {result.stdout[:500]}\n"
            f"stderr: {result.stderr[:500]}"
        )

    critical_findings = []
    # pip-audit JSON format: list of {"name": ..., "version": ..., "vulns": [...]}
    for package in audit_data:
        for vuln in package.get("vulns", []):
            severity = (vuln.get("fix_versions") and "HIGH") or "UNKNOWN"
            # pip-audit doesn't always include severity; check aliases for CVE IDs
            aliases = vuln.get("aliases", [])
            description = vuln.get("description", "")
            vuln_id = vuln.get("id", "UNKNOWN")
            critical_findings.append(
                f"  [{vuln_id}] {package['name']} {package['version']} — "
                f"{description[:120]}"
            )

    assert not critical_findings, (
        f"TC-SOUP-003 FAILED — {len(critical_findings)} CVE finding(s) detected "
        f"in installed SOUP packages:\n\n"
        + "\n".join(critical_findings)
        + "\n\nRemediation: review each CVE against CA-SOUP-001, update affected "
          "packages in requirements.txt, and re-run SOUP evaluation."
    )
