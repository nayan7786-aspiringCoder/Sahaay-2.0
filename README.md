# Sahaay 2.0 — Household Services Booking Platform 🌿

A simple household services booking platform connecting households with domestic helpers (cooks, cleaners, babysitters, drivers, gardeners) and emergency technicians (electricians, plumbers).

---

## 📌 Three Core Features

1. **Backend using Python** (`app.py`):
   - Pure Python backend using SQLite database.
   - Starts completely clean with zero dummy/fake profiles.

2. **Flask Application with Routes & HTTP Methods**:
   - `GET /` — Serves the frontend web page.
   - `GET /api/helpers` — Fetch registered helpers with search and skill filters.
   - `POST /api/helpers` — Register a new helper (Providing Service).
   - `PUT /api/helpers/<id>` — Update helper availability status.
   - `DELETE /api/helpers/<id>` — Remove helper profile.
   - `GET /api/emergency` — Fetch emergency on-call technicians.
   - `POST /api/bookings` & `GET /api/bookings` — Create and view bookings.
   - `POST /api/chat` & `GET /api/chat/<id>` — Direct chat between user and helper.

3. **Frontend Integrated with Backend via API** (`index.html`, `static/script.js`, `static/style.css`):
   - Light theme (cream and dark green palette).
   - Asynchronous `fetch()` calls for real-time registration, search, booking, and in-app chat.
   - Accessible locally via Flask and directly online through GitHub Pages.

---

## 📁 Project Structure

```
Sahaay-2.0/
├── app.py              # Backend: Python Flask application & REST API routes
├── requirements.txt    # Minimal dependency (Flask)
├── index.html          # Frontend: HTML interface
├── static/
│   ├── style.css       # Styling: Light theme (cream & dark green)
│   └── script.js       # Integration: JavaScript API fetch calls
└── README.md           # Instructions
```

---

## 🚀 How to Run

1. **Install Flask**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Application**:
   ```bash
   python app.py
   ```

3. **Open in Browser**:
   ```
   http://127.0.0.1:5000
   ```

---

## 🌐 Live Website (GitHub Pages)

Access the live web page directly on GitHub:
👉 **https://nayan7786-aspiringCoder.github.io/Sahaay-2.0/**
