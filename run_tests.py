"""
run_tests.py — Programmatic test runner for CogAssess.

Runs the full pytest suite, extracts test-case IDs from docstrings, and writes:
  - logs/test_log_YYYYMMDD-HHMMSS.md   (per-run test results table)
  - logs/anomaly_log.md                (persistent failure log, appended on each run)

Exit code: 0 if all tests passed, 1 if any failed.
"""

from __future__ import annotations

import os
import re
import sys
import json
from datetime import datetime

import pytest


# ─────────────────────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────────────────────

LOGS_DIR      = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
ANOMALY_LOG   = os.path.join(LOGS_DIR, "anomaly_log.md")
TC_ID_PATTERN = re.compile(r"TC-[A-Z]+-\d+")


# ─────────────────────────────────────────────────────────────────────────────
# Result data class
# ─────────────────────────────────────────────────────────────────────────────

class TestResult:
    """Holds all data collected for a single test item."""

    def __init__(
        self,
        nodeid: str,
        func_name: str,
        tc_id: str,
        status: str,          # "PASS" | "FAIL" | "SKIP"
        duration_ms: float,
        error: str | None,
    ):
        self.nodeid      = nodeid
        self.func_name   = func_name
        self.tc_id       = tc_id
        self.status      = status
        self.duration_ms = duration_ms
        self.error       = error


# ─────────────────────────────────────────────────────────────────────────────
# Custom pytest plugin
# ─────────────────────────────────────────────────────────────────────────────

class _CogAssessPlugin:
    """
    Pytest plugin that captures test results for post-run log writing.

    Hooks used:
      pytest_runtest_logreport — called once per phase (setup/call/teardown).
        We only record the 'call' phase (the test body itself).
      pytest_runtest_makereport — to capture the duration of the call phase.
    """

    def __init__(self):
        self.results: list[TestResult] = []
        # Keyed by nodeid — stores the call-phase report while we look up docstrings
        self._call_reports: dict[str, object] = {}

    # ------------------------------------------------------------------
    def pytest_runtest_logreport(self, report):
        """Collect call-phase reports only."""
        if report.when != "call":
            return

        # Duration comes from the report; convert to milliseconds
        duration_ms = round((report.duration or 0.0) * 1000, 1)

        # Derive a clean function name from the nodeid
        # nodeid format: tests/test_auth.py::test_unauthenticated_...
        nodeid    = report.nodeid
        func_name = nodeid.split("::")[-1]

        # Extract TC-ID from the test function's docstring
        tc_id = self._extract_tc_id(report)

        if report.passed:
            status = "PASS"
            error  = None
        elif report.skipped:
            status = "SKIP"
            error  = None
        else:
            status = "FAIL"
            error  = self._extract_error(report)

        self.results.append(
            TestResult(
                nodeid=nodeid,
                func_name=func_name,
                tc_id=tc_id,
                status=status,
                duration_ms=duration_ms,
                error=error,
            )
        )

    # ------------------------------------------------------------------
    @staticmethod
    def _extract_tc_id(report) -> str:
        """
        Pull the TC-XXXX-NNN identifier out of the test function's docstring.
        Returns 'N/A' if none found.
        """
        try:
            # report.nodeid: "tests/test_auth.py::test_something"
            # We need the actual test function object to read its __doc__
            # pytest stores it on report as `report.fspath` + the test callable
            # The safest cross-version way is via report.nodeid + sys.modules lookup
            node = report.nodeid
            # Try to find the module and function
            parts   = node.split("::")
            if len(parts) >= 2:
                module_path = parts[0]          # e.g. "tests/test_auth.py"
                func_name   = parts[-1]         # e.g. "test_something"

                # Convert file path to module name
                module_name = (
                    module_path
                    .replace(os.sep, ".")
                    .replace("/", ".")
                    .removesuffix(".py")
                )
                mod = sys.modules.get(module_name)
                if mod is not None:
                    fn = getattr(mod, func_name, None)
                    if fn is not None and fn.__doc__:
                        m = TC_ID_PATTERN.search(fn.__doc__)
                        if m:
                            return m.group(0)
        except Exception:
            pass
        return "N/A"

    # ------------------------------------------------------------------
    @staticmethod
    def _extract_error(report) -> str | None:
        """Return a one-line error string from a failed report's longrepr."""
        if not report.longrepr:
            return None
        try:
            # longrepr can be a string, a tuple, or a ReprExceptionInfo object
            text = str(report.longrepr)
            # Last non-empty line is usually the AssertionError message
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            if lines:
                return lines[-1][:300]   # cap at 300 chars
        except Exception:
            pass
        return "Unknown error"


# ─────────────────────────────────────────────────────────────────────────────
# Log writers
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_logs_dir():
    os.makedirs(LOGS_DIR, exist_ok=True)


def _write_test_log(run_id: str, run_dt: datetime, results: list[TestResult]) -> str:
    """Write the per-run test log and return its file path."""
    _ensure_logs_dir()

    total   = len(results)
    passed  = sum(1 for r in results if r.status == "PASS")
    failed  = sum(1 for r in results if r.status == "FAIL")
    skipped = sum(1 for r in results if r.status == "SKIP")
    outcome = "PASS" if failed == 0 else "FAIL"

    date_str = run_dt.strftime("%d %B %Y %H:%M:%S")

    lines = [
        "# CogAssess Test Execution Log",
        "",
        f"**Run ID:** {run_id}  ",
        f"**Date:** {date_str}  ",
        f"**Total:** {total} | **Passed:** {passed} | **Failed:** {failed} | **Skipped:** {skipped}  ",
        f"**Outcome:** {outcome}",
        "",
        "---",
        "",
        "| Test Case ID | Test Name | Status | Duration (ms) |",
        "|---|---|---|---|",
    ]

    for r in results:
        if r.status == "PASS":
            status_cell = "✅ PASS"
        elif r.status == "FAIL":
            status_cell = "❌ FAIL"
        else:
            status_cell = "⏭ SKIP"

        lines.append(
            f"| {r.tc_id} | {r.func_name} | {status_cell} | {r.duration_ms} |"
        )

    log_filename = f"test_log_{run_dt.strftime('%Y%m%d-%H%M%S')}.md"
    log_path     = os.path.join(LOGS_DIR, log_filename)

    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    return log_path


def _count_existing_anomalies() -> int:
    """Return the number of ## ANO- entries already in the anomaly log."""
    if not os.path.exists(ANOMALY_LOG):
        return 0
    with open(ANOMALY_LOG, "r", encoding="utf-8") as f:
        content = f.read()
    return len(re.findall(r"^## ANO-", content, re.MULTILINE))


def _write_anomaly_log(
    run_id: str,
    run_dt: datetime,
    failures: list[TestResult],
):
    """Append failure entries to the persistent anomaly log."""
    _ensure_logs_dir()

    # Write header if file doesn't exist yet
    if not os.path.exists(ANOMALY_LOG):
        header = (
            "# CogAssess Anomaly Log\n\n"
            "_Automatically generated by run_tests.py. "
            "Each entry represents a test failure requiring investigation._\n"
            "_Reference: CA-SVP-001_\n\n"
            "---\n"
        )
        with open(ANOMALY_LOG, "w", encoding="utf-8") as f:
            f.write(header)

    existing_count = _count_existing_anomalies()
    run_dt_str     = run_dt.strftime("%Y-%m-%d %H:%M:%S")

    entries = []
    for i, failure in enumerate(failures, start=existing_count + 1):
        ano_id = f"ANO-{i:03d}"
        entries.append(
            f"## {ano_id} · {failure.tc_id} · {run_dt_str}\n"
            f"\n"
            f"| Field | Value |\n"
            f"|---|---|\n"
            f"| Run ID | {run_id} |\n"
            f"| Test function | {failure.func_name} |\n"
            f"| SVP reference | {failure.tc_id} |\n"
            f"| Error | {failure.error or 'No error detail captured'} |\n"
            f"| Status | Open |\n"
            f"\n"
            f"---\n"
        )

    with open(ANOMALY_LOG, "a", encoding="utf-8") as f:
        f.write("\n")
        f.write("\n".join(entries))


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    run_dt = datetime.now()
    run_id = f"TR-{run_dt.strftime('%Y%m%d-%H%M%S')}"

    plugin = _CogAssessPlugin()

    # Run pytest programmatically
    exit_code = pytest.main(
        [
            "tests/",       # test directory
            "-v",           # verbose output so docstrings appear in terminal
            "--tb=short",   # short tracebacks for readability
            "--no-header",
        ],
        plugins=[plugin],
    )

    results  = plugin.results
    failures = [r for r in results if r.status == "FAIL"]

    # Write logs
    log_path = _write_test_log(run_id, run_dt, results)
    if failures:
        _write_anomaly_log(run_id, run_dt, failures)

    # Console summary
    total   = len(results)
    passed  = sum(1 for r in results if r.status == "PASS")
    failed  = len(failures)
    skipped = sum(1 for r in results if r.status == "SKIP")

    print()
    print("=" * 60)
    print(f"CogAssess Test Run  |  {run_id}")
    print("=" * 60)
    print(f"  Total   : {total}")
    print(f"  Passed  : {passed}")
    print(f"  Failed  : {failed}")
    print(f"  Skipped : {skipped}")
    print(f"  Outcome : {'PASS' if failed == 0 else 'FAIL'}")
    print(f"\n  Test log   : {log_path}")
    if failures:
        print(f"  Anomaly log: {ANOMALY_LOG}")
        print("\n  Failed tests:")
        for f in failures:
            print(f"    - [{f.tc_id}] {f.func_name}")
    print("=" * 60)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
