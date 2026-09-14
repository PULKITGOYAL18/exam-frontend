from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from bson import ObjectId


# ============================================================
# NOTIFICATION BLUEPRINT
# ============================================================

notification_bp = Blueprint(
    "notifications",
    __name__,
    url_prefix="/api/notifications"
)


# ============================================================
# DATABASE
# ============================================================

def get_db():
    """
    Get MongoDB database.

    IMPORTANT:
    Replace this import only if your existing backend
    uses a different database connection method.
    """
    from app import db
    return db


# ============================================================
# UTC DATETIME SERIALIZER
# ============================================================

def serialize_datetime(value):
    """
    Convert MongoDB datetime into UTC ISO-8601 format.

    Example:
        2026-08-12T11:55:19.586Z
    """

    if not value:
        return None

    try:

        # MongoDB may return a naive datetime.
        # Treat naive datetime as UTC.
        if value.tzinfo is None:
            value = value.replace(
                tzinfo=timezone.utc
            )

        # Convert to UTC
        value = value.astimezone(
            timezone.utc
        )

        # Return ISO format with Z
        return value.isoformat().replace(
            "+00:00",
            "Z"
        )

    except Exception as e:

        print(
            f"Could not serialize datetime: {e}"
        )

        return None


# ============================================================
# SERIALIZE NOTIFICATION
# ============================================================

def serialize_notification(notification):
    """
    Convert MongoDB notification document into
    JSON-safe response.
    """

    return {
        "id": str(
            notification["_id"]
        ),

        "title": notification.get(
            "title",
            ""
        ),

        "message": notification.get(
            "message",
            ""
        ),

        "type": notification.get(
            "type",
            "info"
        ),

        "recipient_id": notification.get(
            "recipient_id"
        ),

        "recipient_role": notification.get(
            "recipient_role"
        ),

        "is_read": notification.get(
            "is_read",
            False
        ),

        "created_at": serialize_datetime(
            notification.get(
                "created_at"
            )
        ),

        "read_at": serialize_datetime(
            notification.get(
                "read_at"
            )
        ),
    }


# ============================================================
# CREATE NOTIFICATION FOR ONE USER
# ============================================================

@notification_bp.route(
    "/",
    methods=["POST"]
)
def create_notification():

    """
    Create notification for ONE specific user.

    Expected JSON:

    {
        "recipient_id": "USER_ID",
        "title": "New Exam",
        "message": "A new examination has been created.",
        "type": "exam"
    }

    IMPORTANT:

    The role is NOT taken from the frontend.

    Backend finds the user from MongoDB and automatically
    stores the user's role in recipient_role.
    """

    try:

        # ----------------------------------------------------
        # REQUEST DATA
        # ----------------------------------------------------

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "message":
                    "Request body is required"
            }), 400

        recipient_id = data.get(
            "recipient_id"
        )

        title = data.get(
            "title"
        )

        message = data.get(
            "message"
        )

        notification_type = data.get(
            "type",
            "info"
        )

        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        if not recipient_id:

            return jsonify({
                "success": False,
                "message":
                    "recipient_id is required"
            }), 400

        if not title:

            return jsonify({
                "success": False,
                "message":
                    "title is required"
            }), 400

        if not message:

            return jsonify({
                "success": False,
                "message":
                    "message is required"
            }), 400

        # ----------------------------------------------------
        # DATABASE
        # ----------------------------------------------------

        db = get_db()

        # ----------------------------------------------------
        # VALIDATE USER ID
        # ----------------------------------------------------

        try:

            recipient_object_id = ObjectId(
                recipient_id
            )

        except Exception:

            return jsonify({
                "success": False,
                "message":
                    "Invalid recipient_id"
            }), 400

        # ----------------------------------------------------
        # FIND USER
        # ----------------------------------------------------

        recipient = db.users.find_one(
            {
                "_id":
                    recipient_object_id
            },
            {
                "_id": 1,
                "role": 1
            }
        )

        if not recipient:

            return jsonify({
                "success": False,
                "message":
                    "Recipient user not found"
            }), 404

        # ----------------------------------------------------
        # GET USER ROLE
        # ----------------------------------------------------

        recipient_role = recipient.get(
            "role"
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

        # ----------------------------------------------------
        # CREATE UTC TIME
        # ----------------------------------------------------

        now = datetime.now(
            timezone.utc
        )

        # ----------------------------------------------------
        # CREATE DOCUMENT
        # ----------------------------------------------------

        notification = {

            "recipient_id":
                str(
                    recipient["_id"]
                ),

            # IMPORTANT:
            # Automatically store user's role
            "recipient_role":
                recipient_role,

            "title":
                title.strip(),

            "message":
                message.strip(),

            "type":
                notification_type,

            "is_read":
                False,

            "created_at":
                now,

            "read_at":
                None
        }

        # ----------------------------------------------------
        # INSERT
        # ----------------------------------------------------

        result = db.notifications.insert_one(
            notification
        )

        notification["_id"] = (
            result.inserted_id
        )

        # ----------------------------------------------------
        # DEBUG
        # ----------------------------------------------------

        print(
            "========================================"
        )

        print(
            "🔔 NOTIFICATION CREATED"
        )

        print(
            "🔔 RECIPIENT ID:",
            notification["recipient_id"]
        )

        print(
            "🔔 RECIPIENT ROLE:",
            notification["recipient_role"]
        )

        print(
            "🔔 TITLE:",
            notification["title"]
        )

        print(
            "🔔 UTC CREATED AT:",
            now.isoformat()
        )

        print(
            "========================================"
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success":
                True,

            "message":
                "Notification created successfully",

            "notification":
                serialize_notification(
                    notification
                )

        }), 201

    except Exception as e:

        print(
            f"Notification creation error: {e}"
        )

        return jsonify({

            "success":
                False,

            "message":
                str(e)

        }), 500


# ============================================================
# GET ALL NOTIFICATIONS FOR USER
# ============================================================

@notification_bp.route(
    "/user/<user_id>",
    methods=["GET"]
)
def get_user_notifications(
    user_id
):

    """
    Get notifications belonging to a user.
    """

    try:

        db = get_db()

        # ----------------------------------------------------
        # LIMIT
        # ----------------------------------------------------

        limit = request.args.get(
            "limit",
            20,
            type=int
        )

        if limit < 1:
            limit = 20

        if limit > 100:
            limit = 100

        # ----------------------------------------------------
        # QUERY
        # ----------------------------------------------------

        notifications = list(
            db.notifications
            .find({
                "recipient_id":
                    str(user_id)
            })
            .sort(
                "created_at",
                -1
            )
            .limit(limit)
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success":
                True,

            "count":
                len(notifications),

            "notifications": [

                serialize_notification(
                    notification
                )

                for notification
                in notifications

            ]

        }), 200

    except Exception as e:

        print(
            f"Get notifications error: {e}"
        )

        return jsonify({

            "success":
                False,

            "message":
                str(e)

        }), 500


# ============================================================
# GET UNREAD NOTIFICATIONS
# ============================================================

@notification_bp.route(
    "/user/<user_id>/unread",
    methods=["GET"]
)
def get_unread_notifications(
    user_id
):

    """
    Get unread notifications for a user.
    """

    try:

        db = get_db()

        notifications = list(

            db.notifications

            .find({

                "recipient_id":
                    str(user_id),

                "is_read":
                    False

            })

            .sort(
                "created_at",
                -1
            )

        )

        return jsonify({

            "success":
                True,

            "count":
                len(notifications),

            "notifications": [

                serialize_notification(
                    notification
                )

                for notification
                in notifications

            ]

        }), 200

    except Exception as e:

        print(
            f"Get unread notifications error: {e}"
        )

        return jsonify({

            "success":
                False,

            "message":
                str(e)

        }), 500


# ============================================================
# GET UNREAD COUNT
# ============================================================

@notification_bp.route(
    "/user/<user_id>/unread-count",
    methods=["GET"]
)
def get_unread_count(
    user_id
):

    """
    Get unread notification count.
    """

    try:

        db = get_db()

        count = (
            db.notifications
            .count_documents({

                "recipient_id":
                    str(user_id),

                "is_read":
                    False

            })
        )

        return jsonify({

            "success":
                True,

            "unread_count":
                count

        }), 200

    except Exception as e:

        print(
            f"Get unread count error: {e}"
        )

        return jsonify({

            "success":
                False,

            "message":
                str(e)

        }), 500


# ============================================================
# MARK ONE NOTIFICATION AS READ
# ============================================================

@notification_bp.route(
    "/<notification_id>/read",
    methods=["PATCH"]
)
def mark_as_read(
    notification_id
):

    """
    Mark one notification as read.
    """

    try:

        db = get_db()

        # ----------------------------------------------------
        # VALIDATE OBJECT ID
        # ----------------------------------------------------

        try:

            object_id = ObjectId(
                notification_id
            )

        except Exception:

            return jsonify({

                "success":
                    False,

                "message":
                    "Invalid notification ID"

            }), 400

        # ----------------------------------------------------
        # READ TIME
        # ----------------------------------------------------

        read_time = datetime.now(
            timezone.utc
        )

        # ----------------------------------------------------
        # UPDATE
        # ----------------------------------------------------

        result = (
            db.notifications
            .update_one(

                {
                    "_id":
                        object_id
                },

                {
                    "$set": {

                        "is_read":
                            True,

                        "read_at":
                            read_time

                    }
                }

            )
        )

        # ----------------------------------------------------
        # NOT FOUND
        # ----------------------------------------------------

        if result.matched_count == 0:

            return jsonify({

                "success":
                    False,

                "message":
                    "Notification not found"

            }), 404

        return jsonify({

            "success":
                True,

            "message":
                "Notification marked as read",

            "read_at":
                serialize_datetime(
                    read_time
                )

        }), 200

    except Exception as e:

        print(
            f"Mark notification read error: {e}"
        )

        return jsonify({

            "success":
                False,

            "message":
                str(e)

        }), 500


# ============================================================
# MARK ALL NOTIFICATIONS AS READ
# ============================================================

@notification_bp.route(
    "/user/<user_id>/read-all",
    methods=["PATCH"]
)
def mark_all_as_read(
    user_id
):

    """
    Mark all notifications belonging to a user as read.
    """

    try:

        db = get_db()

        read_time = datetime.now(
            timezone.utc
        )

        result = (
            db.notifications
            .update_many(

                {

                    "recipient_id":
                        str(user_id),

                    "is_read":
                        False

                },

                {

                    "$set": {

                        "is_read":
                            True,

                        "read_at":
                            read_time

                    }

                }

            )
        )

        return jsonify({

            "success":
                True,

            "message":
                "All notifications marked as read",

            "updated_count":
                result.modified_count,

            "read_at":
                serialize_datetime(
                    read_time
                )

        }), 200

    except Exception as e:

        print(
            f"Mark all notifications read error: {e}"
        )

        return jsonify({

            "success":
                False,

            "message":
                str(e)

        }), 500


# ============================================================
# DELETE NOTIFICATION
# ============================================================

@notification_bp.route(
    "/<notification_id>",
    methods=["DELETE"]
)
def delete_notification(
    notification_id
):

    """
    Delete a notification.
    """

    try:

        db = get_db()

        # ----------------------------------------------------
        # VALIDATE OBJECT ID
        # ----------------------------------------------------

        try:

            object_id = ObjectId(
                notification_id
            )

        except Exception:

            return jsonify({

                "success":
                    False,

                "message":
                    "Invalid notification ID"

            }), 400

        # ----------------------------------------------------
        # DELETE
        # ----------------------------------------------------

        result = (
            db.notifications
            .delete_one({

                "_id":
                    object_id

            })
        )

        if result.deleted_count == 0:

            return jsonify({

                "success":
                    False,

                "message":
                    "Notification not found"

            }), 404

        return jsonify({

            "success":
                True,

            "message":
                "Notification deleted successfully"

        }), 200

    except Exception as e:

        print(
            f"Delete notification error: {e}"
        )

        return jsonify({

            "success":
                False,

            "message":
                str(e)

        }), 500


# ============================================================
# ADMIN → NOTIFY A ROLE
# ============================================================

@notification_bp.route(
    "/broadcast-role",
    methods=["POST"]
)
def broadcast_to_role():

    """
    Send notification to EVERY user having a particular role.

    Expected JSON:

    {
        "role": "faculty",
        "title": "Important Announcement",
        "message": "Faculty meeting tomorrow.",
        "type": "announcement"
    }
    """

    try:

        data = request.get_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "message":
                    "Request body is required"

            }), 400

        # ----------------------------------------------------
        # DATA
        # ----------------------------------------------------

        role = data.get(
            "role"
        )

        title = data.get(
            "title"
        )

        message = data.get(
            "message"
        )

        notification_type = data.get(
            "type",
            "announcement"
        )

        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        if not role:

            return jsonify({

                "success":
                    False,

                "message":
                    "role is required"

            }), 400

        if not title:

            return jsonify({

                "success":
                    False,

                "message":
                    "title is required"

            }), 400

        if not message:

            return jsonify({

                "success":
                    False,

                "message":
                    "message is required"

            }), 400

        # ----------------------------------------------------
        # NORMALIZE ROLE
        # ----------------------------------------------------

        role = (
            str(role)
            .strip()
            .lower()
        )

        title = title.strip()
        message = message.strip()

        # ----------------------------------------------------
        # DATABASE
        # ----------------------------------------------------

        db = get_db()

        # ----------------------------------------------------
        # FIND ALL USERS WITH ROLE
        # ----------------------------------------------------

        users = list(

            db.users.find(

                {
                    "role":
                        role
                },

                {
                    "_id": 1,
                    "role": 1
                }

            )

        )

        if not users:

            return jsonify({

                "success":
                    False,

                "message":
                    f"No users found with role: {role}"

            }), 404

        # ----------------------------------------------------
        # ONE UTC TIMESTAMP
        # ----------------------------------------------------

        now = datetime.now(
            timezone.utc
        )

        notifications = []

        # ----------------------------------------------------
        # CREATE ONE NOTIFICATION
        # FOR EACH USER
        # ----------------------------------------------------

        for user in users:

            user_role = user.get(
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

            notifications.append({

                "recipient_id":
                    str(
                        user["_id"]
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
            })

        # ----------------------------------------------------
        # INSERT MANY
        # ----------------------------------------------------

        if notifications:

            db.notifications.insert_many(
                notifications
            )

        # ----------------------------------------------------
        # DEBUG
        # ----------------------------------------------------

        print(
            "========================================"
        )

        print(
            "🔔 ROLE BROADCAST"
        )

        print(
            "🔔 ROLE:",
            role
        )

        print(
            "🔔 RECIPIENT COUNT:",
            len(notifications)
        )

        print(
            "🔔 UTC CREATED AT:",
            now.isoformat()
        )

        print(
            "========================================"
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success":
                True,

            "message":
                f"Notification sent to {len(notifications)} users",

            "recipient_count":
                len(notifications),

            "created_at":
                serialize_datetime(
                    now
                )

        }), 201

    except Exception as e:

        print(
            f"Broadcast role error: {e}"
        )

        return jsonify({

            "success":
                False,

            "message":
                str(e)

        }), 500


# ============================================================
# ADMIN → NOTIFY EVERYONE
# ============================================================

@notification_bp.route(
    "/broadcast-all",
    methods=["POST"]
)
def broadcast_to_all():

    """
    Send notification to EVERY user.

    Each notification stores the user's role.
    """

    try:

        data = request.get_json()

        if not data:

            return jsonify({

                "success":
                    False,

                "message":
                    "Request body is required"

            }), 400

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
        # VALIDATION
        # ----------------------------------------------------

        if not title:

            return jsonify({

                "success":
                    False,

                "message":
                    "title is required"

            }), 400

        if not message:

            return jsonify({

                "success":
                    False,

                "message":
                    "message is required"

            }), 400

        title = title.strip()
        message = message.strip()

        # ----------------------------------------------------
        # DATABASE
        # ----------------------------------------------------

        db = get_db()

        # ----------------------------------------------------
        # GET USERS
        # ----------------------------------------------------

        users = list(

            db.users.find(

                {},

                {
                    "_id": 1,
                    "role": 1
                }

            )

        )

        if not users:

            return jsonify({

                "success":
                    False,

                "message":
                    "No users found"

            }), 404

        # ----------------------------------------------------
        # UTC TIME
        # ----------------------------------------------------

        now = datetime.now(
            timezone.utc
        )

        notifications = []

        # ----------------------------------------------------
        # CREATE NOTIFICATION
        # FOR EVERY USER
        # ----------------------------------------------------

        for user in users:

            user_role = user.get(
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

            notifications.append({

                "recipient_id":
                    str(
                        user["_id"]
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
            })

        # ----------------------------------------------------
        # INSERT
        # ----------------------------------------------------

        db.notifications.insert_many(
            notifications
        )

        # ----------------------------------------------------
        # DEBUG
        # ----------------------------------------------------

        print(
            "========================================"
        )

        print(
            "🔔 GLOBAL BROADCAST"
        )

        print(
            "🔔 RECIPIENT COUNT:",
            len(notifications)
        )

        print(
            "🔔 UTC CREATED AT:",
            now.isoformat()
        )

        print(
            "========================================"
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return jsonify({

            "success":
                True,

            "message":
                "Notification broadcast successfully",

            "recipient_count":
                len(notifications),

            "created_at":
                serialize_datetime(
                    now
                )

        }), 201

    except Exception as e:

        print(
            f"Broadcast all error: {e}"
        )

        return jsonify({

            "success":
                False,

            "message":
                str(e)

        }), 500


# ============================================================
# CREATE INDEXES
# ============================================================

def create_notification_indexes():

    """
    Create MongoDB indexes for faster notification queries.
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
        # ROLE INDEX
        # ----------------------------------------------------
        # Useful if you later need to query notifications
        # by recipient role.

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
            "Notification indexes created successfully."
        )

    except Exception as e:

        print(
            f"Could not create notification indexes: {e}"
        )