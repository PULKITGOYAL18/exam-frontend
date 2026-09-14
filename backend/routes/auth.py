from flask import Blueprint, request, jsonify, current_app

from utils.security import verify_password, create_token


# ============================================================
# Authentication Blueprint
# ============================================================

auth_bp = Blueprint(
    "auth",
    __name__,
    url_prefix="/api/auth"
)


# ============================================================
# Helper: Get Database
# ============================================================

def get_db():
    """Get database connection from Flask app"""
    return current_app.db


# ============================================================
# LOGIN
# ============================================================

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate a user using email and password.

    Expected request:

    {
        "email": "admin@examevaluate.com",
        "password": "your-password"
    }

    Successful response:

    {
        "message": "Login successful",
        "token": "...",
        "user": {
            "id": "...",
            "name": "...",
            "email": "...",
            "role": "admin",
            "department": "Administration",
            "designation": "System Administrator",
            "employeeId": "ADM-2026-001"
        }
    }
    """

    # ========================================================
    # 1. Read JSON request
    # ========================================================

    data = request.get_json(silent=True)

    print("\n========== LOGIN REQUEST ==========")
    print("Content-Type:", request.content_type)
    print("Request JSON:", data)
    print("===================================\n")

    if not data:
        return jsonify({
            "message": "Request body is required"
        }), 400

    # ========================================================
    # 2. Get email and password
    # ========================================================

    email = str(
        data.get("email", "")
    ).strip().lower()

    password = str(
        data.get("password", "")
    )

    print("Login email:", email)
    print("Password received:", bool(password))

    # ========================================================
    # 3. Validate required fields
    # ========================================================

    if not email or not password:

        print(
            "LOGIN ERROR: Email or password missing"
        )

        return jsonify({
            "message": "Email and password are required"
        }), 400

    # ========================================================
    # 4. Get database from current_app
    # ========================================================

    try:

        from app import db

        if db is None:

            print(
                "LOGIN ERROR: Database object is None"
            )

            return jsonify({
                "message": "Database connection is not available"
            }), 500

    except Exception as e:

        print(
            "DATABASE IMPORT ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Database connection error"
        }), 500

    # ========================================================
    # 5. Find user
    # ========================================================

    try:

        user = db.users.find_one({
            "email": email
        })

    except Exception as e:

        print(
            "MONGODB QUERY ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to access user database"
        }), 500

    # ========================================================
    # 6. User not found
    # ========================================================

    if not user:

        print(
            "LOGIN FAILED: User not found"
        )

        return jsonify({
            "message": "Invalid email or password"
        }), 401

    # ========================================================
    # 7. Log user information
    # ========================================================

    print(
        "User found:",
        user.get("email"),
        "| Role:",
        user.get("role"),
        "| Status:",
        user.get("status"),
        "| Employee ID:",
        user.get("employeeId")
    )

    # ========================================================
    # 8. Check account status
    # ========================================================

    status = str(
        user.get("status", "")
    ).lower()

    if status != "active":

        print(
            "LOGIN FAILED: Account inactive"
        )

        return jsonify({
            "message": "Account is inactive"
        }), 403

    # ========================================================
    # 9. Get stored password
    # ========================================================

    stored_password = user.get("password")

    if not stored_password:

        print(
            "LOGIN ERROR: User has no stored password"
        )

        return jsonify({
            "message": "User account is not configured correctly"
        }), 500

    # ========================================================
    # 10. Verify password
    # ========================================================

    try:

        password_valid = verify_password(
            password,
            stored_password
        )

    except Exception as e:

        print(
            "PASSWORD VERIFICATION ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to verify credentials"
        }), 500

    if not password_valid:

        print(
            "LOGIN FAILED: Incorrect password"
        )

        return jsonify({
            "message": "Invalid email or password"
        }), 401

    # ========================================================
    # 11. Create JWT token
    # ========================================================

    try:

        user_id = str(
            user["_id"]
        )

        role = str(
            user.get("role", "user")
        ).lower()

        token = create_token(
            user_id,
            role
        )

    except Exception as e:

        print(
            "TOKEN CREATION ERROR:",
            str(e)
        )

        return jsonify({
            "message": "Unable to create authentication token"
        }), 500

    # ========================================================
    # 12. Get Employee ID
    # ========================================================
    #
    # IMPORTANT:
    #
    # user["_id"]
    #       = MongoDB ObjectId
    #
    # user["employeeId"]
    #       = Actual university employee ID
    #
    # Example:
    #
    # employeeId = "ADM-2026-001"
    #
    # ========================================================

    employee_id = user.get("employeeId")

    if employee_id is not None:
        employee_id = str(employee_id).strip()

    # Don't accidentally send an empty string.
    if not employee_id:
        employee_id = None

    # ========================================================
    # 13. Prepare user data
    # ========================================================

    user_data = {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
        "department": user.get("department"),
        "designation": user.get("designation"),
        "employeeId": employee_id
    }

    # ========================================================
    # 14. IMPORTANT DEBUG OUTPUT
    # ========================================================

    print("\n========== FINAL USER DATA ==========")
    print("MongoDB ID:", user_data["id"])
    print("Name:", user_data["name"])
    print("Email:", user_data["email"])
    print("Role:", user_data["role"])
    print("Department:", user_data["department"])
    print("Designation:", user_data["designation"])
    print("Employee ID:", user_data["employeeId"])
    print("=====================================\n")

    # ========================================================
    # 15. Return successful response
    # ========================================================

    response_data = {
        "message": "Login successful",
        "token": token,
        "user": user_data
    }

    # ========================================================
    # 16. Print EXACT response sent to frontend
    # ========================================================

    print("\n========== RESPONSE TO FRONTEND ==========")
    print(response_data)
    print("==========================================\n")

    return jsonify(response_data), 200