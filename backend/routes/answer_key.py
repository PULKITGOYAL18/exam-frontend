# backend/routes/answer_key.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import re


# ============================================================
# BLUEPRINT
# ============================================================

answer_key_bp = Blueprint(
    "answer_key",
    __name__,
    url_prefix="/api/answer-key"
)


# ============================================================
# DATABASE
# ============================================================

def get_db():
    """Get database connection from Flask app."""
    return current_app.db


# ============================================================
# MCQ NORMALIZATION
# ============================================================

ROMAN_BY_OPTION = {
    "A": "I",
    "B": "II",
    "C": "III",
    "D": "IV",
}

OPTION_BY_ROMAN = {
    "I": "A",
    "II": "B",
    "III": "C",
    "IV": "D",
}

OPTION_BY_NUMBER = {
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
}


def normalize_answer(value):
    if value is None:
        return ""
    return str(value).strip()


def canonicalize_mcq_answer(value):
    """
    Converts common MCQ representations to A/B/C/D.

    Supported:
    A, B, C, D
    (A), B., etc.
    I, II, III, IV
    1, 2, 3, 4
    Option A, Option II, Option 2
    """
    raw = normalize_answer(value)

    if not raw:
        return ""

    upper = raw.upper().strip()

    # Remove surrounding brackets.
    upper = re.sub(r"^[\(\[\{]\s*", "", upper)
    upper = re.sub(r"\s*[\)\]\}]$", "", upper)

    # Remove trailing punctuation.
    upper = re.sub(r"[\.\:\;]+$", "", upper).strip()

    if upper in ("A", "B", "C", "D"):
        return upper

    if upper in OPTION_BY_ROMAN:
        return OPTION_BY_ROMAN[upper]

    if upper in OPTION_BY_NUMBER:
        return OPTION_BY_NUMBER[upper]

    match = re.match(r"^OPTION\s+(.+)$", upper)
    if match:
        option_value = match.group(1).strip()

        if option_value in ("A", "B", "C", "D"):
            return option_value

        if option_value in OPTION_BY_ROMAN:
            return OPTION_BY_ROMAN[option_value]

        if option_value in OPTION_BY_NUMBER:
            return OPTION_BY_NUMBER[option_value]

    return ""


def build_accepted_answers(answer):
    """Generate common accepted representations for an MCQ answer."""
    raw = normalize_answer(answer)
    canonical = canonicalize_mcq_answer(raw)

    if not canonical:
        return [raw] if raw else []

    accepted = []

    def add(value):
        if value and value not in accepted:
            accepted.append(value)

    roman = ROMAN_BY_OPTION[canonical]

    numeric = next(
        (
            number
            for number, option in OPTION_BY_NUMBER.items()
            if option == canonical
        ),
        None,
    )

    values = [
        canonical,
        canonical.lower(),
        f"({canonical})",
        f"({canonical.lower()})",
        f"{canonical}.",
        f"{canonical.lower()}.",
        roman,
        roman.lower(),
        f"({roman})",
        f"({roman.lower()})",
        f"{roman}.",
        f"{roman.lower()}.",
    ]

    if numeric:
        values.extend(
            [
                numeric,
                f"({numeric})",
                f"{numeric}.",
            ]
        )

    values.extend(
        [
            f"Option {canonical}",
            f"option {canonical}",
            f"OPTION {canonical}",
            f"Option {roman}",
            f"option {roman}",
            f"OPTION {roman}",
        ]
    )

    if numeric:
        values.extend(
            [
                f"Option {numeric}",
                f"option {numeric}",
                f"OPTION {numeric}",
            ]
        )

    for value in values:
        add(value)

    return accepted


# ============================================================
# QUESTION NORMALIZATION
# ============================================================

def normalize_question(question):
    """
    Normalize one question without assuming that the section
    contains only one question type.

    The question itself is the source of truth for its type.
    This is important for mixed sections such as:
        MCQ + True/False + Short Answer + Long Answer
    """
    if not isinstance(question, dict):
        return None

    normalized = dict(question)

    answer_type = str(
        question.get("answer_type") or ""
    ).strip().upper()

    question_type = str(
        question.get("question_type") or ""
    ).strip().lower()

    section_type = str(
        question.get("section_type") or ""
    ).strip().upper()

    # Only identify a question as MCQ when the question itself
    # indicates that it is an MCQ. A mixed section must NOT turn
    # every question into an MCQ.
    is_mcq = (
        answer_type in {
            "MCQ",
            "MULTIPLE_CHOICE",
            "MULTIPLE CHOICE",
        }
        or question_type in {
            "mcq",
            "multiple_choice",
            "multiple choice",
        }
        or isinstance(question.get("mcq_answer"), dict)
        or bool(question.get("options"))
        or section_type == "MCQ"
    )

    if is_mcq:
        mcq_answer = question.get("mcq_answer")

        raw_answer = ""

        if isinstance(mcq_answer, dict):
            raw_answer = (
                mcq_answer.get("correct_answer")
                or ""
            )

        if not raw_answer:
            raw_answer = (
                question.get("correct_answer")
                or ""
            )

        if not raw_answer:
            raw_answer = (
                question.get("model_answer")
                or ""
            )

        canonical = canonicalize_mcq_answer(raw_answer)

        existing = question.get("accepted_answers", [])
        if not isinstance(existing, list):
            existing = []

        accepted = []

        for answer in (
            build_accepted_answers(canonical or raw_answer)
            + existing
        ):
            answer = normalize_answer(answer)

            if answer and answer not in accepted:
                accepted.append(answer)

        normalized["answer_type"] = "MCQ"
        normalized["correct_answer"] = (
            canonical
            or normalize_answer(raw_answer)
        )
        normalized["accepted_answers"] = accepted

        normalized["mcq_answer"] = {
            **(
                mcq_answer
                if isinstance(mcq_answer, dict)
                else {}
            ),
            "correct_answer": (
                canonical
                or normalize_answer(raw_answer)
            ),
            "accepted_answers": accepted,
        }

    return normalized


# ============================================================
# SECTION NORMALIZATION
# ============================================================

def safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def safe_float(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_section(section, index):
    """
    Normalize a section while preserving its original type label.

    Section type is descriptive only. A section is allowed to contain
    different question types. The individual question determines its
    own answer_type/question_type.
    """
    if not isinstance(section, dict):
        return None

    normalized = dict(section)

    section_id = (
        section.get("id")
        or f"section-{index + 1}"
    )

    section_name = (
        str(section.get("name") or "").strip()
        or f"Section {chr(65 + index)}"
    )

    raw_type = str(
        section.get("type")
        or section.get("section_type")
        or "MIXED"
    ).strip()

    # Preserve the user's section label. Only normalize the common
    # aliases; unknown/custom values are valid and are preserved.
    raw_type_upper = raw_type.upper()

    aliases = {
        "LONG": "LONG_ANSWER",
        "LONG ANSWER": "LONG_ANSWER",
        "LONG-ANSWER": "LONG_ANSWER",
        "THEORY": "LONG_ANSWER",
        "SHORT": "SHORT_ANSWER",
        "SHORT ANSWER": "SHORT_ANSWER",
        "SHORT-ANSWER": "SHORT_ANSWER",
        "MCQ": "MCQ",
        "OBJECTIVE": "MCQ",
        "MIXED": "MIXED",
    }

    section_type = aliases.get(
        raw_type_upper,
        raw_type or "MIXED",
    )

    raw_questions = section.get("questions", [])

    if not isinstance(raw_questions, list):
        raw_questions = []

    normalized_questions = []

    for question in raw_questions:
        normalized_question = normalize_question(question)

        if normalized_question is None:
            continue

        normalized_question["section_id"] = section_id
        normalized_question["section_name"] = section_name
        normalized_question["section_type"] = section_type

        # IMPORTANT: Do not copy the section type into every question.
        # A mixed section may contain MCQ, True/False, Short Answer,
        # Long Answer, etc. Only use section type as a fallback for a
        # genuinely uniform MCQ/short/long section when the question
        # itself has no type information.
        if not normalized_question.get("answer_type"):
            question_type = str(
                normalized_question.get("question_type") or ""
            ).strip().lower()

            if question_type in {
                "mcq",
                "multiple_choice",
                "multiple choice",
            }:
                normalized_question["answer_type"] = "MCQ"
            elif section_type in {
                "MCQ",
                "SHORT_ANSWER",
                "LONG_ANSWER",
            }:
                normalized_question["answer_type"] = section_type

        normalized_questions.append(
            normalized_question
        )

    total_questions = safe_int(
        section.get(
            "total_questions",
            len(normalized_questions),
        ),
        len(normalized_questions),
    )

    if normalized_questions:
        total_questions = len(normalized_questions)

    questions_to_attempt = safe_int(
        section.get(
            "questions_to_attempt",
            total_questions,
        ),
        total_questions,
    )

    marks_per_question = safe_float(
        section.get(
            "marks_per_question",
            0,
        ),
        0,
    )

    if marks_per_question <= 0 and normalized_questions:
        marks_values = [
            safe_float(
                q.get(
                    "max_marks",
                    q.get("marks", 0),
                ),
                0,
            )
            for q in normalized_questions
        ]

        positive_marks = [
            value for value in marks_values
            if value > 0
        ]

        if positive_marks and len(set(positive_marks)) == 1:
            marks_per_question = positive_marks[0]

    questions_to_attempt = max(
        0,
        min(
            questions_to_attempt,
            total_questions,
        ),
    )

    all_compulsory = section.get(
        "all_compulsory",
        questions_to_attempt == total_questions,
    )

    excess_attempt_policy = str(
        section.get(
            "excess_attempt_policy",
            "manual",
        )
    ).lower()

    if excess_attempt_policy not in (
        "best",
        "first",
        "manual",
    ):
        excess_attempt_policy = "manual"

    normalized.update(
        {
            "id": section_id,
            "name": section_name,
            "type": section_type,
            "total_questions": total_questions,
            "questions_to_attempt": questions_to_attempt,
            "marks_per_question": marks_per_question,
            "all_compulsory": bool(all_compulsory),
            "excess_attempt_policy": excess_attempt_policy,
            "questions": normalized_questions,
        }
    )

    return normalized


# ============================================================
# FLATTEN SECTIONS
# ============================================================

def flatten_sections(sections):
    """
    Build backward-compatible questions[] from sections[].

    The section type is copied only as section_type. The question's
    own answer_type is never overwritten by the section type.
    """
    questions = []

    if not isinstance(sections, list):
        return questions

    for section in sections:
        if not isinstance(section, dict):
            continue

        section_id = section.get("id", "")
        section_name = section.get("name", "")
        section_type = section.get("type", "")

        section_questions = section.get(
            "questions",
            [],
        )

        if not isinstance(section_questions, list):
            continue

        for question in section_questions:
            if not isinstance(question, dict):
                continue

            flattened = dict(question)

            flattened["section_id"] = (
                flattened.get("section_id")
                or section_id
            )

            flattened["section_name"] = (
                flattened.get("section_name")
                or section_name
            )

            flattened["section_type"] = (
                flattened.get("section_type")
                or section_type
            )

            # Never assign section_type to answer_type here.
            # Mixed sections must keep the type of each question.
            if not flattened.get("answer_type"):
                q_type = str(
                    flattened.get("question_type") or ""
                ).strip().lower()

                if q_type in {
                    "mcq",
                    "multiple_choice",
                    "multiple choice",
                }:
                    flattened["answer_type"] = "MCQ"
                elif str(section_type).upper() in {
                    "MCQ",
                    "SHORT_ANSWER",
                    "LONG_ANSWER",
                }:
                    flattened["answer_type"] = str(
                        section_type
                    ).upper()

            questions.append(flattened)

    return questions


# ============================================================
# COMPLETE PAYLOAD NORMALIZATION
# ============================================================

def normalize_answer_key_payload(data):
    """
    Supports the current section-based format and the
    older flat questions[] format.
    """
    if not isinstance(data, dict):
        return data

    payload = dict(data)

    sections = data.get("sections")

    if isinstance(sections, list) and sections:
        normalized_sections = []

        for index, section in enumerate(sections):
            normalized = normalize_section(
                section,
                index,
            )

            if normalized is not None:
                normalized_sections.append(normalized)

        payload["sections"] = normalized_sections

        payload["questions"] = flatten_sections(
            normalized_sections
        )

        payload["total_questions"] = len(
            payload["questions"]
        )

        calculated_attempt_marks = 0.0
        available_marks = 0.0

        for section in normalized_sections:
            attempt = safe_int(
                section.get(
                    "questions_to_attempt",
                    0,
                )
            )

            total = safe_int(
                section.get(
                    "total_questions",
                    0,
                )
            )

            marks = safe_float(
                section.get(
                    "marks_per_question",
                    0,
                )
            )

            calculated_attempt_marks += (
                attempt * marks
            )

            available_marks += (
                total * marks
            )

        payload[
            "calculated_attempt_marks"
        ] = calculated_attempt_marks

        payload["available_marks"] = available_marks

    elif isinstance(data.get("questions"), list):
        normalized_questions = []

        for question in data["questions"]:
            normalized = normalize_question(question)

            if normalized is not None:
                normalized_questions.append(normalized)

        payload["questions"] = normalized_questions
        payload["total_questions"] = len(
            normalized_questions
        )

    else:
        payload["questions"] = []

    return payload


# ============================================================
# VALIDATION
# ============================================================

ALLOWED_EXAM_TYPES = {
    "Mid Semester",
    "End Semester",
    "Back Exams",
}


def _is_mcq_question(question, section_type=""):
    """Return True only when the individual question is an MCQ."""
    if not isinstance(question, dict):
        return False

    answer_type = str(
        question.get("answer_type") or ""
    ).strip().lower()

    question_type = str(
        question.get("question_type") or ""
    ).strip().lower()

    q_section_type = str(
        question.get("section_type") or section_type or ""
    ).strip().lower()

    return (
        answer_type in {
            "mcq",
            "multiple_choice",
            "multiple choice",
        }
        or question_type in {
            "mcq",
            "multiple_choice",
            "multiple choice",
        }
        or q_section_type == "mcq"
        or isinstance(question.get("mcq_answer"), dict)
        or bool(question.get("options"))
    )


def validate_sections(sections, total_marks=None):
    """
    Validate sections without forcing a single question type per section.

    A section can be mixed. For example, Section A can contain:
      Q1 = MCQ
      Q2 = True/False
      Q3 = Short Answer
      Q4 = Long Answer

    MCQ validation is therefore performed at question level, not at
    section level.
    """
    if not isinstance(sections, list):
        return "sections must be an array"

    if len(sections) == 0:
        return "At least one section is required"

    attempt_marks = 0.0
    marks_calculation_complete = True

    for index, section in enumerate(sections):
        if not isinstance(section, dict):
            return (
                f"Section {index + 1} must be an object"
            )

        name = str(
            section.get("name") or ""
        ).strip()

        if not name:
            return (
                f"Section {index + 1} name cannot be empty"
            )

        # Section type is descriptive and may be a custom/mixed label.
        section_type = str(
            section.get(
                "type",
                section.get(
                    "section_type",
                    "MIXED",
                ),
            )
            or "MIXED"
        ).strip()

        questions = section.get("questions", [])

        if not isinstance(questions, list):
            return (
                f"questions for {name} must be an array"
            )

        if len(questions) < 1:
            return (
                f"{name} must contain at least one question"
            )

        total_questions = len(questions)

        questions_to_attempt = safe_int(
            section.get(
                "questions_to_attempt",
                total_questions,
            ),
            total_questions,
        )

        if questions_to_attempt < 1:
            return (
                f"questions_to_attempt for {name} "
                "must be at least 1"
            )

        if questions_to_attempt > total_questions:
            return (
                f"questions_to_attempt for {name} "
                "cannot be greater than total_questions"
            )

        # Validate every question independently.
        for q_index, question in enumerate(questions):
            if not isinstance(question, dict):
                return (
                    f"Invalid question {q_index + 1} "
                    f"in {name}"
                )

            # Only MCQs require MCQ-style correct-answer validation.
            # True/False, one-word, short-answer, long-answer, diagram,
            # numerical, etc. are not rejected merely because the section
            # is labelled mixed/objective.
            if _is_mcq_question(question, section_type):
                answer = (
                    question.get("correct_answer")
                    or (
                        question.get(
                            "mcq_answer",
                            {},
                        ).get(
                            "correct_answer",
                            "",
                        )
                        if isinstance(
                            question.get("mcq_answer"),
                            dict,
                        )
                        else ""
                    )
                    or question.get(
                        "model_answer",
                        "",
                    )
                )

                if not normalize_answer(answer):
                    return (
                        f"Correct answer is required for "
                        f"{name}, question {q_index + 1}"
                    )

                if not canonicalize_mcq_answer(answer):
                    return (
                        f"Invalid MCQ answer '{answer}' "
                        f"in {name}, question {q_index + 1}. "
                        "Use A/B/C/D, I/II/III/IV, "
                        "or 1/2/3/4."
                    )

        # ------------------------------------------------------------
        # Marks are optional at section level.
        #
        # Older/newer versions of the frontend may store marks on each
        # question instead of sending section.marks_per_question. A
        # missing section value must NOT make an otherwise valid answer
        # key fail validation.
        # ------------------------------------------------------------
        marks_per_question = safe_float(
            section.get(
                "marks_per_question",
                0,
            ),
            0,
        )

        if marks_per_question <= 0:
            question_marks = [
                safe_float(
                    q.get(
                        "max_marks",
                        q.get("marks", 0),
                    ),
                    0,
                )
                for q in questions
                if isinstance(q, dict)
            ]

            positive = [
                mark for mark in question_marks
                if mark > 0
            ]

            # If every question has the same mark value, it is safe to
            # derive the section value.
            if positive and len(set(positive)) == 1:
                marks_per_question = positive[0]

        if marks_per_question > 0:
            attempt_marks += (
                questions_to_attempt
                * marks_per_question
            )
        else:
            marks_calculation_complete = False

        # If neither the section nor its questions contain marks, leave
        # the section out of strict total-mark calculation. The frontend
        # can still provide the overall total_marks value.

    if total_marks is not None:
        supplied_total = safe_float(
            total_marks,
            -1,
        )

        if supplied_total <= 0:
            return "total_marks must be greater than 0"

        # Only enforce the arithmetic comparison when every section has
        # enough mark information to calculate it reliably. This keeps
        # backward compatibility with payloads where marks are maintained
        # only in the frontend or are intentionally omitted.
        if marks_calculation_complete and abs(
            supplied_total - attempt_marks
        ) > 0.01:
            return (
                "total_marks does not match the marks "
                "obtainable from the section attempt rules. "
                f"Expected {attempt_marks:g}, "
                f"received {supplied_total:g}."
            )

    return None


def validate_answer_key_data(data):
    """
    Validation intentionally supports the current frontend.

    Only the core fields required to identify an answer key
    are mandatory. Optional examination metadata is preserved
    when supplied.
    """
    if not data:
        return "Request body is required"

    if not isinstance(data, dict):
        return "Request body must be a JSON object"

    # --------------------------------------------------------
    # Core fields used by the current Save Answer Key UI.
    # --------------------------------------------------------
    required_core = [
        "name",
        "subject",
        "department",
        "semester",
        "total_marks",
    ]

    for field in required_core:
        if field not in data:
            return f"Missing required field: {field}"

    # --------------------------------------------------------
    # Core string fields.
    # --------------------------------------------------------
    for field, display_name in (
        ("name", "Answer key name"),
        ("subject", "Subject"),
        ("department", "Department"),
    ):
        value = data.get(field)

        if not isinstance(value, str):
            return f"{field} must be a string"

        if not value.strip():
            return f"{display_name} cannot be empty"

    # --------------------------------------------------------
    # Semester.
    # --------------------------------------------------------
    semester = safe_int(data.get("semester"), -1)

    if semester < 1:
        return "semester must be greater than 0"

    # --------------------------------------------------------
    # Total marks.
    # --------------------------------------------------------
    total_marks = safe_float(
        data.get("total_marks"),
        -1,
    )

    if total_marks <= 0:
        return "total_marks must be greater than 0"

    # --------------------------------------------------------
    # Optional metadata validation.
    # --------------------------------------------------------
    optional_strings = [
        "subject_code",
        "college_name",
        "academic_year",
        "examination_date",
        "duration",
    ]

    for field in optional_strings:
        if field in data and data[field] is not None:
            if not isinstance(data[field], str):
                return f"{field} must be a string"

    if (
        "examination_type" in data
        and data["examination_type"] not in ALLOWED_EXAM_TYPES
    ):
        return (
            "Invalid examination_type. Allowed values: "
            "Mid Semester, End Semester, Back Exams"
        )

    # --------------------------------------------------------
    # New section format.
    # --------------------------------------------------------
    sections = data.get("sections")

    if isinstance(sections, list) and sections:
        return validate_sections(
            sections,
            total_marks,
        )

    # --------------------------------------------------------
    # Flat format.
    # --------------------------------------------------------
    questions = data.get("questions")

    if not isinstance(questions, list):
        return "questions must be an array"

    if len(questions) == 0:
        return "At least one question is required"

    return None


# ============================================================
# BUILD MONGODB DOCUMENT
# ============================================================

def build_answer_key_document(
    data,
    created_by="",
    creation_mode="authenticated",
):
    normalized = normalize_answer_key_payload(data)

    now = datetime.now().isoformat()

    questions = normalized.get(
        "questions",
        [],
    )

    sections = normalized.get(
        "sections",
        [],
    )

    return {
        # Basic information.
        "name": str(
            normalized.get("name", "")
        ).strip(),

        "subject": str(
            normalized.get("subject", "")
        ).strip(),

        "subject_code": str(
            normalized.get("subject_code", "")
            or ""
        ).strip(),

        "college_name": str(
            normalized.get("college_name", "")
            or ""
        ).strip(),

        "department": str(
            normalized.get("department", "")
        ).strip(),

        "semester": safe_int(
            normalized.get("semester"),
            1,
        ),

        # Examination information.
        "examination_type": str(
            normalized.get(
                "examination_type",
                "",
            )
            or ""
        ).strip(),

        "academic_year": str(
            normalized.get(
                "academic_year",
                "",
            )
            or ""
        ).strip(),

        "examination_date": str(
            normalized.get(
                "examination_date",
                "",
            )
            or ""
        ).strip(),

        "total_marks": safe_float(
            normalized.get("total_marks"),
            0,
        ),

        "duration": str(
            normalized.get(
                "duration",
                "",
            )
            or ""
        ).strip(),

        # New section configuration.
        "sections": sections,

        "total_sections": len(sections),

        "calculated_attempt_marks": safe_float(
            normalized.get(
                "calculated_attempt_marks",
                0,
            ),
            0,
        ),

        "available_marks": safe_float(
            normalized.get(
                "available_marks",
                0,
            ),
            0,
        ),

        # Backward-compatible flat questions.
        "total_questions": len(questions),

        "questions": questions,

        # Metadata.
        "created_at": now,
        "updated_at": now,
        "created_by": created_by,
        "creation_mode": creation_mode,
    }


# ============================================================
# SERIALIZATION
# ============================================================

def serialize_answer_key(key):
    if not key:
        return None

    sections = key.get("sections", [])
    questions = key.get("questions", [])

    if not isinstance(sections, list):
        sections = []

    if not isinstance(questions, list):
        questions = []

    return {
        "id": str(key["_id"]),

        "name": key.get("name", ""),
        "subject": key.get("subject", ""),
        "subject_code": key.get("subject_code", ""),
        "college_name": key.get("college_name", ""),
        "department": key.get("department", ""),
        "semester": key.get("semester", 1),

        "examination_type": key.get(
            "examination_type",
            "",
        ),
        "academic_year": key.get(
            "academic_year",
            "",
        ),
        "examination_date": key.get(
            "examination_date",
            "",
        ),
        "total_marks": key.get(
            "total_marks",
            0,
        ),
        "duration": key.get(
            "duration",
            "",
        ),

        "sections": sections,
        "total_sections": key.get(
            "total_sections",
            len(sections),
        ),

        "calculated_attempt_marks": key.get(
            "calculated_attempt_marks",
            0,
        ),

        "available_marks": key.get(
            "available_marks",
            0,
        ),

        "total_questions": key.get(
            "total_questions",
            len(questions),
        ),

        "questions": questions,

        "created_at": key.get(
            "created_at",
            "",
        ),
        "updated_at": key.get(
            "updated_at",
            "",
        ),
        "created_by": key.get(
            "created_by",
            "",
        ),
        "creation_mode": key.get(
            "creation_mode",
            "authenticated",
        ),
    }


# ============================================================
# AUTHENTICATED CREATE
# ============================================================

@answer_key_bp.route(
    "/create",
    methods=["POST"],
)
@jwt_required()
def create_answer_key():
    try:
        db = get_db()

        data = request.get_json(
            silent=True,
        )

        validation_error = validate_answer_key_data(
            data
        )

        if validation_error:
            print(
                "⚠️ Answer-key validation failed:",
                validation_error,
            )

            return jsonify({
                "status": "error",
                "message": validation_error,
            }), 400

        current_user_id = get_jwt_identity()

        if not current_user_id:
            return jsonify({
                "status": "error",
                "message": (
                    "User identity not found in token"
                ),
            }), 401

        answer_keys = db["answer_keys"]

        answer_key = build_answer_key_document(
            data=data,
            created_by=str(current_user_id),
            creation_mode="authenticated",
        )

        result = answer_keys.insert_one(
            answer_key
        )

        created = answer_keys.find_one(
            {
                "_id": result.inserted_id,
            }
        )

        print(
            f"✅ Authenticated answer key created: "
            f"{result.inserted_id}"
        )

        return jsonify({
            "status": "success",
            "message": (
                "Answer key created successfully"
            ),
            "data": serialize_answer_key(created),
        }), 201

    except Exception as exc:
        print(
            f"❌ Error creating answer key: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500


# ============================================================
# PUBLIC / GUEST CREATE
# ============================================================

@answer_key_bp.route(
    "/public-create",
    methods=["POST"],
)
def create_public_answer_key():
    try:
        print(
            "🌐 Public answer-key creation request received"
        )

        db = get_db()

        data = request.get_json(
            silent=True,
        )

        validation_error = validate_answer_key_data(
            data
        )

        if validation_error:
            print(
                "⚠️ Public answer-key validation failed:",
                validation_error,
            )

            return jsonify({
                "status": "error",
                "message": validation_error,
            }), 400

        answer_keys = db["answer_keys"]

        answer_key = build_answer_key_document(
            data=data,
            created_by="",
            creation_mode="public",
        )

        result = answer_keys.insert_one(
            answer_key
        )

        created = answer_keys.find_one(
            {
                "_id": result.inserted_id,
            }
        )

        if not created:
            return jsonify({
                "status": "error",
                "message": (
                    "Answer key was created but "
                    "could not be retrieved"
                ),
            }), 500

        print(
            f"✅ Public answer key created: "
            f"{result.inserted_id}"
        )

        return jsonify({
            "status": "success",
            "message": (
                "Answer key created successfully"
            ),
            "data": serialize_answer_key(created),
        }), 201

    except Exception as exc:
        print(
            f"❌ Error creating public answer key: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500


# ============================================================
# LIST AUTHENTICATED ANSWER KEYS
# ============================================================

@answer_key_bp.route(
    "/list",
    methods=["GET"],
)
@jwt_required()
def list_answer_keys():
    try:
        db = get_db()

        current_user_id = get_jwt_identity()

        if not current_user_id:
            return jsonify({
                "status": "error",
                "message": (
                    "User identity not found in token"
                ),
            }), 401

        answer_keys = db["answer_keys"]

        cursor = answer_keys.find(
            {
                "created_by": str(current_user_id),
            }
        ).sort(
            "created_at",
            -1,
        )

        result = []

        for key in cursor:
            result.append({
                "id": str(key["_id"]),
                "name": key.get("name", ""),
                "subject": key.get("subject", ""),
                "subject_code": key.get(
                    "subject_code",
                    "",
                ),
                "college_name": key.get(
                    "college_name",
                    "",
                ),
                "department": key.get(
                    "department",
                    "",
                ),
                "semester": key.get(
                    "semester",
                    1,
                ),
                "examination_type": key.get(
                    "examination_type",
                    "",
                ),
                "academic_year": key.get(
                    "academic_year",
                    "",
                ),
                "examination_date": key.get(
                    "examination_date",
                    "",
                ),
                "total_marks": key.get(
                    "total_marks",
                    0,
                ),
                "duration": key.get(
                    "duration",
                    "",
                ),
                "total_questions": key.get(
                    "total_questions",
                    len(key.get("questions", [])),
                ),
                "total_sections": key.get(
                    "total_sections",
                    len(key.get("sections", [])),
                ),
                "created_at": key.get(
                    "created_at",
                    "",
                ),
            })

        return jsonify({
            "status": "success",
            "data": result,
        }), 200

    except Exception as exc:
        print(
            f"❌ Error listing answer keys: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500



# ============================================================
# PUBLIC / GUEST LIST
# ============================================================

@answer_key_bp.route(
    "/public-list",
    methods=["GET"],
)
def list_public_answer_keys():
    """List answer keys created through the public/guest workflow."""
    try:
        db = get_db()

        cursor = db["answer_keys"].find(
            {
                "creation_mode": "public",
            }
        ).sort(
            "created_at",
            -1,
        )

        result = []

        for key in cursor:
            result.append(serialize_answer_key(key))

        return jsonify({
            "status": "success",
            "data": result,
        }), 200

    except Exception as exc:
        print(
            f"❌ Error listing public answer keys: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500


# ============================================================
# PUBLIC / GUEST GET BY ID
# ============================================================

@answer_key_bp.route(
    "/public/<key_id>",
    methods=["GET"],
)
def get_public_answer_key(key_id):
    """Get one public answer key without JWT authentication."""
    try:
        db = get_db()

        try:
            object_id = ObjectId(key_id)
        except Exception:
            return jsonify({
                "status": "error",
                "message": "Invalid answer key ID",
            }), 400

        key = db["answer_keys"].find_one({
            "_id": object_id,
            "creation_mode": "public",
        })

        if not key:
            return jsonify({
                "status": "error",
                "message": "Answer key not found",
            }), 404

        return jsonify({
            "status": "success",
            "data": serialize_answer_key(key),
        }), 200

    except Exception as exc:
        print(
            f"❌ Error getting public answer key: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500


# ============================================================
# PUBLIC / GUEST UPDATE
# ============================================================

@answer_key_bp.route(
    "/public/<key_id>",
    methods=["PUT"],
)
def update_public_answer_key(key_id):
    """Update one public answer key without JWT authentication."""
    try:
        db = get_db()
        answer_keys = db["answer_keys"]

        data = request.get_json(silent=True)

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "Request body is required",
            }), 400

        try:
            object_id = ObjectId(key_id)
        except Exception:
            return jsonify({
                "status": "error",
                "message": "Invalid answer key ID",
            }), 400

        existing = answer_keys.find_one({
            "_id": object_id,
            "creation_mode": "public",
        })

        if not existing:
            return jsonify({
                "status": "error",
                "message": "Answer key not found",
            }), 404

        # Merge existing data with the incoming payload so partial
        # updates do not accidentally remove fields.
        merged = dict(existing)
        merged.pop("_id", None)
        merged.update(data)

        # Public records must remain public and must never gain
        # an authenticated owner through this endpoint.
        merged["created_by"] = existing.get("created_by", "")
        merged["creation_mode"] = "public"

        validation_error = validate_answer_key_data(merged)

        if validation_error:
            return jsonify({
                "status": "error",
                "message": validation_error,
            }), 400

        normalized = normalize_answer_key_payload(merged)

        sections = normalized.get(
            "sections",
            existing.get("sections", []),
        )

        questions = normalized.get(
            "questions",
            existing.get("questions", []),
        )

        update_fields = {
            "name": str(
                normalized.get(
                    "name",
                    existing.get("name", ""),
                ) or ""
            ).strip(),
            "subject": str(
                normalized.get(
                    "subject",
                    existing.get("subject", ""),
                ) or ""
            ).strip(),
            "subject_code": str(
                normalized.get(
                    "subject_code",
                    existing.get("subject_code", ""),
                ) or ""
            ).strip(),
            "college_name": str(
                normalized.get(
                    "college_name",
                    existing.get("college_name", ""),
                ) or ""
            ).strip(),
            "department": str(
                normalized.get(
                    "department",
                    existing.get("department", ""),
                ) or ""
            ).strip(),
            "semester": safe_int(
                normalized.get(
                    "semester",
                    existing.get("semester", 1),
                ),
                1,
            ),
            "examination_type": str(
                normalized.get(
                    "examination_type",
                    existing.get("examination_type", ""),
                ) or ""
            ).strip(),
            "academic_year": str(
                normalized.get(
                    "academic_year",
                    existing.get("academic_year", ""),
                ) or ""
            ).strip(),
            "examination_date": str(
                normalized.get(
                    "examination_date",
                    existing.get("examination_date", ""),
                ) or ""
            ).strip(),
            "total_marks": safe_float(
                normalized.get(
                    "total_marks",
                    existing.get("total_marks", 0),
                ),
                0,
            ),
            "duration": str(
                normalized.get(
                    "duration",
                    existing.get("duration", ""),
                ) or ""
            ).strip(),
            "sections": sections,
            "total_sections": len(sections)
            if isinstance(sections, list)
            else 0,
            "calculated_attempt_marks": safe_float(
                normalized.get(
                    "calculated_attempt_marks",
                    existing.get("calculated_attempt_marks", 0),
                ),
                0,
            ),
            "available_marks": safe_float(
                normalized.get(
                    "available_marks",
                    existing.get("available_marks", 0),
                ),
                0,
            ),
            "questions": questions,
            "total_questions": len(questions)
            if isinstance(questions, list)
            else 0,
            "updated_at": datetime.now().isoformat(),
            "created_by": existing.get("created_by", ""),
            "creation_mode": "public",
        }

        answer_keys.update_one(
            {
                "_id": object_id,
                "creation_mode": "public",
            },
            {
                "$set": update_fields,
            },
        )

        updated = answer_keys.find_one({
            "_id": object_id,
            "creation_mode": "public",
        })

        if not updated:
            return jsonify({
                "status": "error",
                "message": "Answer key could not be retrieved after update",
            }), 500

        print(
            f"✅ Public answer key updated: {object_id}"
        )

        return jsonify({
            "status": "success",
            "message": "Answer key updated successfully",
            "data": serialize_answer_key(updated),
        }), 200

    except Exception as exc:
        print(
            f"❌ Error updating public answer key: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500


# ============================================================
# PUBLIC / GUEST DELETE
# ============================================================

@answer_key_bp.route(
    "/public/<key_id>",
    methods=["DELETE"],
)
def delete_public_answer_key(key_id):
    """Delete one public answer key without JWT authentication."""
    try:
        db = get_db()

        try:
            object_id = ObjectId(key_id)
        except Exception:
            return jsonify({
                "status": "error",
                "message": "Invalid answer key ID",
            }), 400

        result = db["answer_keys"].delete_one({
            "_id": object_id,
            "creation_mode": "public",
        })

        if result.deleted_count == 0:
            return jsonify({
                "status": "error",
                "message": "Answer key not found",
            }), 404

        print(
            f"🗑️ Public answer key deleted: {object_id}"
        )

        return jsonify({
            "status": "success",
            "message": "Answer key deleted successfully",
        }), 200

    except Exception as exc:
        print(
            f"❌ Error deleting public answer key: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500

# ============================================================
# GET ANSWER KEY BY ID
# ============================================================

@answer_key_bp.route(
    "/<key_id>",
    methods=["GET"],
)
@jwt_required()
def get_answer_key(key_id):
    try:
        db = get_db()

        current_user_id = get_jwt_identity()

        try:
            object_id = ObjectId(key_id)
        except Exception:
            return jsonify({
                "status": "error",
                "message": "Invalid answer key ID",
            }), 400

        key = db["answer_keys"].find_one(
            {
                "_id": object_id,
                "created_by": str(current_user_id),
            }
        )

        if not key:
            return jsonify({
                "status": "error",
                "message": "Answer key not found",
            }), 404

        return jsonify({
            "status": "success",
            "data": serialize_answer_key(key),
        }), 200

    except Exception as exc:
        print(
            f"❌ Error getting answer key: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500


# ============================================================
# UPDATE ANSWER KEY
# ============================================================

@answer_key_bp.route(
    "/<key_id>",
    methods=["PUT"],
)
@jwt_required()
def update_answer_key(key_id):
    try:
        db = get_db()

        current_user_id = get_jwt_identity()

        if not current_user_id:
            return jsonify({
                "status": "error",
                "message": (
                    "User identity not found in token"
                ),
            }), 401

        data = request.get_json(
            silent=True,
        )

        if not isinstance(data, dict):
            return jsonify({
                "status": "error",
                "message": "Request body is required",
            }), 400

        try:
            object_id = ObjectId(key_id)
        except Exception:
            return jsonify({
                "status": "error",
                "message": "Invalid answer key ID",
            }), 400

        answer_keys = db["answer_keys"]

        existing = answer_keys.find_one(
            {
                "_id": object_id,
                "created_by": str(current_user_id),
            }
        )

        if not existing:
            return jsonify({
                "status": "error",
                "message": "Answer key not found",
            }), 404

        # Merge the stored document with the new data.
        # This allows the frontend to update only part of
        # the answer key without losing old fields.
        merged = dict(existing)
        merged.pop("_id", None)
        merged.update(data)

        validation_error = validate_answer_key_data(
            merged
        )

        if validation_error:
            return jsonify({
                "status": "error",
                "message": validation_error,
            }), 400

        normalized = normalize_answer_key_payload(
            merged
        )

        update_fields = {
            "name": str(
                normalized.get(
                    "name",
                    existing.get("name", ""),
                )
                or ""
            ).strip(),

            "subject": str(
                normalized.get(
                    "subject",
                    existing.get("subject", ""),
                )
                or ""
            ).strip(),

            "subject_code": str(
                normalized.get(
                    "subject_code",
                    existing.get(
                        "subject_code",
                        "",
                    ),
                )
                or ""
            ).strip(),

            "college_name": str(
                normalized.get(
                    "college_name",
                    existing.get(
                        "college_name",
                        "",
                    ),
                )
                or ""
            ).strip(),

            "department": str(
                normalized.get(
                    "department",
                    existing.get(
                        "department",
                        "",
                    ),
                )
                or ""
            ).strip(),

            "semester": safe_int(
                normalized.get(
                    "semester",
                    existing.get("semester", 1),
                ),
                1,
            ),

            "examination_type": str(
                normalized.get(
                    "examination_type",
                    existing.get(
                        "examination_type",
                        "",
                    ),
                )
                or ""
            ).strip(),

            "academic_year": str(
                normalized.get(
                    "academic_year",
                    existing.get(
                        "academic_year",
                        "",
                    ),
                )
                or ""
            ).strip(),

            "examination_date": str(
                normalized.get(
                    "examination_date",
                    existing.get(
                        "examination_date",
                        "",
                    ),
                )
                or ""
            ).strip(),

            "total_marks": safe_float(
                normalized.get(
                    "total_marks",
                    existing.get("total_marks", 0),
                ),
                0,
            ),

            "duration": str(
                normalized.get(
                    "duration",
                    existing.get("duration", ""),
                )
                or ""
            ).strip(),

            "sections": normalized.get(
                "sections",
                existing.get("sections", []),
            ),

            "total_sections": len(
                normalized.get(
                    "sections",
                    existing.get("sections", []),
                )
            ),

            "calculated_attempt_marks":
                safe_float(
                    normalized.get(
                        "calculated_attempt_marks",
                        existing.get(
                            "calculated_attempt_marks",
                            0,
                        ),
                    ),
                    0,
                ),

            "available_marks": safe_float(
                normalized.get(
                    "available_marks",
                    existing.get(
                        "available_marks",
                        0,
                    ),
                ),
                0,
            ),

            "questions": normalized.get(
                "questions",
                existing.get("questions", []),
            ),

            "total_questions": len(
                normalized.get(
                    "questions",
                    existing.get("questions", []),
                )
            ),

            "updated_at": datetime.now().isoformat(),
        }

        answer_keys.update_one(
            {
                "_id": object_id,
                "created_by": str(current_user_id),
            },
            {
                "$set": update_fields,
            },
        )

        updated = answer_keys.find_one(
            {
                "_id": object_id,
            }
        )

        return jsonify({
            "status": "success",
            "message": (
                "Answer key updated successfully"
            ),
            "data": serialize_answer_key(updated),
        }), 200

    except Exception as exc:
        print(
            f"❌ Error updating answer key: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500


# ============================================================
# DELETE ANSWER KEY
# ============================================================

@answer_key_bp.route(
    "/<key_id>",
    methods=["DELETE"],
)
@jwt_required()
def delete_answer_key(key_id):
    try:
        db = get_db()

        current_user_id = get_jwt_identity()

        try:
            object_id = ObjectId(key_id)
        except Exception:
            return jsonify({
                "status": "error",
                "message": "Invalid answer key ID",
            }), 400

        result = db["answer_keys"].delete_one(
            {
                "_id": object_id,
                "created_by": str(current_user_id),
            }
        )

        if result.deleted_count == 0:
            return jsonify({
                "status": "error",
                "message": "Answer key not found",
            }), 404

        return jsonify({
            "status": "success",
            "message": (
                "Answer key deleted successfully"
            ),
        }), 200

    except Exception as exc:
        print(
            f"❌ Error deleting answer key: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500


# ============================================================
# GET ANSWER KEYS BY SUBJECT
# ============================================================

@answer_key_bp.route(
    "/subject/<subject>",
    methods=["GET"],
)
@jwt_required()
def get_by_subject(subject):
    try:
        db = get_db()

        current_user_id = get_jwt_identity()

        if not subject.strip():
            return jsonify({
                "status": "error",
                "message": "Subject is required",
            }), 400

        escaped_subject = re.escape(
            subject.strip()
        )

        cursor = db["answer_keys"].find(
            {
                "created_by": str(current_user_id),
                "subject": {
                    "$regex": escaped_subject,
                    "$options": "i",
                },
            }
        ).sort(
            "created_at",
            -1,
        )

        result = []

        for key in cursor:
            result.append({
                "id": str(key["_id"]),
                "name": key.get("name", ""),
                "subject": key.get("subject", ""),
                "subject_code": key.get(
                    "subject_code",
                    "",
                ),
                "college_name": key.get(
                    "college_name",
                    "",
                ),
                "department": key.get(
                    "department",
                    "",
                ),
                "semester": key.get(
                    "semester",
                    1,
                ),
                "examination_type": key.get(
                    "examination_type",
                    "",
                ),
                "academic_year": key.get(
                    "academic_year",
                    "",
                ),
                "examination_date": key.get(
                    "examination_date",
                    "",
                ),
                "total_marks": key.get(
                    "total_marks",
                    0,
                ),
                "duration": key.get(
                    "duration",
                    "",
                ),
                "total_questions": key.get(
                    "total_questions",
                    len(key.get("questions", [])),
                ),
                "total_sections": key.get(
                    "total_sections",
                    len(key.get("sections", [])),
                ),
                "created_at": key.get(
                    "created_at",
                    "",
                ),
            })

        return jsonify({
            "status": "success",
            "data": result,
        }), 200

    except Exception as exc:
        print(
            f"❌ Error getting answer keys by subject: {exc}"
        )

        return jsonify({
            "status": "error",
            "message": str(exc),
        }), 500
