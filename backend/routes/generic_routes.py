from flask import Blueprint, request, jsonify

from utils.generic_notification_service import (
    notification_service
)


# ============================================================
# BLUEPRINT
# ============================================================

generic_notification_bp = Blueprint(
    "generic_notification",
    __name__,
    url_prefix="/api/generic-notifications"
)


# ============================================================
# SEND
# ============================================================

@generic_notification_bp.route(
    "/send",
    methods=["POST"]
)
def send_notification():

    try:

        data = request.get_json(
            silent=True
        )

        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        sender_id = data.get(
            "sender_id"
        )

        receiver_id = data.get(
            "receiver_id"
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

        attachment = data.get(
            "attachment"
        )

        notification = (
            notification_service.send(
                sender_id=sender_id,
                receiver_id=receiver_id,
                title=title,
                message=message,
                notification_type=notification_type,
                attachment=attachment
            )
        )

        return jsonify({
            "success": True,
            "message": "Notification sent successfully",
            "notification": notification
        }), 201

    except ValueError as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:

        print(
            f"❌ Generic notification send error: {e}"
        )

        return jsonify({
            "success": False,
            "message": "Failed to send notification",
            "error": str(e)
        }), 500


# ============================================================
# GET ALL NOTIFICATIONS
# ============================================================

@generic_notification_bp.route(
    "/user/<receiver_id>",
    methods=["GET"]
)
def get_notifications(receiver_id):

    try:

        limit = request.args.get(
            "limit",
            50,
            type=int
        )

        notifications = (
            notification_service.get_for_user(
                receiver_id,
                limit
            )
        )

        return jsonify({
            "success": True,
            "count": len(notifications),
            "notifications": notifications
        }), 200

    except ValueError as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:

        print(
            f"❌ Generic notification fetch error: {e}"
        )

        return jsonify({
            "success": False,
            "message": "Failed to fetch notifications",
            "error": str(e)
        }), 500


# ============================================================
# GET UNREAD NOTIFICATIONS
# ============================================================

@generic_notification_bp.route(
    "/user/<receiver_id>/unread",
    methods=["GET"]
)
def get_unread_notifications(receiver_id):

    try:

        limit = request.args.get(
            "limit",
            50,
            type=int
        )

        notifications = (
            notification_service.get_unread(
                receiver_id,
                limit
            )
        )

        return jsonify({
            "success": True,
            "count": len(notifications),
            "notifications": notifications
        }), 200

    except ValueError as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:

        print(
            f"❌ Generic unread fetch error: {e}"
        )

        return jsonify({
            "success": False,
            "message": "Failed to fetch unread notifications",
            "error": str(e)
        }), 500


# ============================================================
# GET UNREAD COUNT
# ============================================================

@generic_notification_bp.route(
    "/user/<receiver_id>/unread-count",
    methods=["GET"]
)
def get_unread_count(receiver_id):

    try:

        count = (
            notification_service.get_unread_count(
                receiver_id
            )
        )

        return jsonify({
            "success": True,
            "unread_count": count
        }), 200

    except ValueError as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:

        print(
            f"❌ Generic unread count error: {e}"
        )

        return jsonify({
            "success": False,
            "message": "Failed to get unread count",
            "error": str(e)
        }), 500


# ============================================================
# MARK ONE AS READ
# ============================================================

@generic_notification_bp.route(
    "/<notification_id>/read",
    methods=["PATCH"]
)
def mark_as_read(notification_id):

    try:

        notification = (
            notification_service.mark_as_read(
                notification_id
            )
        )

        if not notification:

            return jsonify({
                "success": False,
                "message": "Notification not found"
            }), 404

        return jsonify({
            "success": True,
            "message": "Notification marked as read",
            "notification": notification
        }), 200

    except ValueError as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:

        print(
            f"❌ Generic mark-read error: {e}"
        )

        return jsonify({
            "success": False,
            "message": "Failed to mark notification as read",
            "error": str(e)
        }), 500


# ============================================================
# MARK ALL AS READ
# ============================================================

@generic_notification_bp.route(
    "/user/<receiver_id>/read-all",
    methods=["PATCH"]
)
def mark_all_as_read(receiver_id):

    try:

        modified_count = (
            notification_service.mark_all_as_read(
                receiver_id
            )
        )

        return jsonify({
            "success": True,
            "message": "All notifications marked as read",
            "modified_count": modified_count
        }), 200

    except ValueError as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 400

    except Exception as e:

        print(
            f"❌ Generic mark-all-read error: {e}"
        )

        return jsonify({
            "success": False,
            "message": "Failed to mark all notifications as read",
            "error": str(e)
        }), 500