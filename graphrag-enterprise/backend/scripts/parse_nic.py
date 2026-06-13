#!/usr/bin/env python3
"""
Iteration 3 — Pass Condition Script
=====================================
Run this directly in your Arch terminal to verify parsing works end-to-end.

Usage (from inside the backend container or venv):
    python scripts/parse_nic.py

Expected output:
    ✅  Parsed 1297 entries, 0 errors
    Sample entries:
    [0]  01111  →  Growing of wheat
    [1]  01112  →  Growing of jowar, bajra and millets
    [2]  01113  →  Growing of other cereals
    ...
    ✅  All codes are 5-digit strings    — PASS
    ✅  No empty descriptions            — PASS
    ✅  No duplicate codes               — PASS
"""
import sys
import json
from pathlib import Path

# Make sure the backend root is on the path when run directly
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.data_parser import parse_nic_csv, parse_to_dicts

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "nic_2008.csv"
SAMPLE_N  = 5
EXPORT_PATH = Path(__file__).resolve().parents[1] / "data" / "nic_parsed.json"


def run():
    print(f"\n{'='*60}")
    print("  NIC 2008 — Iteration 3 Parser Validation")
    print(f"{'='*60}\n")

    # ── Parse ──────────────────────────────────────────────────────────
    result = parse_nic_csv(DATA_PATH)

    status = "✅" if result.total > 0 else "❌"
    print(f"{status}  Parsed {result.total} entries, {len(result.errors)} errors")

    if result.errors:
        print("\n⚠  Row errors:")
        for e in result.errors:
            print(f"   {e}")

    # ── Sample ─────────────────────────────────────────────────────────
    print(f"\nSample entries (first {SAMPLE_N}):")
    for i, entry in enumerate(result.entries[:SAMPLE_N]):
        print(f"  [{i}]  {entry.code}  →  {entry.description}")
        print(f"        class={entry.class_code}  group={entry.group_code}")
        print(f"        division: {entry.division[:60]}…")
        print()

    # ── Assertions ─────────────────────────────────────────────────────
    print("Validation checks:")

    codes  = [e.code for e in result.entries]
    descs  = [e.description for e in result.entries]
    passed = True

    # 1. All codes are 5-digit strings
    bad_codes = [c for c in codes if not (c.isdigit() and len(c) == 5)]
    if bad_codes:
        print(f"  ❌  {len(bad_codes)} codes are not 5-digit strings: {bad_codes[:5]}")
        passed = False
    else:
        print("  ✅  All codes are 5-digit strings    — PASS")

    # 2. No empty descriptions
    empty = [i for i, d in enumerate(descs) if not d.strip()]
    if empty:
        print(f"  ❌  {len(empty)} empty descriptions at rows: {empty[:5]}")
        passed = False
    else:
        print("  ✅  No empty descriptions            — PASS")

    # 3. No duplicate codes
    dupes = [c for c in set(codes) if codes.count(c) > 1]
    if dupes:
        print(f"  ❌  {len(dupes)} duplicate codes: {dupes[:5]}")
        passed = False
    else:
        print("  ✅  No duplicate codes               — PASS")

    # ── Export ─────────────────────────────────────────────────────────
    plain = parse_to_dicts(DATA_PATH)
    with open(EXPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(plain, f, ensure_ascii=False, indent=2)
    print(f"\n📄  Exported clean JSON → {EXPORT_PATH.relative_to(Path.cwd())}")

    # ── Final verdict ──────────────────────────────────────────────────
    print(f"\n{'='*60}")
    if passed and result.total > 0 and not result.errors:
        print("  🎉  Iteration 3 PASSED — ready for Iteration 4 (GraphRAG)")
    else:
        print("  ❌  Iteration 3 FAILED — check errors above")
    print(f"{'='*60}\n")

    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    run()