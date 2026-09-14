# routes/answer_key.py

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime

answer_key_bp = Blueprint('answer_key', __name__, url_prefix='/api/answer-key')


def get_db():
    """Get database connection from Flask app"""
    return current_app.db


def serialize_answer_key(key):
    return {
        "id": str(key["_id"]),
        "name": key.get("name", ""),
        "subject": key.get("subject", ""),
        "department": key.get("department", ""),
        "semester": key.get("semester", 1),
        "total_marks": key.get("total_marks", 0),
        "total_questions": key.get("total_questions", 0),
        "questions": key.get("questions", []),
        "created_at": key.get("created_at", ""),
        "updated_at": key.get("updated_at", ""),
        "created_by": key.get("created_by", "")
    }


@answer_key_bp.route("/list", methods=["GET"])
@jwt_required()
def list_answer_keys():
    try:
        db = get_db()
        current_user_id = get_jwt_identity()
        print(f"📌 Current user ID: {current_user_id}")
        
        if not current_user_id:
            return jsonify({
                "status": "error",
                "message": "User identity not found in token"
            }), 401
        
        # Use the db from Flask app
        answer_keys_collection = db["answer_keys"]
        keys = answer_keys_collection.find({"created_by": current_user_id})
        
        result = []
        for key in keys:
            result.append({
                "id": str(key["_id"]),
                "name": key.get("name", ""),
                "subject": key.get("subject", ""),
                "semester": key.get("semester", 1),
                "total_marks": key.get("total_marks", 0),
                "total_questions": key.get("total_questions", 0),
                "created_at": key.get("created_at", "")
            })
        
        return jsonify({
            "status": "success",
            "data": result
        }), 200
        
    except Exception as e:
        print(f"❌ Error listing answer keys: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@answer_key_bp.route("/create", methods=["POST"])
@jwt_required()
def create_answer_key():
    try:
        db = get_db()
        data = request.get_json()
        
        required = ['name', 'subject', 'questions']
        for field in required:
            if field not in data:
                return jsonify({
                    "status": "error",
                    "message": f"Missing required field: {field}"
                }), 400
        
        current_user_id = get_jwt_identity()
        answer_keys_collection = db["answer_keys"]
        
        answer_key = {
            "name": data.get('name'),
            "subject": data.get('subject'),
            "department": data.get('department', ''),
            "semester": data.get('semester', 1),
            "total_marks": data.get('total_marks', 0),
            "total_questions": len(data.get('questions', [])),
            "questions": data.get('questions', []),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "created_by": current_user_id
        }
        
        result = answer_keys_collection.insert_one(answer_key)
        created = answer_keys_collection.find_one({"_id": result.inserted_id})
        
        return jsonify({
            "status": "success",
            "message": "Answer key created successfully",
            "data": serialize_answer_key(created)
        }), 201
        
    except Exception as e:
        print(f"❌ Error creating answer key: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@answer_key_bp.route("/<key_id>", methods=["GET"])
@jwt_required()
def get_answer_key(key_id):
    try:
        db = get_db()
        current_user_id = get_jwt_identity()
        answer_keys_collection = db["answer_keys"]
        
        key = answer_keys_collection.find_one({
            "_id": ObjectId(key_id),
            "created_by": current_user_id
        })
        
        if not key:
            return jsonify({
                "status": "error",
                "message": "Answer key not found"
            }), 404
        
        return jsonify({
            "status": "success",
            "data": serialize_answer_key(key)
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting answer key: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@answer_key_bp.route("/<key_id>", methods=["PUT"])
@jwt_required()
def update_answer_key(key_id):
    try:
        db = get_db()
        current_user_id = get_jwt_identity()
        data = request.get_json()
        answer_keys_collection = db["answer_keys"]
        
        key = answer_keys_collection.find_one({
            "_id": ObjectId(key_id),
            "created_by": current_user_id
        })
        
        if not key:
            return jsonify({
                "status": "error",
                "message": "Answer key not found"
            }), 404
        
        update_fields = {}
        for field in ['name', 'subject', 'department', 'semester', 'questions']:
            if field in data:
                update_fields[field] = data[field]
        
        if 'questions' in update_fields:
            update_fields['total_questions'] = len(update_fields['questions'])
        
        update_fields['updated_at'] = datetime.now().isoformat()
        
        answer_keys_collection.update_one(
            {"_id": ObjectId(key_id)},
            {"$set": update_fields}
        )
        
        updated = answer_keys_collection.find_one({"_id": ObjectId(key_id)})
        
        return jsonify({
            "status": "success",
            "message": "Answer key updated successfully",
            "data": serialize_answer_key(updated)
        }), 200
        
    except Exception as e:
        print(f"❌ Error updating answer key: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@answer_key_bp.route("/<key_id>", methods=["DELETE"])
@jwt_required()
def delete_answer_key(key_id):
    try:
        db = get_db()
        current_user_id = get_jwt_identity()
        answer_keys_collection = db["answer_keys"]
        
        result = answer_keys_collection.delete_one({
            "_id": ObjectId(key_id),
            "created_by": current_user_id
        })
        
        if result.deleted_count == 0:
            return jsonify({
                "status": "error",
                "message": "Answer key not found"
            }), 404
        
        return jsonify({
            "status": "success",
            "message": "Answer key deleted successfully"
        }), 200
        
    except Exception as e:
        print(f"❌ Error deleting answer key: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@answer_key_bp.route("/subject/<subject>", methods=["GET"])
@jwt_required()
def get_by_subject(subject):
    try:
        db = get_db()
        current_user_id = get_jwt_identity()
        answer_keys_collection = db["answer_keys"]
        
        keys = answer_keys_collection.find({
            "created_by": current_user_id,
            "subject": {"$regex": subject, "$options": "i"}
        })
        
        result = []
        for key in keys:
            result.append({
                "id": str(key["_id"]),
                "name": key.get("name", ""),
                "subject": key.get("subject", ""),
                "semester": key.get("semester", 1),
                "total_marks": key.get("total_marks", 0),
                "total_questions": key.get("total_questions", 0),
                "created_at": key.get("created_at", "")
            })
        
        return jsonify({
            "status": "success",
            "data": result
        }), 200
        
    except Exception as e:
        print(f"❌ Error getting answer keys by subject: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500