import os
import sys

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError

# ============================================================
# Backend directory
# ============================================================

BACKEND_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# ============================================================
# Import SAME password hashing function used by Flask
# ============================================================

from utils.security import hash_password

# ============================================================
# Load .env
# ============================================================

load_dotenv(
    os.path.join(
        BACKEND_DIR,
        ".env"
    )
)

# ============================================================
# MongoDB connection
# ============================================================

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise RuntimeError(
        "MONGODB_URI is not configured in .env"
    )

client = MongoClient(MONGODB_URI)

# ============================================================
# Database
# ============================================================

db = client["ExamEvaluate"]
users = db["users"]

# ============================================================
# USERS
# ============================================================

users_to_create = [

    # ========================================================
    # ADMIN
    # ========================================================

    {
        "name": "ExamEvaluate Admin",
        "email": "admin@examevaluate.com",

        # CHANGE THIS PASSWORD
        "password": "Admin@123",

        "employeeId": "ADM-2026-001",
        "role": "admin",
        "status": "active",
        "department": "Administration",
        "designation": "System Administrator",
    },

    # ========================================================
    # FACULTY
    # ========================================================

    {
        "name": "Dr. Akshay Juneja",
        "email": "faculty001@university.edu",

        # CHANGE THIS PASSWORD IF REQUIRED
        "password": "Faculty@001",

        "employeeId": "FAC-2026-001",
        "role": "faculty",
        "status": "active",
        "department": "Computer Science",
        "designation": "Assistant Professor",
    },

    {
        "name": "Dr. Aradhya Saini ",
        "email": "faculty002@university.edu",
    
            # CHANGE THIS PASSWORD IF REQUIRED
        "password": "Faculty@002",
    
        "employeeId": "FAC-2026-002",
        "role": "faculty",
        "status": "active",
        "department": "Computer Science",
        "designation": "Assistant Professor",
    },

    {
        "name": "Ms. Nidhi Rana",
        "email": "faculty003@university.edu",
    
            # CHANGE THIS PASSWORD IF REQUIRED
        "password": "Faculty@003",
    
        "employeeId": "FAC-2026-003",
        "role": "faculty",
        "status": "active",
        "department": "Computer Science",
        "designation": "Assistant Professor",
    },

    {
        "name": "Ms. Neetu Singh",
        "email": "faculty004@university.edu",
    
            # CHANGE THIS PASSWORD IF REQUIRED
        "password": "Faculty@004",
    
        "employeeId": "FAC-2026-004",
        "role": "faculty",
        "status": "active",
        "department": "Computer Science",
        "designation": "Assistant Professor",
    },

    {
        "name": "Mr. Ravi Kumar",
        "email": "faculty005@university.edu",
    
            # CHANGE THIS PASSWORD IF REQUIRED
        "password": "Faculty@005",
    
        "employeeId": "FAC-2026-005",
        "role": "faculty",
        "status": "active",
        "department": "Computer Science",
        "designation": "Assistant Professor",
    },
    {
        "name": "Mr. Kapil Kumar",
        "email": "faculty006@university.edu",
    
            # CHANGE THIS PASSWORD IF REQUIRED
        "password": "Faculty@006",
    
        "employeeId": "FAC-2026-006",
        "role": "faculty",
        "status": "active",
        "department": "Computer Science",
        "designation": "Assistant Professor",
    },

    # ========================================================
    # HOD
    # ========================================================

    {
        "name": "Prof. Deepak Painuli",
        "email": "hod@university.edu",

        # CHANGE THIS PASSWORD IF REQUIRED
        "password": "HOD@1234",

        "employeeId": "HOD-2026-001",
        "role": "hod",
        "status": "active",
        "department": "Computer Science",
        "designation": "Head of Department",
    },

    # ========================================================
    # DEAN
    # ========================================================

    {
        "name": "Prof. Gessu Thakur",
        "email": "dean@university.edu",

        # CHANGE THIS PASSWORD IF REQUIRED
        "password": "Dean@123",

        "employeeId": "DEAN-2026-001",
        "role": "dean",
        "status": "active",
        "department": "Academics",
        "designation": "Dean of Academics",
    },
]

# ============================================================
# Create unique indexes
# ============================================================

print("\nCreating unique indexes...")

try:

    users.create_index(
        [("email", 1)],
        unique=True,
        name="unique_user_email"
    )

    users.create_index(
        [("employeeId", 1)],
        unique=True,
        name="unique_employee_id"
    )

    print("Unique indexes are ready.")

except Exception as e:

    print("Index creation warning:")
    print(e)

# ============================================================
# CREATE / UPDATE USERS
# ============================================================

print("\nStarting user creation/update...\n")

for user in users_to_create:

    email = user["email"].strip().lower()
    employee_id = user["employeeId"].strip()

    # --------------------------------------------------------
    # Find existing user by email
    # --------------------------------------------------------

    existing_user = users.find_one({
        "email": email
    })

    # --------------------------------------------------------
    # If email doesn't exist, find by employee ID
    # --------------------------------------------------------

    if not existing_user:

        existing_user = users.find_one({
            "employeeId": employee_id
        })

    # ========================================================
    # EXISTING USER
    # ========================================================

    if existing_user:

        hashed_password = hash_password(
            user["password"]
        )

        users.update_one(
            {
                "_id": existing_user["_id"]
            },
            {
                "$set": {
                    "name": user["name"],
                    "email": email,
                    "password": hashed_password,
                    "employeeId": employee_id,
                    "role": user["role"],
                    "status": user["status"],
                    "department": user["department"],
                    "designation": user["designation"],
                }
            }
        )

        print(f"UPDATED: {email}")

    # ========================================================
    # NEW USER
    # ========================================================

    else:

        hashed_password = hash_password(
            user["password"]
        )

        user_document = {
            "name": user["name"],
            "email": email,
            "password": hashed_password,
            "employeeId": employee_id,
            "role": user["role"],
            "status": user["status"],
            "department": user["department"],
            "designation": user["designation"],
        }

        try:

            result = users.insert_one(
                user_document
            )

            print(f"CREATED: {email}")

            print(
                f"MongoDB ID: {result.inserted_id}"
            )

        except DuplicateKeyError:

            print(
                f"DUPLICATE PREVENTED: {email}"
            )

    print(
        f"Role: {user['role']}"
    )

    print(
        f"Employee ID: {user['employeeId']}"
    )

    print("-" * 60)

# ============================================================
# FINAL VERIFICATION
# ============================================================

print("\n========================================")
print("USER CREATION / UPDATE COMPLETED")
print("========================================\n")

print("Users currently in MongoDB:\n")

for user in users.find(
    {},
    {
        "name": 1,
        "email": 1,
        "role": 1,
        "employeeId": 1,
        "status": 1,
        "department": 1,
        "designation": 1,
    }
):

    print(
        f"Name        : {user.get('name')}"
    )

    print(
        f"Email       : {user.get('email')}"
    )

    print(
        f"Role        : {user.get('role')}"
    )

    print(
        f"Employee ID : {user.get('employeeId')}"
    )

    print(
        f"Status      : {user.get('status')}"
    )

    print(
        f"Department  : {user.get('department')}"
    )

    print(
        f"Designation : {user.get('designation')}"
    )

    print("-" * 60)

print(
    f"\nTotal users: {users.count_documents({})}"
)

# ============================================================
# Close MongoDB connection
# ============================================================

client.close()

print("\nMongoDB connection closed.")
print("Done.")
