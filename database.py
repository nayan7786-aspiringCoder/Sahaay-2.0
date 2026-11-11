"""
Sahaay 2.0 - SQLite Database Layer
Uses Python's built-in sqlite3 standard library (no extra ORM required).
Provides schema creation, seed data initialization, and CRUD query helpers.
"""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'sahaay.db')


def get_db_connection():
    """Returns a connection to the SQLite database with row-factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes database tables and populates starter seed helpers if empty."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Helpers table (Stores profiles for both regular helpers and emergency on-call tradespeople)
    cursor.execute('''
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
            availability_status TEXT DEFAULT 'Available',
            avatar_color TEXT DEFAULT '#2d6a4f',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Bookings table (Stores household service bookings and inquiries)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            helper_id INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_address TEXT NOT NULL,
            service_needed TEXT NOT NULL,
            booking_date TEXT NOT NULL,
            booking_time TEXT NOT NULL,
            notes TEXT,
            status TEXT DEFAULT 'Confirmed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (helper_id) REFERENCES helpers (id) ON DELETE CASCADE
        )
    ''')

    # 3. Messages table (Enables real-time chat/inquiries between household and helper)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            helper_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (helper_id) REFERENCES helpers (id) ON DELETE CASCADE
        )
    ''')

    conn.commit()

    # Seed initial data if helpers table is empty
    cursor.execute('SELECT COUNT(*) as count FROM helpers')
    if cursor.fetchone()['count'] == 0:
        seed_initial_data(cursor)
        conn.commit()

    conn.close()


def seed_initial_data(cursor):
    """Inserts initial helpers and emergency providers so the app is live immediately."""
    helpers_seed = [
        # Regular Household Helpers
        (
            "Sunita Sharma", "9876543210", "Indiranagar, Sector 12",
            json.dumps(["Cleaning House", "Washing Clothes", "Washing Dishes"]),
            "Morning (07:00 AM - 11:00 AM)", 4, 160,
            "Punctual, thorough cleaner with 4 years experience in household domestic help.",
            0, "Available", "#2d6a4f"
        ),
        (
            "Ramesh Kumar", "9811223344", "Green Park, Block C",
            json.dumps(["Cooking", "Washing Dishes"]),
            "Afternoon & Evening (12:00 PM - 08:00 PM)", 6, 250,
            "Specialized in North & South Indian home cooking, hygienic and reliable.",
            0, "Available", "#40916c"
        ),
        (
            "Priya Verma", "9712345678", "Model Town, Phase 1",
            json.dumps(["Babysitting", "Cooking", "Cleaning House"]),
            "Morning & Afternoon (09:00 AM - 04:00 PM)", 5, 220,
            "Experienced nanny and gentle child caregiver with references from 3 families.",
            0, "Available", "#1b4332"
        ),
        (
            "Manjeet Singh", "9988776655", "Civil Lines, Near Metro",
            json.dumps(["Driver", "Gardener"]),
            "Full Day (08:00 AM - 06:00 PM)", 8, 350,
            "Licensed commercial and private driver. Expert in gardening, lawn mowing and hedge trimming.",
            0, "Available", "#52b788"
        ),
        (
            "Anita Devi", "9654321876", "Shanti Nagar",
            json.dumps(["Washing Clothes", "Cleaning House"]),
            "Early Morning (06:30 AM - 10:30 AM)", 3, 140,
            "Expert in hand-wash delicate clothes, ironing and deep room cleaning.",
            0, "Available", "#2d6a4f"
        ),
        (
            "Rajesh Yadav", "9845098765", "Vasant Kunj, Sector B",
            json.dumps(["Gardener"]),
            "Morning (07:00 AM - 12:00 PM)", 7, 180,
            "Passionate botanist & home gardener. Terrace garden care, potting & seasonal plants.",
            0, "Available", "#40916c"
        ),

        # Emergency On-Call Specialists
        (
            "Vikram Rao (Vikram Electricals)", "9900112233", "City Center & Surrounding 10km",
            json.dumps(["Electrician"]),
            "24x7 Immediate Emergency Dispatch", 9, 300,
            "Certified licensed electrician. Short circuits, MCB tripping, fan/geyser emergency repairs.",
            1, "Available Now", "#b02a37"
        ),
        (
            "Mohan Lal (SafeFlow Plumbing)", "9955443322", "Metro Area (Within 30 mins)",
            json.dumps(["Plumber"]),
            "On-Call Emergency (06:00 AM - 11:30 PM)", 11, 280,
            "Rapid response plumber. Water pipe bursts, severe blockage, pump repair & motor leaks.",
            1, "Available Now", "#087f5b"
        ),
        (
            "Suresh Verma (Quick Carpenter)", "9877112233", "South Extension & Ring Road",
            json.dumps(["Carpenter"]),
            "Same Day Service (08:00 AM - 09:00 PM)", 8, 320,
            "Door lock jammed emergencies, broken hinges, urgent latch repairs and wood fixtures.",
            1, "Available Now", "#c92a2a"
        )
    ]

    cursor.executemany('''
        INSERT INTO helpers (
            name, phone, location, skills, timings,
            experience_years, hourly_rate, bio,
            is_emergency, availability_status, avatar_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', helpers_seed)

    # Seed starter chat messages for helper #1 and helper #2
    messages_seed = [
        (1, "customer", "Hello Sunita ji, are you available for house cleaning this Saturday?"),
        (1, "helper", "Namaste! Yes, I am free from 8:00 AM onwards. What is your sector?"),
        (2, "customer", "Hi Ramesh, do you prepare Jain food as well?"),
        (2, "helper", "Yes, absolutely! I cook pure vegetarian and Jain food with separate utensils.")
    ]
    cursor.executemany('''
        INSERT INTO messages (helper_id, sender, text) VALUES (?, ?, ?)
    ''', messages_seed)
