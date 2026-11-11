# Sahaay 2.0 — Household Services Booking Platform 🌿

A simple, robust, and clean **household services booking platform** connecting households with verified domestic helpers (cleaning, cooking, washing, babysitting, drivers, gardeners) and on-call emergency technicians (electricians, plumbers, carpenters).

Built with **pure Python and Flask** on the backend and modern vanilla HTML5, CSS3, and JavaScript on the frontend.

---

## 🌟 Key Features

1. **Providing Service (Helper Registration)**
   - Helper profile registration with name, contact/WhatsApp, and residential area.
   - Multi-select skills: *Cleaning House, Cooking, Washing Clothes, Washing Dishes, Babysitting, Gardener, Driver*.
   - **➕ Custom Skill Adder**: Helpers can dynamically type and add any specialized skill (e.g. *Pet Care*, *Elder Care*, *Deep Sanitization*).
   - Working hours selection: *Morning (7–11 AM), Afternoon (12–4 PM), Evening (4–8 PM), Full Day, or Flexible*.
   - Experience years and hourly/monthly wage specification.

2. **Booking for Service (Household Discovery)**
   - Real-time instant search by helper name, area/locality, or service skill.
   - Skill category quick-filter pills.
   - Detailed helper cards showing availability, timings, locality, rate, and experience.

3. **In-App Chat / Modification Dialog**
   - Direct interactive chat between household and helper.
   - Enables users and helpers to discuss specific needs, adjust timings, and modify arrangements before or after booking.

4. **⚡ 24x7 Emergency Services**
   - Rapid-response on-call specialists (Electricians, Plumbers, Carpenters) for immediate household emergencies (short circuits, pipe bursts, jammed door locks).

5. **Aesthetic Light Theme**
   - Designed exclusively in a clean **light theme**: warm cream and pure white backgrounds accented with rich, trustworthy **dark green** (`#1b4332`, `#2d6a4f`, `#40916c`).

6. **Full RESTful API Implementation**
   - Fully implements standard HTTP methods: **`GET`**, **`POST`**, **`PUT`**, and **`DELETE`**.

7. **Dual Web Access**
   - **Full-stack Flask**: Run locally or deploy to free cloud hosts (Render, Vercel, Railway).
   - **GitHub Pages**: Frontend can be served directly from GitHub Pages (`https://nayan7786-aspiringCoder.github.io/Sahaay-2.0/`) with automatic GitHub Actions workflow.

---

## 📐 Project Structure

```
Sahaay-2.0/
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions workflow for automatic GitHub Pages deployment
├── static/
│   ├── css/
│   │   └── style.css         # Light theme (cream/white + dark green), responsive styles
│   └── js/
│       └── app.js            # Frontend logic and API integration (fetch GET, POST, PUT, DELETE)
├── templates/
│   └── index.html            # Main template served by Flask
├── index.html                # Root web entrypoint for direct GitHub Pages hosting
├── app.py                    # Python Flask backend with REST API routes
├── database.py               # SQLite schema & realistic initial seed data
├── test_api.py               # Automated unit tests covering 100% of API endpoints
├── requirements.txt          # Python dependencies (Flask, Flask-Cors, gunicorn)
├── Procfile                  # Cloud deployment descriptor (Render / Railway / Heroku)
├── render.yaml               # 1-Click Render.com deployment configuration
├── vercel.json               # Vercel serverless deployment configuration
├── .gitignore                # Clean Python gitignore
├── README.md                 # Project documentation
└── EVALUATION_GUIDE.md       # Syllabus rubric mapping and viva preparation guide
```

---

## 🔌 REST API Endpoints & HTTP Methods

| HTTP Method | Route | Description | Request Body / Params | Status Code |
|:---:|:---|:---|:---|:---:|
| **GET** | `/api/helpers` | Retrieve helpers list | Query: `?search=`, `?skill=`, `?emergency=` | `200 OK` |
| **GET** | `/api/helpers/<id>` | Get single helper profile | — | `200 OK` / `404` |
| **POST** | `/api/helpers` | Register new helper | JSON: `name, phone, location, skills, timings, rate` | `201 Created` |
| **PUT** | `/api/helpers/<id>` | Update helper info / availability | JSON: `availability_status, rate, timings` | `200 OK` |
| **DELETE** | `/api/helpers/<id>` | Remove helper profile | — | `200 OK` |
| **GET** | `/api/emergency` | Retrieve emergency on-call technicians | — | `200 OK` |
| **GET** | `/api/bookings` | List all bookings | — | `200 OK` |
| **POST** | `/api/bookings` | Create household booking | JSON: `helper_id, customer_name, phone, date` | `201 Created` |
| **GET** | `/api/chat/<id>` | Retrieve chat messages for helper | — | `200 OK` |
| **POST** | `/api/chat` | Send inquiry / chat message | JSON: `helper_id, sender, text` | `201 Created` |
| **GET** | `/health` | Healthcheck endpoint | — | `200 OK` |

---

## 🚀 How to Run Locally

### 1. Prerequisites
- Python 3.10+ installed.

### 2. Clone the Repository
```bash
git clone https://github.com/nayan7786-aspiringCoder/Sahaay-2.0.git
cd Sahaay-2.0
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Flask Server
```bash
python app.py
```

Open your browser and navigate to:
```
http://127.0.0.1:5000
```

### 5. Run Automated Tests
```bash
python -m unittest test_api.py
```
*(All 9 automated unit tests will run and verify all routes and HTTP methods).*

---

## 🌐 Deploying the API to the Web

### Free Deployment on Render (Recommended)
1. Go to [render.com](https://render.com) and sign in with your GitHub account.
2. Click **New +** &rarr; **Web Service**.
3. Select your repository: `Sahaay-2.0`.
4. Configure:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
5. Click **Create Web Service**. Your live backend API will be available at `https://<your-app>.onrender.com`.

### Enabling GitHub Pages
1. Go to your repository on GitHub: `https://github.com/nayan7786-aspiringCoder/Sahaay-2.0`.
2. Go to **Settings** &rarr; **Pages**.
3. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions** (or deploy directly from the `main` branch).
4. Your website will be live at:
   `https://nayan7786-aspiringCoder.github.io/Sahaay-2.0/`

---

## 📜 Evaluation Checklist (Part a, b, c, d)
- [x] **a. Backend using Python**: Pure Python backend with `app.py` and `database.py`.
- [x] **b. Flask application with routes & HTTP methods; Deploy API**: Comprehensive REST API with GET, POST, PUT, DELETE, `Procfile`, and `render.yaml`.
- [x] **c. Integrate backend with frontend using API**: Dynamic frontend calling backend routes asynchronously via JavaScript `fetch()`.
- [x] **d. Discussion & Evaluation**: See [`EVALUATION_GUIDE.md`](EVALUATION_GUIDE.md) for full viva Q&A and architecture explanations.
