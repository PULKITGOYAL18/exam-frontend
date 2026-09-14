import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from pymongo import MongoClient
from dotenv import load_dotenv
from routes.auth import auth_bp
from routes.answer_key import answer_key_bp
from routes.admin import admin_bp
from routes.notification_routes import notification_bp

# If HOD routes are actually required, uncomment this:
# from routes.hod import hod_bp


# =========================================================
# Load environment variables
# =========================================================

load_dotenv()


# =========================================================
# Configuration
# =========================================================

MONGODB_URI = os.getenv("MONGODB_URI")
JWT_SECRET = os.getenv("JWT_SECRET")

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not configured in .env")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not configured in .env")


# =========================================================
# Flask Application
# =========================================================

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = JWT_SECRET

CORS(app)

# Initialize JWT Manager
jwt = JWTManager(app)


# =========================================================
# MongoDB Atlas Connection
# =========================================================

try:
    client = MongoClient(MONGODB_URI)
    db = client["ExamEvaluate"]

    # Make DB available to routes
    app.db = db

    # Test connection
    client.admin.command("ping")

    print("✅ Connected to MongoDB Atlas successfully!")
    print(f"📊 Database: {db.name}")

except Exception as e:
    print(f"❌ MongoDB Atlas connection failed: {e}")
    print("Please check your MONGODB_URI in .env file")
    exit(1)


# =========================================================
# Register Blueprints
# =========================================================

app.register_blueprint(auth_bp)
app.register_blueprint(answer_key_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(notification_bp)

# Only add this if you have routes/hod.py:
# app.register_blueprint(hod_bp)# =========================================================
# Home
# =========================================================

@app.route("/")
def home():

    return jsonify({
        "message": "ExamEvaluate Flask backend is running"
    })


@app.route("/api/health")
def health():
    try:
        client.admin.command("ping")
        return jsonify({
            "message": "Flask and MongoDB Atlas are connected",
            "status": "success",
            "database": db.name
        })
    except Exception as e:
        return jsonify({
            "message": "MongoDB Atlas connection failed",
            "status": "error",
            "error": str(e)
        }), 500


# =========================================================
# Start Server
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        use_reloader=False,
        host="127.0.0.1",
        port=5000
    )
    
