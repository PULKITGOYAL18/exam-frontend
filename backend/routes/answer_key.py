# routes/answer_key.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime


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
# SERIALIZATION
# ============================================================

def serialize_answer_key(key):
    """
    Convert MongoDB answer-key document into JSON-safe data.
    """

    return {
        "id": str(key["_id"]),

        # Basic examination details
        "name": key.get("name", ""),
        "subject": key.get("subject", ""),
        "subject_code": key.get("subject_code", ""),
        "college_name": key.get("college_name", ""),
        "department": key.get("department", ""),
        "semester": key.get("semester", 1),

        # Examination details
        "examination_type": key.get("examination_type", ""),
        "academic_year": key.get("academic_year", ""),
        "examination_date": key.get("examination_date", ""),
        "total_marks": key.get("total_marks", 0),
        "duration": key.get("duration", ""),

        # Questions
        "total_questions": key.get("total_questions", 0),
        "questions": key.get("questions", []),

        # Metadata
        "created_at": key.get("created_at", ""),
        "updated_at": key.get("updated_at", ""),
        "created_by": key.get("created_by", ""),
        "creation_mode": key.get("creation_mode", "authenticated")
    }


# ============================================================
# VALIDATION HELPER
# ============================================================

def validate_answer_key_data(data):
    """
    Validate answer-key data.

    Required fields:
        name
        subject
        subject_code
        college_name
        department
        semester
        examination_type
        academic_year
        examination_date
        total_marks
        duration
        questions

    Returns:
        None if valid
        Error message string if invalid
    """

    # --------------------------------------------------------
    # Basic request validation
    # --------------------------------------------------------

    if not data:
        return "Request body is required"

    if not isinstance(data, dict):
        return "Request body must be a JSON object"

    # --------------------------------------------------------
    # Required fields
    # --------------------------------------------------------

    required = [
        "name",
        "subject",
        "subject_code",
        "college_name",
        "department",
        "semester",
        "examination_type",
        "academic_year",
        "examination_date",
        "total_marks",
        "duration",
        "questions"
    ]

    for field in required:
        if field not in data:
            return f"Missing required field: {field}"

    # --------------------------------------------------------
    # String fields
    # --------------------------------------------------------

    string_fields = [
        ("name", "Answer key name"),
        ("subject", "Subject"),
        ("subject_code", "Subject code"),
        ("college_name", "College name"),
        ("department", "Department"),
        ("academic_year", "Academic year"),
        ("examination_date", "Examination date"),
        ("duration", "Duration")
    ]

    for field, display_name in string_fields:

        value = data.get(field)

        if not isinstance(value, str):
            return f"{field} must be a string"

        if not value.strip():
            return f"{display_name} cannot be empty"

    # --------------------------------------------------------
    # Examination type
    # --------------------------------------------------------

    examination_type = data.get("examination_type")

    allowed_exam_types = [
        "Mid Semester",
        "End Semester",
        "Back Exams"
    ]

    if examination_type not in allowed_exam_types:
        return (
            "Invalid examination_type. "
            "Allowed values: Mid Semester, End Semester, Back Exams"
        )

    # --------------------------------------------------------
    # Semester
    # --------------------------------------------------------

    semester = data.get("semester")

    try:
        semester = int(semester)
    except (TypeError, ValueError):
        return "semester must be a number"

    if semester < 1:
        return "semester must be greater than 0"

    # --------------------------------------------------------
    # Total marks
    # --------------------------------------------------------

    total_marks = data.get("total_marks")

    try:
        total_marks = float(total_marks)
    except (TypeError, ValueError):
        return "total_marks must be a number"

    if total_marks <= 0:
        return "total_marks must be greater than 0"

    # --------------------------------------------------------
    # Questions
    # --------------------------------------------------------

    questions = data.get("questions")

    if not isinstance(questions, list):
        return "questions must be an array"

    if len(questions) == 0:
        return "At least one question is required"

    return None


# ============================================================
# BUILD ANSWER KEY DOCUMENT
# ============================================================

def build_answer_key_document(
    data,
    created_by="",
    creation_mode="authenticated"
):
    """
    Build a MongoDB document for:

    1. Authenticated answer-key creation
    2. Public/guest answer-key creation
    """

    now = datetime.now().isoformat()

    questions = data.get("questions", [])

    return {

        # ----------------------------------------------------
        # Examination / Answer Key Information
        # ----------------------------------------------------

        "name": str(
            data.get("name", "")
        ).strip(),

        "subject": str(
            data.get("subject", "")
        ).strip(),

        "subject_code": str(
            data.get("subject_code", "")
        ).strip(),

        "college_name": str(
            data.get("college_name", "")
        ).strip(),

        "department": str(
            data.get("department", "")
        ).strip(),

        "semester": int(
            data.get("semester", 1)
        ),

        # ----------------------------------------------------
        # Examination Information
        # ----------------------------------------------------

        "examination_type": str(
            data.get("examination_type", "")
        ).strip(),

        "academic_year": str(
            data.get("academic_year", "")
        ).strip(),

        "examination_date": str(
            data.get("examination_date", "")
        ).strip(),

        "total_marks": float(
            data.get("total_marks", 0)
        ),

        "duration": str(
            data.get("duration", "")
        ).strip(),

        # ----------------------------------------------------
        # Questions
        # ----------------------------------------------------

        "total_questions": len(questions),

        "questions": questions,

        # ----------------------------------------------------
        # Metadata
        # ----------------------------------------------------

        "created_at": now,

        "updated_at": now,

        "created_by": created_by,

        "creation_mode": creation_mode
    }


# ============================================================
# LIST ANSWER KEYS
# ============================================================

@answer_key_bp.route(
    "/list",
    methods=["GET"]
)
@jwt_required()
def list_answer_keys():

    try:

        db = get_db()

        current_user_id = get_jwt_identity()

        print(
            f"📌 Current user ID: {current_user_id}"
        )

        if not current_user_id:

            return jsonify({
                "status": "error",
                "message": "User identity not found in token"
            }), 401

        answer_keys_collection = db["answer_keys"]

        keys = answer_keys_collection.find({
            "created_by": current_user_id
        })

        result = []

        for key in keys:

            result.append({
                "id": str(key["_id"]),

                "name": key.get(
                    "name",
                    ""
                ),

                "subject": key.get(
                    "subject",
                    ""
                ),

                "subject_code": key.get(
                    "subject_code",
                    ""
                ),

                "college_name": key.get(
                    "college_name",
                    ""
                ),

                "department": key.get(
                    "department",
                    ""
                ),

                "semester": key.get(
                    "semester",
                    1
                ),

                "examination_type": key.get(
                    "examination_type",
                    ""
                ),

                "academic_year": key.get(
                    "academic_year",
                    ""
                ),

                "examination_date": key.get(
                    "examination_date",
                    ""
                ),

                "total_marks": key.get(
                    "total_marks",
                    0
                ),

                "duration": key.get(
                    "duration",
                    ""
                ),

                "total_questions": key.get(
                    "total_questions",
                    0
                ),

                "created_at": key.get(
                    "created_at",
                    ""
                )
            })

        return jsonify({
            "status": "success",
            "data": result
        }), 200

    except Exception as e:

        print(
            f"❌ Error listing answer keys: {e}"
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# ============================================================
# AUTHENTICATED CREATE ANSWER KEY
# ============================================================

@answer_key_bp.route(
    "/create",
    methods=["POST"]
)
@jwt_required()
def create_answer_key():

    try:

        db = get_db()

        data = request.get_json(
            silent=True
        )

        # ----------------------------------------------------
        # Validate
        # ----------------------------------------------------

        validation_error = (
            validate_answer_key_data(data)
        )

        if validation_error:

            return jsonify({
                "status": "error",
                "message": validation_error
            }), 400

        # ----------------------------------------------------
        # Get authenticated user
        # ----------------------------------------------------

        current_user_id = get_jwt_identity()

        if not current_user_id:

            return jsonify({
                "status": "error",
                "message": "User identity not found in token"
            }), 401

        answer_keys_collection = db[
            "answer_keys"
        ]

        # ----------------------------------------------------
        # Build document
        # ----------------------------------------------------

        answer_key = build_answer_key_document(
            data=data,
            created_by=current_user_id,
            creation_mode="authenticated"
        )

        # ----------------------------------------------------
        # Insert
        # ----------------------------------------------------

        result = answer_keys_collection.insert_one(
            answer_key
        )

        # ----------------------------------------------------
        # Retrieve created document
        # ----------------------------------------------------

        created = answer_keys_collection.find_one({
            "_id": result.inserted_id
        })

        print(
            f"✅ Authenticated answer key created: "
            f"{result.inserted_id}"
        )

        return jsonify({
            "status": "success",
            "message": "Answer key created successfully",
            "data": serialize_answer_key(
                created
            )
        }), 201

    except Exception as e:

        print(
            f"❌ Error creating answer key: {e}"
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# ============================================================
# PUBLIC / GUEST CREATE ANSWER KEY
# ============================================================

@answer_key_bp.route(
    "/public-create",
    methods=["POST"]
)
def create_public_answer_key():

    try:

        print(
            "🌐 Public answer-key creation request received"
        )

        db = get_db()

        data = request.get_json(
            silent=True
        )

        # ----------------------------------------------------
        # Validate
        # ----------------------------------------------------

        validation_error = (
            validate_answer_key_data(data)
        )

        if validation_error:

            print(
                "⚠️ Public answer-key validation failed: "
                f"{validation_error}"
            )

            return jsonify({
                "status": "error",
                "message": validation_error
            }), 400

        # ----------------------------------------------------
        # MongoDB collection
        # ----------------------------------------------------

        answer_keys_collection = db[
            "answer_keys"
        ]

        # ----------------------------------------------------
        # Create public answer key
        # ----------------------------------------------------

        answer_key = build_answer_key_document(
            data=data,
            created_by="",
            creation_mode="public"
        )

        # ----------------------------------------------------
        # Insert
        # ----------------------------------------------------

        result = answer_keys_collection.insert_one(
            answer_key
        )

        # ----------------------------------------------------
        # Retrieve
        # ----------------------------------------------------

        created = answer_keys_collection.find_one({
            "_id": result.inserted_id
        })

        if not created:

            return jsonify({
                "status": "error",
                "message": (
                    "Answer key was created but "
                    "could not be retrieved"
                )
            }), 500

        print(
            f"✅ Public answer key created: "
            f"{result.inserted_id}"
        )

        # ----------------------------------------------------
        # Return
        # ----------------------------------------------------

        return jsonify({
            "status": "success",
            "message": "Answer key created successfully",
            "data": serialize_answer_key(
                created
            )
        }), 201

    except Exception as e:

        print(
            f"❌ Error creating public answer key: {e}"
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# ============================================================
# GET ANSWER KEY BY ID
# ============================================================

@answer_key_bp.route(
    "/<key_id>",
    methods=["GET"]
)
@jwt_required()
def get_answer_key(key_id):

    try:

        db = get_db()

        current_user_id = get_jwt_identity()

        answer_keys_collection = db[
            "answer_keys"
        ]

        # ----------------------------------------------------
        # Validate ObjectId
        # ----------------------------------------------------

        try:

            object_id = ObjectId(key_id)

        except Exception:

            return jsonify({
                "status": "error",
                "message": "Invalid answer key ID"
            }), 400

        # ----------------------------------------------------
        # Find
        # ----------------------------------------------------

        key = answer_keys_collection.find_one({
            "_id": object_id,
            "created_by": current_user_id
        })

        if not key:

            return jsonify({
                "status": "error",
                "message": "Answer key not found"
            }), 404

        return jsonify({
            "status": "success",
            "data": serialize_answer_key(
                key
            )
        }), 200

    except Exception as e:

        print(
            f"❌ Error getting answer key: {e}"
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# ============================================================
# UPDATE ANSWER KEY
# ============================================================

@answer_key_bp.route(
    "/<key_id>",
    methods=["PUT"]
)
@jwt_required()
def update_answer_key(key_id):

    try:

        db = get_db()

        current_user_id = get_jwt_identity()

        data = request.get_json(
            silent=True
        )

        answer_keys_collection = db[
            "answer_keys"
        ]

        # ----------------------------------------------------
        # Validate ObjectId
        # ----------------------------------------------------

        try:

            object_id = ObjectId(key_id)

        except Exception:

            return jsonify({
                "status": "error",
                "message": "Invalid answer key ID"
            }), 400

        # ----------------------------------------------------
        # Find existing key
        # ----------------------------------------------------

        key = answer_keys_collection.find_one({
            "_id": object_id,
            "created_by": current_user_id
        })

        if not key:

            return jsonify({
                "status": "error",
                "message": "Answer key not found"
            }), 404

        if not data:

            return jsonify({
                "status": "error",
                "message": "Request body is required"
            }), 400

        # ----------------------------------------------------
        # Fields allowed to update
        # ----------------------------------------------------

        allowed_fields = [
            "name",
            "subject",
            "subject_code",
            "college_name",
            "department",
            "semester",
            "examination_type",
            "academic_year",
            "examination_date",
            "total_marks",
            "duration",
            "questions"
        ]

        update_fields = {}

        for field in allowed_fields:

            if field in data:

                update_fields[field] = data[field]

        # ----------------------------------------------------
        # Validate individual values
        # ----------------------------------------------------

        if "name" in update_fields:

            if not isinstance(
                update_fields["name"],
                str
            ) or not update_fields["name"].strip():

                return jsonify({
                    "status": "error",
                    "message": "Answer key name cannot be empty"
                }), 400

            update_fields["name"] = (
                update_fields["name"].strip()
            )

        if "subject" in update_fields:

            if not isinstance(
                update_fields["subject"],
                str
            ) or not update_fields["subject"].strip():

                return jsonify({
                    "status": "error",
                    "message": "Subject cannot be empty"
                }), 400

            update_fields["subject"] = (
                update_fields["subject"].strip()
            )

        if "subject_code" in update_fields:

            if not isinstance(
                update_fields["subject_code"],
                str
            ) or not update_fields["subject_code"].strip():

                return jsonify({
                    "status": "error",
                    "message": "Subject code cannot be empty"
                }), 400

            update_fields["subject_code"] = (
                update_fields["subject_code"].strip()
            )

        if "college_name" in update_fields:

            if not isinstance(
                update_fields["college_name"],
                str
            ) or not update_fields["college_name"].strip():

                return jsonify({
                    "status": "error",
                    "message": "College name cannot be empty"
                }), 400

            update_fields["college_name"] = (
                update_fields["college_name"].strip()
            )

        if "department" in update_fields:

            if not isinstance(
                update_fields["department"],
                str
            ) or not update_fields["department"].strip():

                return jsonify({
                    "status": "error",
                    "message": "Department cannot be empty"
                }), 400

            update_fields["department"] = (
                update_fields["department"].strip()
            )

        if "semester" in update_fields:

            try:

                semester = int(
                    update_fields["semester"]
                )

                if semester < 1:
                    raise ValueError

                update_fields["semester"] = semester

            except (TypeError, ValueError):

                return jsonify({
                    "status": "error",
                    "message": "Invalid semester"
                }), 400

        if "examination_type" in update_fields:

            allowed_exam_types = [
                "Mid Semester",
                "End Semester",
                "Back Exams"
            ]

            if (
                update_fields["examination_type"]
                not in allowed_exam_types
            ):

                return jsonify({
                    "status": "error",
                    "message": (
                        "Invalid examination type. "
                        "Allowed values: "
                        "Mid Semester, End Semester, Back Exams"
                    )
                }), 400

        if "academic_year" in update_fields:

            if not isinstance(
                update_fields["academic_year"],
                str
            ) or not update_fields["academic_year"].strip():

                return jsonify({
                    "status": "error",
                    "message": "Academic year cannot be empty"
                }), 400

            update_fields["academic_year"] = (
                update_fields["academic_year"].strip()
            )

        if "examination_date" in update_fields:

            if not isinstance(
                update_fields["examination_date"],
                str
            ) or not update_fields["examination_date"].strip():

                return jsonify({
                    "status": "error",
                    "message": "Examination date cannot be empty"
                }), 400

            update_fields["examination_date"] = (
                update_fields["examination_date"].strip()
            )

        if "duration" in update_fields:

            if not isinstance(
                update_fields["duration"],
                str
            ) or not update_fields["duration"].strip():

                return jsonify({
                    "status": "error",
                    "message": "Duration cannot be empty"
                }), 400

            update_fields["duration"] = (
                update_fields["duration"].strip()
            )

        if "total_marks" in update_fields:

            try:

                total_marks = float(
                    update_fields["total_marks"]
                )

                if total_marks <= 0:
                    raise ValueError

                update_fields["total_marks"] = total_marks

            except (TypeError, ValueError):

                return jsonify({
                    "status": "error",
                    "message": "Invalid total marks"
                }), 400

        # ----------------------------------------------------
        # Questions
        # ----------------------------------------------------

        if "questions" in update_fields:

            questions = update_fields[
                "questions"
            ]

            if not isinstance(
                questions,
                list
            ):

                return jsonify({
                    "status": "error",
                    "message": "questions must be an array"
                }), 400

            if len(questions) == 0:

                return jsonify({
                    "status": "error",
                    "message": (
                        "At least one question is required"
                    )
                }), 400

            update_fields[
                "total_questions"
            ] = len(questions)

        # ----------------------------------------------------
        # Updated timestamp
        # ----------------------------------------------------

        update_fields[
            "updated_at"
        ] = datetime.now().isoformat()

        # ----------------------------------------------------
        # Update MongoDB
        # ----------------------------------------------------

        answer_keys_collection.update_one(
            {
                "_id": object_id,
                "created_by": current_user_id
            },
            {
                "$set": update_fields
            }
        )

        # ----------------------------------------------------
        # Retrieve updated document
        # ----------------------------------------------------

        updated = answer_keys_collection.find_one({
            "_id": object_id
        })

        return jsonify({
            "status": "success",
            "message": "Answer key updated successfully",
            "data": serialize_answer_key(
                updated
            )
        }), 200

    except Exception as e:

        print(
            f"❌ Error updating answer key: {e}"
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# ============================================================
# DELETE ANSWER KEY
# ============================================================

@answer_key_bp.route(
    "/<key_id>",
    methods=["DELETE"]
)
@jwt_required()
def delete_answer_key(key_id):

    try:

        db = get_db()

        current_user_id = get_jwt_identity()

        answer_keys_collection = db[
            "answer_keys"
        ]

        # ----------------------------------------------------
        # Validate ObjectId
        # ----------------------------------------------------

        try:

            object_id = ObjectId(key_id)

        except Exception:

            return jsonify({
                "status": "error",
                "message": "Invalid answer key ID"
            }), 400

        # ----------------------------------------------------
        # Delete
        # ----------------------------------------------------

        result = answer_keys_collection.delete_one({
            "_id": object_id,
            "created_by": current_user_id
        })

        if result.deleted_count == 0:

            return jsonify({
                "status": "error",
                "message": "Answer key not found"
            }), 404

        return jsonify({
            "status": "success",
            "message": "Answer key deleted successfully"
        }), 200

    except Exception as e:

        print(
            f"❌ Error deleting answer key: {e}"
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


# ============================================================
# GET ANSWER KEYS BY SUBJECT
# ============================================================

@answer_key_bp.route(
    "/subject/<subject>",
    methods=["GET"]
)
@jwt_required()
def get_by_subject(subject):

    try:

        db = get_db()

        current_user_id = get_jwt_identity()

        answer_keys_collection = db[
            "answer_keys"
        ]

        keys = answer_keys_collection.find({
            "created_by": current_user_id,

            "subject": {
                "$regex": subject,
                "$options": "i"
            }
        })

        result = []

        for key in keys:

            result.append({
                "id": str(
                    key["_id"]
                ),

                "name": key.get(
                    "name",
                    ""
                ),

                "subject": key.get(
                    "subject",
                    ""
                ),

                "subject_code": key.get(
                    "subject_code",
                    ""
                ),

                "college_name": key.get(
                    "college_name",
                    ""
                ),

                "department": key.get(
                    "department",
                    ""
                ),

                "semester": key.get(
                    "semester",
                    1
                ),

                "examination_type": key.get(
                    "examination_type",
                    ""
                ),

                "academic_year": key.get(
                   "academic_year",
                    ""
                ),

                "examination_date": key.get(
                    "examination_date",
                    ""
                ),

                "total_marks": key.get(
                    "total_marks",
                    0
                ),

                "duration": key.get(
                    "duration",
                    ""
                ),

                "total_questions": key.get(
                    "total_questions",
                    0
                ),

                "created_at": key.get(
                    "created_at",
                    ""
                )
            })

        return jsonify({
            "status": "success",
            "data": result
        }), 200

    except Exception as e:

        print(
            f"❌ Error getting answer keys by subject: {e}"
        )

        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500