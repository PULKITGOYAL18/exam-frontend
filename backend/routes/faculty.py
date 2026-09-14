
# routes/faculty.py

from functools import wraps
from bson import ObjectId
from flask import Blueprint, request, jsonify

import jwt
import os

from utils.notification_service import build_notification


# ============================================================
# Faculty Blueprint
# ============================================================

faculty_bp = Blueprint(
    "faculty",
    __name__,
    url_prefix="/api/faculty"
)


# ============================================================
# Database
# ============================================================

def get_database():
    """
    Get the existing MongoDB database connection.

    app.py exposes the database as `db`.
    """

    from app import db

    if db is None:
        raise RuntimeError(
            "Database connection is not available"
        )

    return db


# ============================================================
# Faculty Authentication
# ============================================================

def faculty_required(f):
    """
    Allow access only to authenticated Faculty users.

    Expects:

        Authorization: Bearer <JWT_TOKEN>

    JWT payload should contain:

        user_id
        role
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):

        auth_header = request.headers.get(
            "Authorization",
            ""
        )

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "success": False,
                "message": "Authorization token is required"
            }), 401

        token = auth_header.split(
            " ",
            1
        )[1].strip()

        if not token:
            return jsonify({
                "success": False,
                "message": "Authorization token is required"
            }), 401

        try:

            secret = os.getenv("JWT_SECRET")

            if not secret:
                return jsonify({
                    "success": False,
                    "message": "JWT_SECRET is not configured"
                }), 500

            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"]
            )

            role = payload.get("role")

            if isinstance(role, str):
                role = role.strip().lower()

            if role != "faculty":
                return jsonify({
                    "success": False,
                    "message": "Faculty access required"
                }), 403

            # Attach authenticated user information
            # to Flask request object.
            request.current_user = payload

            return f(*args, **kwargs)

        except jwt.ExpiredSignatureError:

            return jsonify({
                "success": False,
                "message": "Authentication token has expired"
            }), 401

        except jwt.InvalidTokenError:

            return jsonify({
                "success": False,
                "message": "Invalid authentication token"
            }), 401

        except Exception as e:

            print(
                "FACULTY AUTH ERROR:",
                str(e)
            )

            return jsonify({
                "success": False,
                "message": "Authentication failed"
            }), 401

    return decorated_function


# ============================================================
# Get Current Faculty
# ============================================================

def get_current_faculty():
    """
    Get the currently authenticated Faculty user
    from the users collection.
    """

    payload = getattr(
        request,
        "current_user",
        {}
    )

    user_id = payload.get(
        "user_id"
    )

    if not user_id:
        return None

    if not ObjectId.is_valid(
        str(user_id)
    ):
        return None

    db = get_database()

    return db.users.find_one(
        {
            "_id": ObjectId(
                str(user_id)
            ),
            "role": "faculty"
        },
        {
            "password": 0
        }
    )


# ============================================================
# Serialize User
# ============================================================

def serialize_user(user):
    """
    Convert MongoDB user document into
    frontend-safe JSON.
    """

    return {
        "id": str(
            user["_id"]
        ),
        "name": user.get(
            "name"
        ),
        "email": user.get(
            "email"
        ),
        "employeeId": user.get(
            "employeeId"
        ),
        "role": user.get(
            "role"
        ),
        "status": user.get(
            "status"
        ),
        "department": user.get(
            "department"
        ),
        "designation": user.get(
            "designation"
        )
    }


# ============================================================
# GET CURRENT FACULTY PROFILE
# ============================================================

@faculty_bp.route(
    "/me",
    methods=["GET"]
)
@faculty_required
def get_current_faculty_profile():

    try:

        faculty = get_current_faculty()

        if not faculty:

            return jsonify({
                "success": False,
                "message": "Faculty user not found"
            }), 404

        return jsonify({
            "success": True,
            "user": serialize_user(
                faculty
            )
        }), 200

    except Exception as e:

        print(
            "GET FACULTY PROFILE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": "Unable to retrieve faculty profile"
        }), 500


# ============================================================
# GET NOTIFICATION RECIPIENTS
# ============================================================

@faculty_bp.route(
    "/notification-recipients",
    methods=["GET"]
)
@faculty_required
def get_notification_recipients():

    """
    Get users that Faculty is allowed to notify.

    Faculty can notify:

        - Faculty
        - HOD
        - Dean

    Admin is intentionally excluded.

    The currently logged-in Faculty is also excluded
    from the recipient list.
    """

    try:

        db = get_database()

        current_faculty = get_current_faculty()

        if not current_faculty:

            return jsonify({
                "success": False,
                "message": "Faculty user not found"
            }), 404

        current_faculty_id = str(
            current_faculty["_id"]
        )

        users = list(
            db.users.find(
                {
                    "role": {
                        "$in": [
                            "faculty",
                            "hod",
                            "dean"
                        ]
                    },
                    "status": {
                        "$ne": "suspended"
                    },
                    "_id": {
                        "$ne": current_faculty["_id"]
                    }
                },
                {
                    "password": 0
                }
            ).sort(
                [
                    ("role", 1),
                    ("name", 1)
                ]
            )
        )

        recipients = [
            serialize_user(user)
            for user in users
        ]

        return jsonify({
            "success": True,
            "recipients": recipients,
            "total": len(recipients)
        }), 200

    except Exception as e:

        print(
            "GET FACULTY NOTIFICATION RECIPIENTS ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": "Unable to retrieve notification recipients"
        }), 500


# ============================================================
# GET USERS BY ROLE
# ============================================================

@faculty_bp.route(
    "/notification-recipients/<role>",
    methods=["GET"]
)
@faculty_required
def get_notification_recipients_by_role(role):

    """
    Get Faculty notification recipients by role.

    Allowed roles:

        faculty
        hod
        dean
    """

    try:

        role = str(
            role
        ).strip().lower()

        allowed_roles = [
            "faculty",
            "hod",
            "dean"
        ]

        if role not in allowed_roles:

            return jsonify({
                "success": False,
                "message": "Invalid recipient role",
                "allowedRoles": allowed_roles
            }), 400

        db = get_database()

        current_faculty = get_current_faculty()

        if not current_faculty:

            return jsonify({
                "success": False,
                "message": "Faculty user not found"
            }), 404

        users = list(
            db.users.find(
                {
                    "role": role,
                    "status": {
                        "$ne": "suspended"
                    },
                    "_id": {
                        "$ne": current_faculty["_id"]
                    }
                },
                {
                    "password": 0
                }
            ).sort(
                "name",
                1
            )
        )

        recipients = [
            serialize_user(user)
            for user in users
        ]

        return jsonify({
            "success": True,
            "role": role,
            "recipients": recipients,
            "total": len(recipients)
        }), 200

    except Exception as e:

        print(
            "GET FACULTY ROLE RECIPIENTS ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": "Unable to retrieve recipients"
        }), 500


# ============================================================
# CREATE FACULTY NOTIFICATION
# ============================================================

@faculty_bp.route(
    "/notifications",
    methods=["POST"]
)
@faculty_required
def create_faculty_notification():

    """
    Faculty sends a notification to one or more:

        Faculty
        HOD
        Dean

    Expected JSON:

    {
        "recipient_ids": [
            "USER_ID_1",
            "USER_ID_2"
        ],
        "title": "Important Notice",
        "message": "Please review the examination.",
        "type": "system"
    }

    The backend determines recipient roles from
    MongoDB. The frontend cannot fake recipient_role.
    """

    try:

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        # ----------------------------------------------------
        # Request values
        # ----------------------------------------------------

        recipient_ids = data.get(
            "recipient_ids"
        )

        title = data.get(
            "title"
        )

        message = data.get(
            "message"
        )

        notification_type = data.get(
            "type",
            "system"
        )

        # ----------------------------------------------------
        # Validate recipient IDs
        # ----------------------------------------------------

        if not isinstance(
            recipient_ids,
            list
        ):

            return jsonify({
                "success": False,
                "message": "recipient_ids must be an array"
            }), 400

        recipient_ids = [
            str(recipient_id).strip()
            for recipient_id in recipient_ids
            if str(recipient_id).strip()
        ]

        # Remove duplicates
        recipient_ids = list(
            dict.fromkeys(
                recipient_ids
            )
        )

        if not recipient_ids:

            return jsonify({
                "success": False,
                "message": "At least one recipient is required"
            }), 400

        # ----------------------------------------------------
        # Validate title
        # ----------------------------------------------------

        if not isinstance(
            title,
            str
        ) or not title.strip():

            return jsonify({
                "success": False,
                "message": "Notification title is required"
            }), 400

        title = title.strip()

        if len(title) > 150:

            return jsonify({
                "success": False,
                "message": "Notification title cannot exceed 150 characters"
            }), 400

        # ----------------------------------------------------
        # Validate message
        # ----------------------------------------------------

        if not isinstance(
            message,
            str
        ) or not message.strip():

            return jsonify({
                "success": False,
                "message": "Notification message is required"
            }), 400

        message = message.strip()

        if len(message) > 2000:

            return jsonify({
                "success": False,
                "message": "Notification message cannot exceed 2000 characters"
            }), 400

        # ----------------------------------------------------
        # Validate notification type
        # ----------------------------------------------------

        if not isinstance(
            notification_type,
            str
        ):

            notification_type = "system"

        notification_type = (
            notification_type
            .strip()
            .lower()
        )

        allowed_types = [
            "system",
            "announcement",
            "exam",
            "upload",
            "evaluation",
            "verification",
            "hod_review",
            "dean_review",
            "result",
            "account",
            "info"
        ]

        if notification_type not in allowed_types:

            notification_type = "system"

        # ----------------------------------------------------
        # Database
        # ----------------------------------------------------

        db = get_database()

        current_faculty = get_current_faculty()

        if not current_faculty:

            return jsonify({
                "success": False,
                "message": "Faculty user not found"
            }), 404

        current_faculty_id = str(
            current_faculty["_id"]
        )

        # ----------------------------------------------------
        # Validate all recipients from DB
        # ----------------------------------------------------

        valid_object_ids = []

        for recipient_id in recipient_ids:

            if not ObjectId.is_valid(
                recipient_id
            ):

                return jsonify({
                    "success": False,
                    "message": f"Invalid recipient ID: {recipient_id}"
                }), 400

            valid_object_ids.append(
                ObjectId(recipient_id)
            )

        users = list(
            db.users.find(
                {
                    "_id": {
                        "$in": valid_object_ids
                    },
                    "role": {
                        "$in": [
                            "faculty",
                            "hod",
                            "dean"
                        ]
                    },
                    "status": {
                        "$ne": "suspended"
                    }
                },
                {
                    "password": 0
                }
            )
        )

        # ----------------------------------------------------
        # Check recipient count
        # ----------------------------------------------------

        if not users:

            return jsonify({
                "success": False,
                "message": "No valid notification recipients were found"
            }), 404

        # ----------------------------------------------------
        # Prevent Faculty from notifying themselves
        # ----------------------------------------------------

        users = [
            user
            for user in users
            if str(
                user["_id"]
            ) != current_faculty_id
        ]

        if not users:

            return jsonify({
                "success": False,
                "message": "You cannot send a notification to yourself"
            }), 400

        # ----------------------------------------------------
        # Create notifications
        # ----------------------------------------------------

        created_count = 0

        # Create one notification per recipient.
        #
        # This uses the existing notification service,
        # which stores documents in the existing
        # `notifications` MongoDB collection.

        for user in users:

            recipient_id = str(
                user["_id"]
            )

            recipient_role = (
                user.get(
                    "role"
                )
            )

            if isinstance(
                recipient_role,
                str
            ):

                recipient_role = (
                    recipient_role
                    .strip()
                    .lower()
                )

            result = build_notification(
                recipients=[
                    recipient_id
                ],
                title=title,
                message=message,
                notification_type=notification_type,
                recipient_role=recipient_role
            )

            if result:
                created_count += result

        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return jsonify({
            "success": True,
            "message": (
                f"Notification sent to "
                f"{created_count} user"
                f"{'' if created_count == 1 else 's'}"
            ),
            "recipient_count": created_count,
            "sender": {
                "id": current_faculty_id,
                "name": current_faculty.get(
                    "name"
                ),
                "role": "faculty"
            }
        }), 201

    except Exception as e:

        print(
            "CREATE FACULTY NOTIFICATION ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "message": "Unable to create notification"
        }), 500


# ============================================================
# FACULTY DASHBOARD HEALTH CHECK
# ============================================================

@faculty_bp.route(
    "/health",
    methods=["GET"]
)
def faculty_health():

    return jsonify({
        "success": True,
        "service": "faculty",
        "message": "Faculty API is running"
    }), 200
