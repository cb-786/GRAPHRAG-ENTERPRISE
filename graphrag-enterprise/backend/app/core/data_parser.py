"""
NIC Data Parser — Iteration 3
==============================
Ingests nic_2008.csv and outputs a clean, standardised list of NICEntry dicts.

CSV hierarchy (all columns used):
    S.No.       row counter   — dropped
    Description activity text — cleaned
    Sub Class   5-digit code  — primary key, zero-padded to 5 chars
    Class       4-digit code  — zero-padded to 4 chars
    Group       3-digit code  — zero-padded to 3 chars (NOT used in CSV name "Group")
    Division    text label
    Section     text label

Pass condition:
    parse_nic_csv(path) returns a list of dicts with no errors.
"""
import re
import logging
from pathlib import Path

import pandas as pd

from app.models.nic_code import NICEntry, ParseResult

logger = logging.getLogger(__name__)

# ── helpers ───────────────────────────────────────────────────────────────────

def _clean_text(raw: str) -> str:
    """
    Normalise free-form description text:
      - Strip leading/trailing whitespace
      - Collapse internal multiple spaces → single space
      - Capitalize first letter
      - Remove any trailing punctuation except closing parenthesis
    """
    text = str(raw).strip()
    text = re.sub(r"\s+", " ", text)
    if text:
        text = text[0].upper() + text[1:]
    text = re.sub(r"[,;.\s]+$", "", text)
    return text


def _pad_code(value: int, width: int) -> str:
    """Zero-pad an integer NIC code to the expected width."""
    return str(int(value)).zfill(width)


# ── public API ────────────────────────────────────────────────────────────────

def parse_nic_csv(path: str | Path) -> ParseResult:
    """
    Load and parse the NIC 2008 master CSV.

    Args:
        path: Absolute or relative path to nic_2008.csv.

    Returns:
        ParseResult containing a list of NICEntry objects and any row-level errors.

    Raises:
        FileNotFoundError: if the CSV does not exist at ``path``.
        ValueError:        if required columns are missing.
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"NIC CSV not found: {path}")

    logger.info("Parsing NIC CSV: %s", path)

    # ── 1. Load ───────────────────────────────────────────────────────────────
    df = pd.read_csv(path, dtype=str)          # read everything as str first
    df.columns = df.columns.str.strip()        # defensive strip on headers

    required = {"Description", "Sub Class", "Class", "Group", "Division", "Section"}
    missing  = required - set(df.columns)
    if missing:
        raise ValueError(f"CSV is missing expected columns: {missing}")

    logger.info("Loaded %d rows, columns: %s", len(df), list(df.columns))

    # ── 2. Parse row by row ───────────────────────────────────────────────────
    entries: list[NICEntry] = []
    errors:  list[str]      = []

    for idx, row in df.iterrows():
        row_num = idx + 2          # 1-based, accounting for header
        try:
            # Convert code columns — they may have decimal noise from pandas
            sub_class_raw = str(row["Sub Class"]).strip().split(".")[0]
            class_raw     = str(row["Class"]).strip().split(".")[0]
            group_raw     = str(row["Group"]).strip().split(".")[0]

            entry = NICEntry(
                code        = _pad_code(int(sub_class_raw), 5),
                description = _clean_text(row["Description"]),
                class_code  = _pad_code(int(class_raw), 4),
                group_code  = _pad_code(int(group_raw), 3),
                division    = _clean_text(row["Division"]),
                section     = _clean_text(row["Section"]),
            )
            entries.append(entry)

        except Exception as e:
            msg = f"Row {row_num}: {e} — raw={dict(row)}"
            logger.warning(msg)
            errors.append(msg)

    logger.info(
        "Parse complete: %d entries, %d errors",
        len(entries), len(errors),
    )

    return ParseResult(
        total       = len(entries),
        entries     = entries,
        errors      = errors,
        source_file = path.name,
    )


def parse_to_dicts(path: str | Path) -> list[dict]:
    """
    Convenience wrapper used by the FastAPI endpoint and the Neo4j ingestion
    pipeline (Iteration 4).

    Returns:
        List of plain dicts: {"code": ..., "description": ..., ...}
    """
    result = parse_nic_csv(path)
    return [e.model_dump() for e in result.entries]