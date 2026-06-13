"""
NIC code Pydantic models — used across the full pipeline.

Hierarchy (most → least granular):
    Sub Class  (5 digits, e.g. 01111)  ← this is the "code" we classify into
    Class      (4 digits, e.g. 0111)
    Group      (3 digits, e.g. 011)
    Division   (2 digits, e.g. 01)  — stored as text label in the CSV
    Section    (letter,   e.g. A)   — stored as text label in the CSV
"""
from pydantic import BaseModel, field_validator


class NICEntry(BaseModel):
    """A single fully-resolved NIC Sub Class entry."""

    code: str                   # zero-padded 5-digit Sub Class, e.g. "01111"
    description: str            # cleaned activity description
    class_code: str             # 4-digit class, e.g. "0111"
    group_code: str             # 3-digit group, e.g. "011"
    division: str               # Division label
    section: str                # Section label

    @field_validator("code", "class_code", "group_code")
    @classmethod
    def must_be_numeric_string(cls, v: str) -> str:
        if not v.isdigit():
            raise ValueError(f"Code must be all digits, got: {v!r}")
        return v

    def to_index_dict(self) -> dict:
        """
        Flat dict used for vector-store / graph ingestion in Iteration 4.
        Combines all text fields into a single searchable blob.
        """
        return {
            "code": self.code,
            "description": self.description,
            "searchable_text": (
                f"{self.description} | {self.division} | {self.section}"
            ),
            "class_code":  self.class_code,
            "group_code":  self.group_code,
            "division":    self.division,
            "section":     self.section,
        }


class ParseResult(BaseModel):
    """Top-level response returned by the /data/parse endpoint."""

    total: int
    entries: list[NICEntry]
    errors: list[str] = []
    source_file: str