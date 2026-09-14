from functools import wraps
from bson import ObjectId
from flask import Blueprint, request, jsonify

from utils.security import hash_password
import jwt
import os


# ============================================================
# Admin Blueprint
# ============================================================

admin_bp = Blueprint(
    "admin",
    __name__,
    url_prefix="/api/admin"
)


# ============================================================
# Admin Authentication
# ============================================================

def admin_required(f):
    """
    Allow access only to authenticated Admin users.

    Expects:
        Authorization: Bearer <JWT_TOKEN>
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):

        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({
                "message": "Authorization token is required"
            }), 401

        token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return jsonify({
                "message": "Authorization token is required"
            }), 401

        try:
            secret = os.getenv("JWT_SECRET")

            if not secret:
                return jsonify({
                    "message": "JWT_SECRET is not configured"
                }), 500

            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"]
            )

            if payload.get("role") != "admin":
                return jsonify({
                    "message": "Admin access required"
                }), 403

            return f(*args, **kwargs)

        except jwt.ExpiredSignatureError:
            return jsonify({
                "message": "Authentication token has expired"
            }), 401

        except jwt.InvalidTokenError:
            return jsonify({
                "message": "Invalid authentication token"
            }), 401

        except Exception as e:
            print("ADMIN AUTH ERROR:", str(e))

            return jsonify({
                "message": "Authentication failed"
            }), 401

    return decorated_function


# ============================================================
# Helper: Get Database
# ============================================================

def get_database():
    from app import db

    if db is None:
        raise RuntimeError(
            "Database connection is not available"
        )

    return db


# ============================================================
# Helper: Convert MongoDB User to JSON
# ============================================================

def serialize_user(user):
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "employeeId": user.get("employeeId"),
        "role": user.get("role"),
        "status": user.get("status"),
        "department": user.get("department"),
        "designation": user.get("designation")
    }


# ============================================================
# Helper: Audit Log
# ============================================================

def create_audit_log(
    db,
    admin_id,
    action,
    target_user=None,
    details=None
):
    """
    Store Admin actions for future audit/history functionality.
    """

    log = {
        "actorId": str(admin_id),
        "actorRole": "admin",
        "action": action,
        "details": details or {},
    }

    if target_user:
        log["targetUserId"] = str(
            target_user.get("_id")
        )

        log["targetEmail"] = target_user.get(
            "email"
        )

        log["targetRole"] = target_user.get(
            "role"
        )

    from datetime import datetime, timezone

    log["timestamp"] = datetime.now(
        timezone.utc
    )

    db.audit_logs.insert_one(log)


# ============================================================
# GET ALL USERS
# ============================================================

@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_users():

    try:

        db = get_database()

        users = list(
            db.users.find(
                {},
                {
                    "password": 0
                }
            ).sort(
                "name",
                1
            )
        )

        return jsonify({
            "message": "Users retrieved successfully",
            "users": [
                serialize_user(user)
                for user in users
            ],
            "total": len(users)
        }), 200

    except Exception as e:

        print(
            "GET USERS ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to retrieve users"
        }), 500


# ============================================================
# GET SINGLE USER
# ============================================================

@admin_bp.route(
    "/users/<user_id>",
    methods=["GET"]
)
@admin_required
def get_user(user_id):

    try:

        if not ObjectId.is_valid(user_id):
            return jsonify({
                "message": "Invalid user ID"
            }), 400

        db = get_database()

        user = db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({
                "message": "User not found"
            }), 404

        return jsonify({
            "message": "User retrieved successfully",
            "user": serialize_user(user)
        }), 200

    except Exception as e:

        print(
            "GET USER ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to retrieve user"
        }), 500


# ============================================================
# CREATE USER
# ============================================================

@admin_bp.route(
    "/users",
    methods=["POST"]
)
@admin_required
def create_user():

    data = request.get_json(
        silent=True
    )

    if not data:
        return jsonify({
            "message": "Request body is required"
        }), 400

    required_fields = [
        "name",
        "email",
        "password",
        "employeeId",
        "role",
        "department",
        "designation"
    ]

    missing_fields = [
        field
        for field in required_fields
        if not str(
            data.get(field, "")
        ).strip()
    ]

    if missing_fields:
        return jsonify({
            "message": "Required fields are missing",
            "fields": missing_fields
        }), 400

    name = str(
        data["name"]
    ).strip()

    email = str(
        data["email"]
    ).strip().lower()

    password = str(
        data["password"]
    )

    employee_id = str(
        data["employeeId"]
    ).strip()

    role = str(
        data["role"]
    ).strip().lower()

    department = str(
        data["department"]
    ).strip()

    designation = str(
        data["designation"]
    ).strip()

    allowed_roles = [
        "faculty",
        "hod",
        "dean"
    ]

    if role not in allowed_roles:
        return jsonify({
            "message": "Invalid role",
            "allowedRoles": allowed_roles
        }), 400

    if len(password) < 6:
        return jsonify({
            "message": "Password must contain at least 6 characters"
        }), 400

    try:

        db = get_database()

        existing_email = db.users.find_one({
            "email": email
        })

        if existing_email:
            return jsonify({
                "message": "A user with this email already exists"
            }), 409

        existing_employee = db.users.find_one({
            "employeeId": employee_id
        })

        if existing_employee:
            return jsonify({
                "message": "A user with this employee ID already exists"
            }), 409

        user = {
            "name": name,
            "email": email,
            "password": hash_password(password),
            "employeeId": employee_id,
            "role": role,
            "status": "active",
            "department": department,
            "designation": designation
        }

        result = db.users.insert_one(user)

        created_user = db.users.find_one({
            "_id": result.inserted_id
        })

        # Get Admin ID from JWT
        auth_header = request.headers.get(
            "Authorization",
            ""
        )

        token = auth_header.split(
            " ",
            1
        )[1]

        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        create_audit_log(
            db=db,
            admin_id=payload.get("user_id"),
            action="CREATE_USER",
            target_user=created_user,
            details={
                "role": role,
                "name": name
            }
        )

        return jsonify({
            "message": "User created successfully",
            "user": serialize_user(
                created_user
            )
        }), 201

    except Exception as e:

        print(
            "CREATE USER ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to create user"
        }), 500


# ============================================================
# UPDATE USER
# ============================================================

@admin_bp.route(
    "/users/<user_id>",
    methods=["PUT"]
)
@admin_required
def update_user(user_id):

    if not ObjectId.is_valid(user_id):
        return jsonify({
            "message": "Invalid user ID"
        }), 400

    data = request.get_json(
        silent=True
    )

    if not data:
        return jsonify({
            "message": "Request body is required"
        }), 400

    allowed_fields = [
        "name",
        "email",
        "employeeId",
        "role",
        "department",
        "designation"
    ]

    updates = {}

    for field in allowed_fields:

        if field in data:

            value = str(
                data[field]
            ).strip()

            if value:
                updates[field] = value

    if "email" in updates:
        updates["email"] = updates[
            "email"
        ].lower()

    if "role" in updates:

        updates["role"] = updates[
            "role"
        ].lower()

        if updates["role"] not in [
            "faculty",
            "hod",
            "dean"
        ]:
            return jsonify({
                "message": "Invalid role"
            }), 400

    if not updates:
        return jsonify({
            "message": "No valid fields to update"
        }), 400

    try:

        db = get_database()

        existing_user = db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not existing_user:
            return jsonify({
                "message": "User not found"
            }), 404

        # Prevent duplicate email
        if "email" in updates:

            duplicate = db.users.find_one({
                "email": updates["email"],
                "_id": {
                    "$ne": ObjectId(user_id)
                }
            })

            if duplicate:
                return jsonify({
                    "message": "Email is already being used"
                }), 409

        # Prevent duplicate employee ID
        if "employeeId" in updates:

            duplicate = db.users.find_one({
                "employeeId": updates["employeeId"],
                "_id": {
                    "$ne": ObjectId(user_id)
                }
            })

            if duplicate:
                return jsonify({
                    "message": "Employee ID is already being used"
                }), 409

        db.users.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": updates
            }
        )

        updated_user = db.users.find_one({
            "_id": ObjectId(user_id)
        })

        auth_header = request.headers.get(
            "Authorization",
            ""
        )

        token = auth_header.split(
            " ",
            1
        )[1]

        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        create_audit_log(
            db=db,
            admin_id=payload.get("user_id"),
            action="UPDATE_USER",
            target_user=updated_user,
            details={
                "updatedFields": list(
                    updates.keys()
                )
            }
        )

        return jsonify({
            "message": "User updated successfully",
            "user": serialize_user(
                updated_user
            )
        }), 200

    except Exception as e:

        print(
            "UPDATE USER ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to update user"
        }), 500


# ============================================================
# ACTIVATE / SUSPEND USER
# ============================================================

@admin_bp.route(
    "/users/<user_id>/status",
    methods=["PATCH"]
)
@admin_required
def update_user_status(user_id):

    if not ObjectId.is_valid(user_id):
        return jsonify({
            "message": "Invalid user ID"
        }), 400

    data = request.get_json(
        silent=True
    )

    if not data:
        return jsonify({
            "message": "Request body is required"
        }), 400

    status = str(
        data.get("status", "")
    ).strip().lower()

    allowed_statuses = [
        "active",
        "suspended"
    ]

    if status not in allowed_statuses:
        return jsonify({
            "message": "Invalid status",
            "allowedStatuses": allowed_statuses
        }), 400

    try:

        db = get_database()

        user = db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({
                "message": "User not found"
            }), 404

        db.users.update_one(
            {
                "_id": ObjectId(user_id)
            },
            {
                "$set": {
                    "status": status
                }
            }
        )

        updated_user = db.users.find_one({
            "_id": ObjectId(user_id)
        })

        auth_header = request.headers.get(
            "Authorization",
            ""
        )

        token = auth_header.split(
            " ",
            1
        )[1]

        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        action = (
            "ACTIVATE_USER"
            if status == "active"
            else "SUSPEND_USER"
        )

        create_audit_log(
            db=db,
            admin_id=payload.get("user_id"),
            action=action,
            target_user=updated_user,
            details={
                "status": status
            }
        )

        return jsonify({
            "message": (
                "User activated successfully"
                if status == "active"
                else "User suspended successfully"
            ),
            "user": serialize_user(
                updated_user
            )
        }), 200

    except Exception as e:

        print(
            "UPDATE STATUS ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to update user status"
        }), 500


# ============================================================
# DELETE USER
# ============================================================

@admin_bp.route(
    "/users/<user_id>",
    methods=["DELETE"]
)
@admin_required
def delete_user(user_id):

    if not ObjectId.is_valid(user_id):
        return jsonify({
            "message": "Invalid user ID"
        }), 400

    try:

        db = get_database()

        user = db.users.find_one({
            "_id": ObjectId(user_id)
        })

        if not user:
            return jsonify({
                "message": "User not found"
            }), 404

        # Do not allow deleting another Admin.
        if user.get("role") == "admin":
            return jsonify({
                "message": "Admin accounts cannot be deleted through this API"
            }), 403

        auth_header = request.headers.get(
            "Authorization",
            ""
        )

        token = auth_header.split(
            " ",
            1
        )[1]

        payload = jwt.decode(
            token,
            os.getenv("JWT_SECRET"),
            algorithms=["HS256"]
        )

        create_audit_log(
            db=db,
            admin_id=payload.get("user_id"),
            action="DELETE_USER",
            target_user=user,
            details={
                "deletedUser": user.get(
                    "email"
                )
            }
        )

        db.users.delete_one({
            "_id": ObjectId(user_id)
        })

        return jsonify({
            "message": "User deleted successfully",
            "userId": user_id
        }), 200

    except Exception as e:

        print(
            "DELETE USER ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to delete user"
        }), 500


# ============================================================
# GET AUDIT LOGS
# ============================================================

@admin_bp.route(
    "/audit-logs",
    methods=["GET"]
)
@admin_required
def get_audit_logs():

    try:

        db = get_database()

        logs = list(
            db.audit_logs.find({})
            .sort(
                "timestamp",
                -1
            )
            .limit(100)
        )

        result = []

        for log in logs:

            result.append({
                "id": str(
                    log["_id"]
                ),
                "actorId": log.get(
                    "actorId"
                ),
                "actorRole": log.get(
                    "actorRole"
                ),
                "action": log.get(
                    "action"
                ),
                "targetUserId": log.get(
                    "targetUserId"
                ),
                "targetEmail": log.get(
                    "targetEmail"
                ),
                "targetRole": log.get(
                    "targetRole"
                ),
                "details": log.get(
                    "details",
                    {}
                ),
                "timestamp": (
                    log.get(
                        "timestamp"
                    ).isoformat()
                    if log.get("timestamp")
                    else None
                )
            })

        return jsonify({
            "message": "Audit logs retrieved successfully",
            "logs": result,
            "total": len(result)
        }), 200

    except Exception as e:

        print(
            "GET AUDIT LOGS ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to retrieve audit logs"
        }), 500

