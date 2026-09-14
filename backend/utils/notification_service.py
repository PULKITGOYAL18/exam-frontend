from datetime import datetime, timezone


# ============================================================
# Notification Service
# ============================================================
# This file contains reusable functions for creating
# notifications.
#
# Other backend routes can simply call:
#
#     create_notification(...)
#
# instead of writing MongoDB notification code repeatedly.
# ============================================================


def get_db():
    """
    Get the existing MongoDB database connection.

    IMPORTANT:
    This assumes your app.py exposes the database as `db`.

    If your project uses another database connection method,
    change this function to match your existing setup.
    """
    from app import db
    return db


# ============================================================
# CREATE NOTIFICATION FOR ONE USER
# ============================================================

def create_notification(
    recipient_id,
    title,
    message,
    notification_type="info",
    recipient_role=None
):
    """
    Create a notification for one specific user.

    Example:

        create_notification(
            recipient_id=str(hod_id),
            title="Evaluation Submitted",
            message="A faculty member has submitted an evaluation.",
            notification_type="evaluation",
            recipient_role="hod"
        )

    Returns:
        inserted notification ID as string
        or None if creation fails.
    """

    try:
        db = get_db()

        notification = {
            "recipient_id": str(recipient_id),
            "recipient_role": recipient_role,
            "title": title,
            "message": message,
            "type": notification_type,
            "is_read": False,
            "created_at": datetime.now(timezone.utc)
        }

        result = db.notifications.insert_one(notification)

        return str(result.inserted_id)

    except Exception as e:
        print(f"[NotificationService] Error creating notification: {e}")
        return None


# ============================================================
# CREATE MULTIPLE NOTIFICATIONS
# ============================================================

def create_notifications(
    recipients,
    title,
    message,
    notification_type="info",
    recipient_role=None
):
    """
    Create the same notification for multiple users.

    `recipients` should be a list of user IDs.

    Example:

        create_notifications(
            recipients=[faculty1_id, faculty2_id],
            title="Exam Created",
            message="A new examination has been created.",
            notification_type="exam"
        )

    Returns:
        Number of notifications created.
    """

    try:
        db = get_db()

        now = datetime.now(timezone.utc)

        notifications = []

        for recipient_id in recipients:

            notifications.append({
                "recipient_id": str(recipient_id),
                "recipient_role": recipient_role,
                "title": title,
                "message": message,
                "type": notification_type,
                "is_read": False,
                "created_at": now
            })

        if not notifications:
            return 0

        result = db.notifications.insert_many(notifications)

        return len(result.inserted_ids)

    except Exception as e:
        print(
            f"[NotificationService] Error creating notifications: {e}"
        )
        return 0


# ============================================================
# NOTIFY USERS BY ROLE
# ============================================================

def notify_role(
    role,
    title,
    message,
    notification_type="announcement"
):
    """
    Send a notification to every user having a particular role.

    Example:

        notify_role(
            role="faculty",
            title="New Examination",
            message="A new examination has been created.",
            notification_type="exam"
        )

    Returns:
        Number of users notified.
    """

    try:
        db = get_db()

        users = list(
            db.users.find(
                {"role": role},
                {"_id": 1}
            )
        )

        if not users:
            return 0

        recipient_ids = [
            str(user["_id"])
            for user in users
        ]

        return create_notifications(
            recipients=recipient_ids,
            title=title,
            message=message,
            notification_type=notification_type,
            recipient_role=role
        )

    except Exception as e:
        print(
            f"[NotificationService] Error notifying role '{role}': {e}"
        )
        return 0


# ============================================================
# NOTIFY ALL USERS
# ============================================================

def notify_all(
    title,
    message,
    notification_type="system"
):
    """
    Send a notification to every user in the system.

    Example:

        notify_all(
            title="System Maintenance",
            message="The system will be unavailable tonight.",
            notification_type="system"
        )

    Returns:
        Number of users notified.
    """

    try:
        db = get_db()

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
            return 0

        now = datetime.now(timezone.utc)

        notifications = []

        for user in users:

            notifications.append({
                "recipient_id": str(user["_id"]),
                "recipient_role": user.get("role"),
                "title": title,
                "message": message,
                "type": notification_type,
                "is_read": False,
                "created_at": now
            })

        if not notifications:
            return 0

        result = db.notifications.insert_many(notifications)

        return len(result.inserted_ids)

    except Exception as e:
        print(
            f"[NotificationService] Error broadcasting notification: {e}"
        )
        return 0


# ============================================================
# EXAM / EVALUATION NOTIFICATIONS
# ============================================================

def notify_exam_created(
    recipient_id,
    exam_name
):
    """
    Notify a user that an exam has been created.
    """

    return create_notification(
        recipient_id=recipient_id,
        title="New Exam Created",
        message=f"A new examination '{exam_name}' has been created.",
        notification_type="exam"
    )


def notify_sheets_uploaded(
    recipient_id,
    exam_name
):
    """
    Notify a user that answer sheets have been uploaded.
    """

    return create_notification(
        recipient_id=recipient_id,
        title="Sheets Uploaded",
        message=f"Answer sheets for '{exam_name}' have been uploaded.",
        notification_type="upload"
    )


def notify_evaluation_completed(
    recipient_id,
    exam_name
):
    """
    Notify a user that AI evaluation has completed.
    """

    return create_notification(
        recipient_id=recipient_id,
        title="Evaluation Completed",
        message=(
            f"AI evaluation for '{exam_name}' has been completed "
            "and is ready for verification."
        ),
        notification_type="evaluation"
    )


def notify_verification_required(
    recipient_id,
    exam_name
):
    """
    Notify a faculty member that verification is required.
    """

    return create_notification(
        recipient_id=recipient_id,
        title="Verification Required",
        message=(
            f"Some answers in '{exam_name}' require "
            "your verification."
        ),
        notification_type="verification"
    )


def notify_evaluation_submitted_to_hod(
    hod_id,
    exam_name
):
    """
    Notify HOD that faculty has submitted evaluation.
    """

    return create_notification(
        recipient_id=hod_id,
        title="Evaluation Awaiting Review",
        message=(
            f"Evaluation for '{exam_name}' has been submitted "
            "and is awaiting HOD review."
        ),
        notification_type="hod_review",
        recipient_role="hod"
    )


def notify_hod_approved(
    dean_id,
    exam_name
):
    """
    Notify Dean that HOD has approved an evaluation.
    """

    return create_notification(
        recipient_id=dean_id,
        title="Evaluation Awaiting Dean Approval",
        message=(
            f"Evaluation for '{exam_name}' has been approved "
            "by the HOD and is awaiting Dean approval."
        ),
        notification_type="dean_review",
        recipient_role="dean"
    )


def notify_result_finalized(
    recipient_id,
    exam_name
):
    """
    Notify user that the result has been finalized.
    """

    return create_notification(
        recipient_id=recipient_id,
        title="Result Finalized",
        message=(
            f"The result for '{exam_name}' has been finalized."
        ),
        notification_type="result"
    )


# ============================================================
# USER / ADMIN NOTIFICATIONS
# ============================================================

def notify_user_created(
    user_id,
    role
):
    """
    Notify a newly created user.
    """

    return create_notification(
        recipient_id=user_id,
        title="Account Created",
        message=(
            f"Your account has been created successfully "
            f"with role '{role}'."
        ),
        notification_type="account"
    )


def notify_user_activated(
    user_id
):
    """
    Notify a user that their account has been activated.
    """

    return create_notification(
        recipient_id=user_id,
        title="Account Activated",
        message=(
            "Your account has been activated. "
            "You can now access the examination system."
        ),
        notification_type="account"
    )


def notify_user_deactivated(
    user_id
):
    """
    Notify a user that their account has been deactivated.
    """

    return create_notification(
        recipient_id=user_id,
        title="Account Deactivated",
        message=(
            "Your account has been deactivated. "
            "Please contact the administrator if you need assistance."
        ),
        notification_type="account"
    )


# ============================================================
# ADMIN ANNOUNCEMENT
# ============================================================

def send_announcement(
    title,
    message,
    role=None
):
    """
    Send an announcement.

    If role is provided:
        notification goes only to that role.

    If role is None:
        notification goes to everyone.

    Example:

        send_announcement(
            title="Holiday Announcement",
            message="University will remain closed tomorrow.",
            role="faculty"
        )
    """

    if role:

        return notify_role(
            role=role,
            title=title,
            message=message,
            notification_type="announcement"
        )

    return notify_all(
        title=title,
        message=message,
        notification_type="announcement"
    )
