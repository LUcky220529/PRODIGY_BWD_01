import os
import re
import uuid
import logging
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
CORS(app)

# In-memory storage for users (hashmap/dictionary)
users_storage = {}

# Email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

def validate_email(email):
    """Validate email format using regex"""
    return EMAIL_REGEX.match(email) is not None

def validate_age(age):
    """Validate age is a positive integer"""
    try:
        age_int = int(age)
        return age_int > 0 and age_int <= 150
    except (ValueError, TypeError):
        return False

def validate_user_data(data, is_update=False):
    """Validate user data and return errors if any"""
    errors = []
    
    if not is_update or 'name' in data:
        if not data.get('name') or not data.get('name').strip():
            errors.append("Name is required and cannot be empty")
        elif len(data.get('name', '').strip()) < 2:
            errors.append("Name must be at least 2 characters long")
    
    if not is_update or 'email' in data:
        if not data.get('email'):
            errors.append("Email is required")
        elif not validate_email(data.get('email')):
            errors.append("Email format is invalid")
        elif is_update:
            # Check if email is already taken by another user
            existing_user = next((u for u in users_storage.values() if u['email'] == data.get('email')), None)
            if existing_user and existing_user['id'] != data.get('current_user_id'):
                errors.append("Email is already taken by another user")
        elif not is_update:
            # Check if email is already taken (for new users)
            if any(user['email'] == data.get('email') for user in users_storage.values()):
                errors.append("Email is already taken")
    
    if not is_update or 'age' in data:
        if not data.get('age'):
            errors.append("Age is required")
        elif not validate_age(data.get('age')):
            errors.append("Age must be a positive integer between 1 and 150")
    
    return errors

# Routes for serving the frontend
@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

# API Routes
@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users"""
    try:
        users_list = list(users_storage.values())
        return jsonify({
            'success': True,
            'data': users_list,
            'count': len(users_list)
        }), 200
    except Exception as e:
        app.logger.error(f"Error getting users: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get a specific user by ID"""
    try:
        if user_id not in users_storage:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': users_storage[user_id]
        }), 200
    except Exception as e:
        app.logger.error(f"Error getting user {user_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user"""
    try:
        # Get JSON data from request
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        # Validate user data
        errors = validate_user_data(data)
        if errors:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'details': errors
            }), 400
        
        # Create new user with UUID
        user_id = str(uuid.uuid4())
        new_user = {
            'id': user_id,
            'name': data['name'].strip(),
            'email': data['email'].strip().lower(),
            'age': int(data['age'])
        }
        
        # Store user
        users_storage[user_id] = new_user
        
        app.logger.info(f"Created new user: {user_id}")
        return jsonify({
            'success': True,
            'data': new_user,
            'message': 'User created successfully'
        }), 201
        
    except Exception as e:
        app.logger.error(f"Error creating user: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    """Update an existing user"""
    try:
        if user_id not in users_storage:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Get JSON data from request
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Request body is required'
            }), 400
        
        # Add current user ID for email uniqueness validation
        data['current_user_id'] = user_id
        
        # Validate user data for update
        errors = validate_user_data(data, is_update=True)
        if errors:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'details': errors
            }), 400
        
        # Update user data
        user = users_storage[user_id]
        if 'name' in data:
            user['name'] = data['name'].strip()
        if 'email' in data:
            user['email'] = data['email'].strip().lower()
        if 'age' in data:
            user['age'] = int(data['age'])
        
        app.logger.info(f"Updated user: {user_id}")
        return jsonify({
            'success': True,
            'data': user,
            'message': 'User updated successfully'
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error updating user {user_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a user"""
    try:
        if user_id not in users_storage:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404
        
        # Delete user
        deleted_user = users_storage.pop(user_id)
        
        app.logger.info(f"Deleted user: {user_id}")
        return jsonify({
            'success': True,
            'data': deleted_user,
            'message': 'User deleted successfully'
        }), 200
        
    except Exception as e:
        app.logger.error(f"Error deleting user {user_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Internal server error'
        }), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'error': 'Method not allowed'
    }), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
