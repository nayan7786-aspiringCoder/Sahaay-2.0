"""
Sahaay 2.0 - Household Services Booking Platform Backend
Built with Python & Flask.
Implements RESTful routes and all primary HTTP methods (GET, POST, PUT, DELETE).
"""

import os
import json
from flask import Flask, request, jsonify, render_template, send_from_directory
from database import init_db, get_db_connection

# Optional CORS support; if flask_cors is not installed, fallback to after_request headers
try:
    from flask_cors import CORS
    has_cors = True
except ImportError:
    has_cors = False

app = Flask(
    __name__,
    static_folder="static",
    template_folder="templates"
)

if has_cors:
    CORS(app)


@app.after_request
def add_cors_headers(response):
    """Ensure CORS headers are set so GitHub Pages or external frontends can call this API."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


# -----------------------------------------------------------------------------
# Frontend Routes
# -----------------------------------------------------------------------------
@app.route("/")
def index():
    """Serves the main web application UI."""
    return render_template("index.html")


@app.route("/health")
def health():
    """Healthcheck endpoint for deployment monitoring (Render, Railway, etc.)."""
    return jsonify({"status": "healthy", "service": "Sahaay 2.0 API"}), 200


# -----------------------------------------------------------------------------
# API Endpoints: Helpers (GET, POST, PUT, DELETE)
# -----------------------------------------------------------------------------
@app.route("/api/helpers", methods=["GET"])
def get_helpers():
    """
    HTTP GET: Retrieve all helpers with optional search, skill, and emergency filters.
    Query Params:
      - search: string to search in name, location, or skills
      - skill: specific skill filter (e.g. 'Cooking', 'Driver')
      - emergency: 1 for emergency on-call tradespeople, 0 for household helpers
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    search_query = request.args.get("search", "").strip().lower()
    skill_filter = request.args.get("skill", "").strip().lower()
    emergency_filter = request.args.get("emergency")

    query = "SELECT * FROM helpers WHERE 1=1"
    params = []

    if emergency_filter is not None:
        query += " AND is_emergency = ?"
        params.append(int(emergency_filter))

    if skill_filter and skill_filter != "all":
        query += " AND LOWER(skills) LIKE ?"
        params.append(f"%{skill_filter}%")

    if search_query:
        query += " AND (LOWER(name) LIKE ? OR LOWER(location) LIKE ? OR LOWER(skills) LIKE ?)"
        term = f"%{search_query}%"
        params.extend([term, term, term])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()

    helpers = []
    for row in rows:
        item = dict(row)
        try:
            item["skills"] = json.loads(item["skills"])
        except Exception:
            item["skills"] = [s.strip() for s in item["skills"].split(",") if s.strip()]
        helpers.append(item)

    conn.close()
    return jsonify({"success": True, "count": len(helpers), "data": helpers}), 200


@app.route("/api/helpers/<int:helper_id>", methods=["GET"])
def get_helper_by_id(helper_id):
    """HTTP GET: Retrieve detailed profile for a single helper."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM helpers WHERE id = ?", (helper_id,))
    row = cursor.fetchone()
    conn.close()

    if row is None:
        return jsonify({"success": False, "error": f"Helper with ID {helper_id} not found"}), 404

    item = dict(row)
    try:
        item["skills"] = json.loads(item["skills"])
    except Exception:
        item["skills"] = [s.strip() for s in item["skills"].split(",") if s.strip()]

    return jsonify({"success": True, "data": item}), 200


@app.route("/api/helpers", methods=["POST"])
def create_helper():
    """
    HTTP POST: Register a new helper (Providing Service).
    JSON Payload:
      - name, phone, location, skills (list or str), timings
      - experience_years, hourly_rate, bio, is_emergency
    """
    data = request.get_json(force=True, silent=True) or request.form.to_dict()
    if not data:
        return jsonify({"success": False, "error": "Missing JSON request body"}), 400

    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    location = data.get("location", "").strip()
    timings = data.get("timings", "").strip()
    skills_raw = data.get("skills", [])

    if not name or not phone or not location:
        return jsonify({
            "success": False,
            "error": "Required fields: name, phone, location"
        }), 400

    if isinstance(skills_raw, list):
        skills_json = json.dumps(skills_raw)
    elif isinstance(skills_raw, str):
        skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()]
        skills_json = json.dumps(skills_list)
    else:
        skills_json = json.dumps(["General Help"])

    experience_years = int(data.get("experience_years", 1))
    hourly_rate = int(data.get("hourly_rate", 150))
    bio = data.get("bio", f"Experienced in household assistance across {location}.")
    is_emergency = 1 if str(data.get("is_emergency", 0)).lower() in ("1", "true") else 0
    availability_status = data.get("availability_status", "Available")
    avatar_color = data.get("avatar_color", "#2d6a4f")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO helpers (
            name, phone, location, skills, timings,
            experience_years, hourly_rate, bio,
            is_emergency, availability_status, avatar_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        name, phone, location, skills_json, timings or "Flexible Timings",
        experience_years, hourly_rate, bio, is_emergency, availability_status, avatar_color
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Helper registered successfully",
        "data": {
            "id": new_id,
            "name": name,
            "phone": phone,
            "location": location,
            "skills": json.loads(skills_json),
            "timings": timings,
            "hourly_rate": hourly_rate,
            "is_emergency": is_emergency
        }
    }), 201


@app.route("/api/helpers/<int:helper_id>", methods=["PUT"])
def update_helper(helper_id):
    """
    HTTP PUT: Update existing helper details or availability status.
    """
    data = request.get_json(force=True, silent=True) or request.form.to_dict()
    if not data:
        return jsonify({"success": False, "error": "No update data provided"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM helpers WHERE id = ?", (helper_id,))
    existing = cursor.fetchone()

    if not existing:
        conn.close()
        return jsonify({"success": False, "error": f"Helper with ID {helper_id} not found"}), 404

    # Build dynamic update statement based on fields passed
    allowed_fields = [
        "name", "phone", "location", "timings", "experience_years",
        "hourly_rate", "bio", "is_emergency", "availability_status"
    ]
    updates = []
    values = []

    for field in allowed_fields:
        if field in data:
            updates.append(f"{field} = ?")
            values.append(data[field])

    if "skills" in data:
        skills_val = data["skills"]
        if isinstance(skills_val, list):
            skills_val = json.dumps(skills_val)
        updates.append("skills = ?")
        values.append(skills_val)

    if not updates:
        conn.close()
        return jsonify({"success": False, "error": "No valid fields provided to update"}), 400

    values.append(helper_id)
    query = f"UPDATE helpers SET {', '.join(updates)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Helper {helper_id} updated successfully"
    }), 200


@app.route("/api/helpers/<int:helper_id>", methods=["DELETE"])
def delete_helper(helper_id):
    """
    HTTP DELETE: Remove a helper profile from the system.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM helpers WHERE id = ?", (helper_id,))
    existing = cursor.fetchone()

    if not existing:
        conn.close()
        return jsonify({"success": False, "error": f"Helper with ID {helper_id} not found"}), 404

    cursor.execute("DELETE FROM helpers WHERE id = ?", (helper_id,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Helper profile {helper_id} ({existing['name']}) removed successfully"
    }), 200


# -----------------------------------------------------------------------------
# API Endpoints: Emergency Services
# -----------------------------------------------------------------------------
@app.route("/api/emergency", methods=["GET"])
def get_emergency_services():
    """
    HTTP GET: Quick retrieval of immediate emergency on-call tradespeople
    (Electricians, Plumbers, Carpenters).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM helpers WHERE is_emergency = 1 ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        item = dict(r)
        try:
            item["skills"] = json.loads(item["skills"])
        except Exception:
            item["skills"] = [s.strip() for s in item["skills"].split(",") if s.strip()]
        results.append(item)

    return jsonify({"success": True, "count": len(results), "data": results}), 200


# -----------------------------------------------------------------------------
# API Endpoints: Bookings
# -----------------------------------------------------------------------------
@app.route("/api/bookings", methods=["GET", "POST"])
def handle_bookings():
    """
    HTTP GET: Retrieve all booking records.
    HTTP POST: Book a helper for a specific household service.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    if request.method == "GET":
        cursor.execute('''
            SELECT b.*, h.name as helper_name, h.phone as helper_phone
            FROM bookings b
            JOIN helpers h ON b.helper_id = h.id
            ORDER BY b.id DESC
        ''')
        bookings = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "count": len(bookings), "data": bookings}), 200

    # POST method
    data = request.get_json(force=True, silent=True) or request.form.to_dict()
    if not data:
        conn.close()
        return jsonify({"success": False, "error": "Missing booking data"}), 400

    helper_id = data.get("helper_id")
    customer_name = data.get("customer_name", "").strip()
    customer_phone = data.get("customer_phone", "").strip()
    customer_address = data.get("customer_address", "").strip()
    service_needed = data.get("service_needed", "General Help")
    booking_date = data.get("booking_date", "")
    booking_time = data.get("booking_time", "")
    notes = data.get("notes", "")

    if not helper_id or not customer_name or not customer_phone or not customer_address:
        conn.close()
        return jsonify({
            "success": False,
            "error": "Required fields: helper_id, customer_name, customer_phone, customer_address"
        }), 400

    cursor.execute('''
        INSERT INTO bookings (
            helper_id, customer_name, customer_phone,
            customer_address, service_needed, booking_date,
            booking_time, notes, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        helper_id, customer_name, customer_phone,
        customer_address, service_needed, booking_date,
        booking_time, notes, "Confirmed"
    ))
    booking_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Booking confirmed successfully",
        "data": {"id": booking_id, "status": "Confirmed"}
    }), 201


# -----------------------------------------------------------------------------
# API Endpoints: Real-time In-App Chat / Modification Inquiries
# -----------------------------------------------------------------------------
@app.route("/api/chat/<int:helper_id>", methods=["GET"])
def get_chat_messages(helper_id):
    """HTTP GET: Retrieve chat message thread between customer and helper."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM messages WHERE helper_id = ? ORDER BY timestamp ASC",
        (helper_id,)
    )
    messages = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({"success": True, "helper_id": helper_id, "data": messages}), 200


@app.route("/api/chat", methods=["POST"])
def send_chat_message():
    """
    HTTP POST: Send a message to discuss requirements, negotiate timings or modify scope.
    """
    data = request.get_json(force=True, silent=True) or request.form.to_dict()
    if not data:
        return jsonify({"success": False, "error": "Missing message payload"}), 400

    helper_id = data.get("helper_id")
    sender = data.get("sender", "customer")
    text = data.get("text", "").strip()

    if not helper_id or not text:
        return jsonify({"success": False, "error": "helper_id and text are required"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (helper_id, sender, text) VALUES (?, ?, ?)",
        (helper_id, sender, text)
    )
    msg_id = cursor.lastrowid
    conn.commit()

    # Automatically generate an polite AI response from the helper after customer sends a question!
    reply = None
    if sender == "customer":
        reply_texts = [
            "Namaste! Thank you for messaging. Yes, I can adjust the timings according to your preference.",
            "Hello! I am comfortable with this work. Please let me know the exact location and preferred date.",
            "Understood! We can finalize the details and rate as discussed. Looking forward to assisting you."
        ]
        import random
        reply_text = random.choice(reply_texts)
        cursor.execute(
            "INSERT INTO messages (helper_id, sender, text) VALUES (?, ?, ?)",
            (helper_id, "helper", reply_text)
        )
        reply = {"sender": "helper", "text": reply_text}
        conn.commit()

    conn.close()

    return jsonify({
        "success": True,
        "message": "Message sent",
        "data": {"id": msg_id, "helper_id": helper_id, "text": text, "automated_reply": reply}
    }), 201


# -----------------------------------------------------------------------------
# API Endpoints: System Overview Stats
# -----------------------------------------------------------------------------
@app.route("/api/stats", methods=["GET"])
def get_stats():
    """HTTP GET: Platform metrics for dashboard."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total FROM helpers WHERE is_emergency = 0")
    total_helpers = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM helpers WHERE is_emergency = 1")
    total_emergency = cursor.fetchone()["total"]

    cursor.execute("SELECT COUNT(*) as total FROM bookings")
    total_bookings = cursor.fetchone()["total"]
    conn.close()

    return jsonify({
        "success": True,
        "data": {
            "household_helpers": total_helpers,
            "emergency_providers": total_emergency,
            "total_bookings": total_bookings
        }
    }), 200


# Initialize database upon start
with app.app_context():
    init_db()

if __name__ == "__main__":
    # Runs locally on http://127.0.0.1:5000
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
