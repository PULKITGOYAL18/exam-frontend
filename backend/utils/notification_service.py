"""
Notification Service
====================

Reusable backend notification service.

Main function:

    send_notify(message, receiver)

Example:

    from services.notification_service import send_notify

    send_notify(
        message="AI evaluation completed successfully.",
        receiver=faculty_id
    )

Optional:

    send_notify(
        message="5 answer sheets require verification.",
        receiver=faculty_id,
        title="Verification Required",
        notification_type="evaluation"
    )

This service writes directly to the MongoDB notifications
collection.

The API routes in notification_routes.py remain responsible
for frontend/API operations such as fetching notifications,
marking them as read, deleting them, etc.
"""

from datetime import datetime, timezone
from bson import ObjectId


# ============================================================
# DATABASE
# ============================================================

def get_db():
    """
    Get the existing MongoDB database connection.

    The project currently exposes the database through app.db.
    """

    from app import db

    if db is None:
        raise RuntimeError(
            "Database connection is not available"
        )

    return db


# ============================================================
# DATETIME
# ============================================================

def utc_now():
    """
    Return the current UTC datetime.
    """

    return datetime.now(timezone.utc)


# ============================================================
# NORMALIZE RECEIVER
# ============================================================

def normalize_receiver(receiver):
    """
    Convert different receiver formats into a MongoDB
    user ObjectId.

    Supported:

        ObjectId(...)
        "6a7dab8c0f532d81b37a0008"

    Returns:

        ObjectId

    Raises:

        ValueError if receiver is invalid.
    """

    if receiver is None:
        raise ValueError(
            "Receiver is required"
        )

    # Already ObjectId
    if isinstance(receiver, ObjectId):
        return receiver

    # Convert to string
    receiver = str(receiver).strip()

    if not receiver:
        raise ValueError(
            "Receiver cannot be empty"
        )

    try:

        return ObjectId(receiver)

    except Exception:

        raise ValueError(
            f"Invalid receiver ID: {receiver}"
        )


# ============================================================
# GET RECEIVER USER
# ============================================================

def get_receiver_user(receiver):
    """
    Find the receiver in MongoDB.

    Returns the complete user document.

    Raises ValueError if the user does not exist.
    """

    db = get_db()

    receiver_object_id = normalize_receiver(
        receiver
    )

    user = db.users.find_one(
        {
            "_id": receiver_object_id
        },
        {
            "_id": 1,
            "name": 1,
            "email": 1,
            "role": 1,
            "department": 1,
            "designation": 1,
            "employeeId": 1,
            "status": 1
        }
    )

    if not user:

        raise ValueError(
            "Receiver user not found"
        )

    # Optional status check
    status = str(
        user.get("status", "active")
    ).strip().lower()

    if status and status != "active":

        raise ValueError(
            "Receiver user is inactive"
        )

    return user


# ============================================================
# CREATE NOTIFICATION DOCUMENT
# ============================================================

def build_notification(
    receiver_user,
    title,
    message,
    notification_type="info"
):
    """
    Build a notification MongoDB document.
    """

    user_role = receiver_user.get(
        "role"
    )

    if isinstance(
        user_role,
        str
    ):

        user_role = (
            user_role
            .strip()
            .lower()
        )

    now = utc_now()

    return {

        "recipient_id":
            str(
                receiver_user["_id"]
            ),

        "recipient_role":
            user_role,

        "title":
            title,

        "message":
            message,

        "type":
            notification_type,

        "is_read":
            False,

        "created_at":
            now,

        "read_at":
            None

    }


# ============================================================
# SEND NOTIFY
# ============================================================

def send_notify(
    message,
    receiver,
    title="Notification",
    notification_type="info"
):
    """
    Main reusable notification function.

    ------------------------------------------------------------
    SIMPLE USAGE
    ------------------------------------------------------------

    send_notify(
        message="AI evaluation completed.",
        receiver=faculty_id
    )

    ------------------------------------------------------------
    FULL USAGE
    ------------------------------------------------------------

    send_notify(
        message="5 answer sheets require verification.",
        receiver=faculty_id,
        title="Verification Required",
        notification_type="evaluation"
    )

    ------------------------------------------------------------
    PARAMETERS
    ------------------------------------------------------------

    message:
        Notification message.

    receiver:
        MongoDB user ID of the person who should receive
        the notification.

    title:
        Optional notification title.

    notification_type:
        Optional type such as:

            info
            exam
            evaluation
            verification
            answer_key
            announcement
            system
            success
            warning

    ------------------------------------------------------------
    RETURNS
    ------------------------------------------------------------

    Returns a dictionary:

    {
        "success": True,
        "notification_id": "...",
        "recipient_id": "...",
        "recipient_role": "...",
        "title": "...",
        "message": "...",
        "type": "...",
        "created_at": "..."
    }

    Raises:
        ValueError for invalid input or receiver.
        RuntimeError for database errors.
    """

    # --------------------------------------------------------
    # VALIDATE MESSAGE
    # --------------------------------------------------------

    if message is None:

        raise ValueError(
            "Notification message is required"
        )

    message = str(
        message
    ).strip()

    if not message:

        raise ValueError(
            "Notification message cannot be empty"
        )

    # --------------------------------------------------------
    # VALIDATE TITLE
    # --------------------------------------------------------

    if title is None:

        title = "Notification"

    title = str(
        title
    ).strip()

    if not title:

        title = "Notification"

    # --------------------------------------------------------
    # VALIDATE TYPE
    # --------------------------------------------------------

    if notification_type is None:

        notification_type = "info"

    notification_type = str(
        notification_type
    ).strip()

    if not notification_type:

        notification_type = "info"

    # --------------------------------------------------------
    # FIND RECEIVER
    # --------------------------------------------------------

    try:

        receiver_user = get_receiver_user(
            receiver
        )

    except ValueError:

        raise

    except Exception as e:

        raise RuntimeError(
            f"Unable to find notification receiver: {e}"
        )

    # --------------------------------------------------------
    # BUILD DOCUMENT
    # --------------------------------------------------------

    notification = build_notification(
        receiver_user=receiver_user,
        title=title,
        message=message,
        notification_type=notification_type
    )

    # --------------------------------------------------------
    # INSERT
    # --------------------------------------------------------

    try:

        db = get_db()

        result = db.notifications.insert_one(
            notification
        )

    except Exception as e:

        raise RuntimeError(
            f"Unable to create notification: {e}"
        )

    # --------------------------------------------------------
    # ID
    # --------------------------------------------------------

    notification_id = str(
        result.inserted_id
    )

    # --------------------------------------------------------
    # DEBUG
    # --------------------------------------------------------

    print(
        "========================================"
    )

    print(
        "🔔 NOTIFICATION SERVICE"
    )

    print(
        "🔔 NOTIFICATION ID:",
        notification_id
    )

    print(
        "🔔 RECIPIENT:",
        notification[
            "recipient_id"
        ]
    )

    print(
        "🔔 RECIPIENT ROLE:",
        notification[
            "recipient_role"
        ]
    )

    print(
        "🔔 TITLE:",
        notification[
            "title"
        ]
    )

    print(
        "🔔 MESSAGE:",
        notification[
            "message"
        ]
    )

    print(
        "🔔 TYPE:",
        notification[
            "type"
        ]
    )

    print(
        "🔔 CREATED AT:",
        notification[
            "created_at"
        ].isoformat()
    )

    print(
        "========================================"
    )

    # --------------------------------------------------------
    # RETURN
    # --------------------------------------------------------

    return {

        "success":
            True,

        "notification_id":
            notification_id,

        "recipient_id":
            notification[
                "recipient_id"
            ],

        "recipient_role":
            notification[
                "recipient_role"
            ],

        "title":
            notification[
                "title"
            ],

        "message":
            notification[
                "message"
            ],

        "type":
            notification[
                "type"
            ],

        "created_at":
            notification[
                "created_at"
            ].isoformat()

    }


# ============================================================
# SEND NOTIFY SAFELY
# ============================================================

def try_send_notify(
    message,
    receiver,
    title="Notification",
    notification_type="info"
):
    """
    Safe version of send_notify().

    This function DOES NOT raise an exception.

    Useful inside AI pipelines where a notification failure
    should not stop the main AI/evaluation process.

    Example:

        try_send_notify(
            message="Evaluation completed.",
            receiver=faculty_id
        )

    Returns:

        {
            "success": True,
            ...
        }

    OR:

        {
            "success": False,
            "message": "..."
        }
    """

    try:

        return send_notify(
            message=message,
            receiver=receiver,
            title=title,
            notification_type=notification_type
        )

    except Exception as e:

        print(
            "⚠️ Notification failed:",
            str(e)
        )

        return {

            "success":
                False,

            "message":
                str(e)

        }


# ============================================================
# SEND NOTIFY TO ROLE
# ============================================================

def send_notify_to_role(
    message,
    role,
    title="Notification",
    notification_type="info"
):
    """
    Send the same notification to every user
    having the specified role.

    Example:

        send_notify_to_role(
            message="New exam has been created.",
            role="faculty",
            title="New Exam",
            notification_type="exam"
        )
    """

    if not message:

        raise ValueError(
            "Notification message is required"
        )

    role = str(
        role
    ).strip().lower()

    if not role:

        raise ValueError(
            "Role is required"
        )

    db = get_db()

    users = list(
        db.users.find(
            {
                "role": role,
                "status": "active"
            },
            {
                "_id": 1,
                "role": 1
            }
        )
    )

    results = []

    for user in users:

        try:

            result = send_notify(
                message=message,
                receiver=str(
                    user["_id"]
                ),
                title=title,
                notification_type=notification_type
            )

            results.append(result)

        except Exception as e:

            results.append({

                "success":
                    False,

                "recipient_id":
                    str(
                        user["_id"]
                    ),

                "message":
                    str(e)

            })

    return {

        "success":
            True,

        "role":
            role,

        "recipient_count":
            len(users),

        "sent_count":
            len([
                result
                for result
                in results
                if result.get(
                    "success"
                )
            ]),

        "results":
            results

    }


# ============================================================
# SEND NOTIFY TO EVERYONE
# ============================================================

def send_notify_to_all(
    message,
    title="Notification",
    notification_type="system"
):
    """
    Send notification to every active user.

    Example:

        send_notify_to_all(
            message="System maintenance tonight.",
            title="System Maintenance",
            notification_type="system"
        )
    """

    if not message:

        raise ValueError(
            "Notification message is required"
        )

    db = get_db()

    users = list(
        db.users.find(
            {
                "status": "active"
            },
            {
                "_id": 1,
                "role": 1
            }
        )
    )

    results = []

    for user in users:

        try:

            result = send_notify(
                message=message,
                receiver=str(
                    user["_id"]
                ),
                title=title,
                notification_type=notification_type
            )

            results.append(result)

        except Exception as e:

            results.append({

                "success":
                    False,

                "recipient_id":
                    str(
                        user["_id"]
                    ),

                "message":
                    str(e)

            })

    return {

        "success":
            True,

        "recipient_count":
            len(users),

        "sent_count":
            len([
                result
                for result
                in results
                if result.get(
                    "success"
                )
            ]),

        "results":
            results

    }


# ============================================================
# CONVENIENCE FUNCTIONS
# ============================================================

def notify_exam_created(
    receiver,
    exam_name
):
    """
    Notify a user that an exam has been created.
    """

    return send_notify(

        message=(
            f"Exam '{exam_name}' has been created "
            "successfully."
        ),

        receiver=receiver,

        title="New Exam",

        notification_type="exam"

    )


def notify_evaluation_completed(
    receiver,
    exam_name
):
    """
    Notify a user that AI evaluation has completed.
    """

    return send_notify(

        message=(
            f"AI evaluation for '{exam_name}' "
            "has been completed successfully."
        ),

        receiver=receiver,

        title="Evaluation Completed",

        notification_type="evaluation"

    )


def notify_verification_required(
    receiver,
    pending_count
):
    """
    Notify a faculty member that answers require
    manual verification.
    """

    return send_notify(

        message=(
            f"{pending_count} answer sheet(s) "
            "require manual verification."
        ),

        receiver=receiver,

        title="Verification Required",

        notification_type="verification"

    )


def notify_answer_key_created(
    receiver,
    subject
):
    """
    Notify a user that an answer key has been created.
    """

    return send_notify(

        message=(
            f"Answer key for '{subject}' "
            "has been created successfully."
        ),

        receiver=receiver,

        title="Answer Key Created",

        notification_type="answer_key"

    )


# ============================================================
# CREATE INDEXES
# ============================================================

def create_notification_indexes():
    """
    Create indexes used by the notification system.

    Safe to call multiple times because MongoDB will not
    recreate an identical existing index.
    """

    try:

        db = get_db()

        # ----------------------------------------------------
        # USER + CREATED AT
        # ----------------------------------------------------

        db.notifications.create_index([
            (
                "recipient_id",
                1
            ),
            (
                "created_at",
                -1
            )
        ])

        # ----------------------------------------------------
        # USER + READ STATUS
        # ----------------------------------------------------

        db.notifications.create_index([
            (
                "recipient_id",
                1
            ),
            (
                "is_read",
                1
            )
        ])

        # ----------------------------------------------------
        # ROLE + CREATED AT
        # ----------------------------------------------------

        db.notifications.create_index([
            (
                "recipient_role",
                1
            ),
            (
                "created_at",
                -1
            )
        ])

        print(
            "✅ Notification indexes created successfully."
        )

        return True

    except Exception as e:

        print(
            "⚠️ Could not create notification indexes:",
            str(e)
        )

        return False
