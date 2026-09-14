"""
Generic Notification Service
============================

Reusable backend-to-backend notification module.

This service is intentionally separate from the existing
notification_service.py so the existing HOD / Dean / Faculty
dashboard notification system is not affected.

Any backend module can use:

    from utils.generic_notification_service import notification_service

    notification_service.send(
        sender_id=faculty_id,
        receiver_id=hod_id,
        title="OCR Completed",
        message="OCR processing has been completed."
    )

The sender and receiver are identified using MongoDB User ObjectIds.

The service automatically stores:
    sender_id
    sender_role
    receiver_id
    receiver_role
    title
    message
    type
    attachment
    is_read
    read_at
    created_at

MongoDB collection:
    generic_notifications
"""

from datetime import datetime, timezone

from bson import ObjectId


# ============================================================
# DATABASE
# ============================================================

def get_db():
    """
    Get the existing MongoDB database connection.

    app.py already creates:
        db = client["ExamEvaluate"]

    and exposes it globally as:
        app.db
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
    """Return the current UTC datetime."""
    return datetime.now(timezone.utc)


# ============================================================
# OBJECT ID
# ============================================================

def normalize_user_id(user_id, field_name="user_id"):
    """
    Convert a user ID into MongoDB ObjectId.

    Example:
        "6a7725c0e0f059d5dd2fd265"
    """

    if user_id is None:
        raise ValueError(
            f"{field_name} is required"
        )

    if isinstance(user_id, ObjectId):
        return user_id

    user_id = str(user_id).strip()

    if not user_id:
        raise ValueError(
            f"{field_name} cannot be empty"
        )

    try:
        return ObjectId(user_id)

    except Exception:
        raise ValueError(
            f"Invalid {field_name}: {user_id}"
        )


# ============================================================
# GET USER
# ============================================================

def get_user(user_id, field_name="user_id"):
    """
    Find an active user in the users collection.
    """

    db = get_db()

    object_id = normalize_user_id(
        user_id,
        field_name
    )

    user = db.users.find_one(
        {
            "_id": object_id
        },
        {
            "_id": 1,
            "name": 1,
            "email": 1,
            "role": 1,
            "employeeId": 1,
            "department": 1,
            "designation": 1,
            "status": 1
        }
    )

    if not user:
        raise ValueError(
            f"{field_name.replace('_', ' ').title()} "
            "user not found"
        )

    status = str(
        user.get("status", "active")
    ).strip().lower()

    if status != "active":
        raise ValueError(
            f"{field_name.replace('_', ' ').title()} "
            "user is inactive"
        )

    return user


# ============================================================
# NORMALIZE ROLE
# ============================================================

def normalize_role(role):
    """Normalize a user role."""

    if role is None:
        return None

    role = str(role).strip().lower()

    return role or None


# ============================================================
# NORMALIZE ATTACHMENT
# ============================================================

def normalize_attachment(attachment):
    """
    Supported:

    None

    URL:
        "https://example.com/evaluation/123"

    JSON object:
        {
            "type": "evaluation",
            "url": "/api/evaluations/123",
            "data": {
                "subject": "CS401",
                "marks": 40
            }
        }

    No physical file upload is performed.
    """

    if attachment is None:
        return None

    if isinstance(attachment, str):

        attachment = attachment.strip()

        if not attachment:
            return None

        return {
            "type": "url",
            "url": attachment
        }

    if isinstance(attachment, dict):
        return dict(attachment)

    raise ValueError(
        "Attachment must be None, a URL string, "
        "or a JSON object"
    )


# ============================================================
# VALIDATE TITLE
# ============================================================

def validate_title(title):

    if title is None:
        raise ValueError(
            "Notification title is required"
        )

    title = str(title).strip()

    if not title:
        raise ValueError(
            "Notification title cannot be empty"
        )

    return title


# ============================================================
# VALIDATE MESSAGE
# ============================================================

def validate_message(message):

    if message is None:
        raise ValueError(
            "Notification message is required"
        )

    message = str(message).strip()

    if not message:
        raise ValueError(
            "Notification message cannot be empty"
        )

    return message


# ============================================================
# SERIALIZE NOTIFICATION
# ============================================================

def serialize_notification(notification):
    """
    Convert MongoDB values into JSON-safe values.
    """

    if not notification:
        return None

    result = dict(notification)

    if "_id" in result:
        result["_id"] = str(result["_id"])

    if "sender_id" in result:
        result["sender_id"] = str(
            result["sender_id"]
        )

    if "receiver_id" in result:
        result["receiver_id"] = str(
            result["receiver_id"]
        )

    if "created_at" in result and result["created_at"]:
        created_at = result["created_at"]

        if hasattr(created_at, "isoformat"):
            result["created_at"] = created_at.isoformat()

    if "read_at" in result and result["read_at"]:
        read_at = result["read_at"]

        if hasattr(read_at, "isoformat"):
            result["read_at"] = read_at.isoformat()

    return result


# ============================================================
# BUILD NOTIFICATION
# ============================================================

def build_notification(
    sender_user,
    receiver_user,
    title,
    message,
    notification_type="info",
    attachment=None
):
    """
    Build the MongoDB notification document.
    """

    now = utc_now()

    sender_role = normalize_role(
        sender_user.get("role")
    )

    receiver_role = normalize_role(
        receiver_user.get("role")
    )

    return {
        "sender_id": str(
            sender_user["_id"]
        ),

        "sender_role": sender_role,

        "receiver_id": str(
            receiver_user["_id"]
        ),

        "receiver_role": receiver_role,

        "title": title,

        "message": message,

        "type": notification_type,

        "attachment": attachment,

        "is_read": False,

        "read_at": None,

        "created_at": now
    }


# ============================================================
# GENERIC NOTIFICATION SERVICE
# ============================================================

class GenericNotificationService:

    COLLECTION_NAME = "generic_notifications"

    # ========================================================
    # SEND
    # ========================================================

    def send(
        self,
        sender_id,
        receiver_id,
        title,
        message,
        notification_type="info",
        attachment=None
    ):
        """
        Send a notification from one user to another.

        Example:

            notification_service.send(
                sender_id=faculty_id,
                receiver_id=hod_id,
                title="OCR Completed",
                message="OCR processing completed.",
                notification_type="evaluation_update",
                attachment={
                    "subject": "CS101",
                    "completed": 40
                }
            )
        """

        title = validate_title(title)

        message = validate_message(message)

        if notification_type is None:
            notification_type = "info"

        notification_type = str(
            notification_type
        ).strip()

        if not notification_type:
            notification_type = "info"

        attachment = normalize_attachment(
            attachment
        )

        sender_user = get_user(
            sender_id,
            "sender_id"
        )

        receiver_user = get_user(
            receiver_id,
            "receiver_id"
        )

        if (
            sender_user["_id"]
            == receiver_user["_id"]
        ):
            raise ValueError(
                "Sender and receiver cannot be the same user"
            )

        notification = build_notification(
            sender_user=sender_user,
            receiver_user=receiver_user,
            title=title,
            message=message,
            notification_type=notification_type,
            attachment=attachment
        )

        db = get_db()

        result = db[
            self.COLLECTION_NAME
        ].insert_one(
            notification
        )

        notification["_id"] = result.inserted_id

        print(
            "========================================"
        )
        print("🔔 GENERIC NOTIFICATION SENT")
        print("🔔 ID:", notification["_id"])
        print("🔔 SENDER:", notification["sender_id"])
        print("🔔 SENDER ROLE:", notification["sender_role"])
        print("🔔 RECEIVER:", notification["receiver_id"])
        print("🔔 RECEIVER ROLE:", notification["receiver_role"])
        print("🔔 TITLE:", notification["title"])
        print("🔔 TYPE:", notification["type"])
        print(
            "========================================"
        )

        return serialize_notification(
            notification
        )

    # ========================================================
    # GET ALL FOR USER
    # ========================================================

    def get_for_user(
        self,
        receiver_id,
        limit=50
    ):
        """
        Get all notifications received by a user.
        """

        receiver_id = str(
            normalize_user_id(
                receiver_id,
                "receiver_id"
            )
        )

        try:
            limit = int(limit)
        except (TypeError, ValueError):
            limit = 50

        limit = max(
            1,
            min(limit, 100)
        )

        db = get_db()

        notifications = list(
            db[
                self.COLLECTION_NAME
            ]
            .find({
                "receiver_id": receiver_id
            })
            .sort(
                "created_at",
                -1
            )
            .limit(limit)
        )

        return [
            serialize_notification(
                notification
            )
            for notification in notifications
        ]

    # ========================================================
    # GET UNREAD
    # ========================================================

    def get_unread(
        self,
        receiver_id,
        limit=50
    ):
        """
        Get only unread notifications.
        """

        receiver_id = str(
            normalize_user_id(
                receiver_id,
                "receiver_id"
            )
        )

        try:
            limit = int(limit)
        except (TypeError, ValueError):
            limit = 50

        limit = max(
            1,
            min(limit, 100)
        )

        db = get_db()

        notifications = list(
            db[
                self.COLLECTION_NAME
            ]
            .find({
                "receiver_id": receiver_id,
                "is_read": False
            })
            .sort(
                "created_at",
                -1
            )
            .limit(limit)
        )

        return [
            serialize_notification(
                notification
            )
            for notification in notifications
        ]

    # ========================================================
    # GET UNREAD COUNT
    # ========================================================

    def get_unread_count(
        self,
        receiver_id
    ):
        """
        Return the number of unread notifications.
        """

        receiver_id = str(
            normalize_user_id(
                receiver_id,
                "receiver_id"
            )
        )

        db = get_db()

        return db[
            self.COLLECTION_NAME
        ].count_documents({
            "receiver_id": receiver_id,
            "is_read": False
        })

    # ========================================================
    # MARK ONE AS READ
    # ========================================================

    def mark_as_read(
        self,
        notification_id
    ):
        """
        Mark one generic notification as read.
        """

        object_id = normalize_user_id(
            notification_id,
            "notification_id"
        )

        db = get_db()

        result = db[
            self.COLLECTION_NAME
        ].update_one(
            {
                "_id": object_id
            },
            {
                "$set": {
                    "is_read": True,
                    "read_at": utc_now()
                }
            }
        )

        if result.matched_count == 0:
            return None

        notification = db[
            self.COLLECTION_NAME
        ].find_one({
            "_id": object_id
        })

        return serialize_notification(
            notification
        )

    # ========================================================
    # MARK ALL AS READ
    # ========================================================

    def mark_all_as_read(
        self,
        receiver_id
    ):
        """
        Mark every unread notification belonging
        to a receiver as read.
        """

        receiver_id = str(
            normalize_user_id(
                receiver_id,
                "receiver_id"
            )
        )

        db = get_db()

        result = db[
            self.COLLECTION_NAME
        ].update_many(
            {
                "receiver_id": receiver_id,
                "is_read": False
            },
            {
                "$set": {
                    "is_read": True,
                    "read_at": utc_now()
                }
            }
        )

        return result.modified_count


# ============================================================
# SINGLE SHARED SERVICE INSTANCE
# ============================================================

notification_service = (
    GenericNotificationService()
)


# ============================================================
# BACKWARD-COMPATIBLE HELPER FUNCTIONS
# ============================================================
#
# These are included so existing routes/code that imports
# these function names will also continue to work.
# ============================================================

def send_generic_notification(
    sender_id,
    receiver_id,
    title,
    message,
    notification_type="info",
    attachment=None
):
    return notification_service.send(
        sender_id=sender_id,
        receiver_id=receiver_id,
        title=title,
        message=message,
        notification_type=notification_type,
        attachment=attachment
    )


def get_user_generic_notifications(
    receiver_id,
    limit=50
):
    return notification_service.get_for_user(
        receiver_id,
        limit
    )


def get_unread_generic_notifications(
    receiver_id,
    limit=50
):
    return notification_service.get_unread(
        receiver_id,
        limit
    )


def get_unread_generic_notification_count(
    receiver_id
):
    return notification_service.get_unread_count(
        receiver_id
    )


def mark_generic_notification_as_read(
    notification_id
):
    return notification_service.mark_as_read(
        notification_id
    )


def mark_all_generic_notifications_as_read(
    receiver_id
):
    return notification_service.mark_all_as_read(
        receiver_id
    )