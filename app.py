"""
Sahaay 2.0 - Household Services Booking Platform Backend
Python + Flask REST API with HTTP Methods (GET, POST, PUT, DELETE)
"""

import os
import sqlite3
import json
from flask import Flask, request, jsonify, render_template, send_from_directory

app = Flask(
    __name__,
    static_folder="frontend",
    static_url_path="",
    template_folder="frontend"
)

DB_PATH = os.path.join(os.path.dirname(__file__), "sahaay.db")


def get_db():
    """Connect to SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create database tables if they do not exist. Starts completely empty (no fake data)."""
    conn = get_db()
    cursor = conn.cursor()

    # Helpers table (stores registered helpers)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS helpers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            location TEXT NOT NULL,
            skills TEXT NOT NULL,
            timings TEXT NOT NULL,
            experience_years INTEGER DEFAULT 1,
            hourly_rate INTEGER DEFAULT 150,
            bio TEXT,
            is_emergency INTEGER DEFAULT 0,
            availability_status TEXT DEFAULT 'Available'
        )
    """)

    # Bookings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            helper_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_address TEXT NOT NULL,
            service_needed TEXT NOT NULL,
            booking_date TEXT NOT NULL,
            booking_time TEXT,
            notes TEXT,
            status TEXT DEFAULT 'Confirmed',
            FOREIGN KEY (helper_id) REFERENCES helpers (id) ON DELETE CASCADE
        )
    """)

    # Chat messages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            helper_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (helper_id) REFERENCES helpers (id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()


@app.after_request
def add_cors_headers(response):
    """Allow frontend to communicate with API."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


# -----------------------------------------------------------------------------
# Frontend Route
# -----------------------------------------------------------------------------
@app.route("/")
def home():
    """Serves the main website from frontend/index.html."""
    return send_from_directory("frontend", "index.html")


# -----------------------------------------------------------------------------
# API Routes: Helpers (GET, POST, PUT, DELETE)
# -----------------------------------------------------------------------------
@app.route("/api/helpers", methods=["GET"])
def get_helpers():
    """HTTP GET: Retrieve all helpers with optional search, skill, or emergency filter."""
    conn = get_db()
    cursor = conn.cursor()

    search = request.args.get("search", "").strip().lower()
    skill = request.args.get("skill", "").strip().lower()
    emergency = request.args.get("emergency")

    query = "SELECT * FROM helpers WHERE 1=1"
    params = []

    if emergency is not None:
        query += " AND is_emergency = ?"
        params.append(int(emergency))

    if skill and skill != "all":
        query += " AND LOWER(skills) LIKE ?"
        params.append(f"%{skill}%")

    if search:
        query += " AND (LOWER(name) LIKE ? OR LOWER(location) LIKE ? OR LOWER(skills) LIKE ?)"
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    query += " ORDER BY id DESC"
    cursor.execute(query, params)
    rows = cursor.fetchall()

    helpers = []
    for r in rows:
        item = dict(r)
        try:
            item["skills"] = json.loads(item["skills"])
        except Exception:
            item["skills"] = [s.strip() for s in item["skills"].split(",") if s.strip()]
        helpers.append(item)

    conn.close()
    return jsonify({"success": True, "count": len(helpers), "data": helpers}), 200


@app.route("/api/helpers", methods=["POST"])
def add_helper():
    """HTTP POST: Register a new helper (Providing Service)."""
    data = request.get_json(force=True, silent=True) or request.form.to_dict()
    if not data:
        return jsonify({"success": False, "error": "No data received"}), 400

    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    location = data.get("location", "").strip()
    timings = data.get("timings", "").strip()
    skills_raw = data.get("skills", [])

    if not name or not phone or not location:
        return jsonify({"success": False, "error": "Name, phone, and location are required"}), 400

    if isinstance(skills_raw, list):
        skills_json = json.dumps(skills_raw)
    else:
        skills_json = json.dumps([s.strip() for s in str(skills_raw).split(",") if s.strip()])

    experience_years = int(data.get("experience_years", 1))
    hourly_rate = int(data.get("hourly_rate", 150))
    bio = data.get("bio", "").strip()
    is_emergency = 1 if str(data.get("is_emergency", 0)).lower() in ("1", "true") else 0

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO helpers (
            name, phone, location, skills, timings,
            experience_years, hourly_rate, bio, is_emergency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        name, phone, location, skills_json, timings or "Flexible Timings",
        experience_years, hourly_rate, bio, is_emergency
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Helper registered successfully", "id": new_id}), 201


@app.route("/api/helpers/<int:helper_id>", methods=["PUT"])
def update_helper(helper_id):
    """HTTP PUT: Update helper availability or details."""
    data = request.get_json(force=True, silent=True) or {}
    new_status = data.get("availability_status", "Available")

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE helpers SET availability_status = ? WHERE id = ?", (new_status, helper_id))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"Helper {helper_id} updated"}), 200


@app.route("/api/helpers/<int:helper_id>", methods=["DELETE"])
def delete_helper(helper_id):
    """HTTP DELETE: Remove helper profile."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM helpers WHERE id = ?", (helper_id,))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": f"Helper {helper_id} deleted"}), 200


# -----------------------------------------------------------------------------
# API Routes: Emergency Services
# -----------------------------------------------------------------------------
@app.route("/api/emergency", methods=["GET"])
def get_emergency():
    """HTTP GET: Quick retrieval of emergency helpers (electricians, plumbers)."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM helpers WHERE is_emergency = 1 ORDER BY id DESC")
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
# API Routes: Bookings
# -----------------------------------------------------------------------------
@app.route("/api/bookings", methods=["GET", "POST"])
def handle_bookings():
    """HTTP GET (retrieve bookings) & HTTP POST (book a helper)."""
    conn = get_db()
    cursor = conn.cursor()

    if request.method == "GET":
        cursor.execute("""
            SELECT b.*, h.name as helper_name, h.phone as helper_phone
            FROM bookings b
            JOIN helpers h ON b.helper_id = h.id
            ORDER BY b.id DESC
        """)
        bookings = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "data": bookings}), 200

    data = request.get_json(force=True, silent=True) or request.form.to_dict()
    cursor.execute("""
        INSERT INTO bookings (
            helper_id, customer_name, customer_phone,
            customer_address, service_needed, booking_date, booking_time, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("helper_id"),
        data.get("customer_name"),
        data.get("customer_phone"),
        data.get("customer_address"),
        data.get("service_needed"),
        data.get("booking_date"),
        data.get("booking_time", ""),
        data.get("notes", "")
    ))
    booking_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Booking confirmed", "id": booking_id}), 201


# -----------------------------------------------------------------------------
# API Routes: Chat
# -----------------------------------------------------------------------------
@app.route("/api/chat/<int:helper_id>", methods=["GET"])
def get_chat(helper_id):
    """HTTP GET: Retrieve chat messages for a helper."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE helper_id = ? ORDER BY timestamp ASC", (helper_id,))
    messages = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({"success": True, "data": messages}), 200


@app.route("/api/chat", methods=["POST"])
def send_chat():
    """HTTP POST: Send message to discuss timings or requirements."""
    data = request.get_json(force=True, silent=True) or {}
    helper_id = data.get("helper_id")
    sender = data.get("sender", "customer")
    text = data.get("text", "").strip()

    if not helper_id or not text:
        return jsonify({"success": False, "error": "helper_id and text required"}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO messages (helper_id, sender, text) VALUES (?, ?, ?)", (helper_id, sender, text))
    conn.commit()
    conn.close()

    return jsonify({"success": True, "message": "Message sent"}), 201


# Initialize database upon startup
init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
