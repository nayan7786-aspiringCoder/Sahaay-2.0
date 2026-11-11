# Sahaay 2.0 — Mini Project Discussion & Evaluation Guide 🎓

This guide aligns directly with the evaluation rubric for **Mini Project Evaluation (Part d)**.

---

## 📋 Rubric Compliance Mapping

| Rubric Requirement | Implementation Details in Sahaay 2.0 | Reference File |
|:---|:---|:---|
| **a. Implement backend using python for Mini Project** | Backend developed completely in Python 3. SQLite database management using standard library `sqlite3`. | [`app.py`](app.py), [`database.py`](database.py) |
| **b. Create a Flask application with routes and HTTP methods; Deploy API** | Flask application with RESTful endpoints implementing all standard HTTP methods: `GET`, `POST`, `PUT`, `DELETE`. Deployment configurations for Render (`render.yaml`, `Procfile`) and Vercel (`vercel.json`). | [`app.py`](app.py), [`Procfile`](Procfile), [`render.yaml`](render.yaml) |
| **c. Integrate your backend with frontend using API** | Frontend UI communicates asynchronously with the Flask backend routes using the native JavaScript `fetch()` API for CRUD operations, live search, and real-time chat. | [`static/js/app.js`](static/js/app.js), [`templates/index.html`](templates/index.html) |
| **d. Mini Project Discussion and Evaluation** | Comprehensive architecture documentation, test coverage, and viva preparation questions with answers. | [`README.md`](README.md), [`test_api.py`](test_api.py), This Document |

---

## 🏛️ System Architecture Flow

```
┌────────────────────────────────────────────────────────┐
│              FRONTEND (Browser / Client)                │
│  HTML5 + Light Theme CSS3 (Cream/White + Dark Green)   │
│  Interactive UI: Provide Service, Find Helpers, Chat   │
└───────────────────────────┬────────────────────────────┘
                            │
               HTTP Requests (JSON via fetch)
               GET, POST, PUT, DELETE
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             BACKEND (Python Flask Application)          │
│  • Routing & Controller logic in app.py                │
│  • CORS handling & JSON serialization                  │
│  • Status codes (200 OK, 201 Created, 400, 404)        │
└───────────────────────────┬────────────────────────────┘
                            │
                     SQL Queries
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│            DATABASE (SQLite3 - sahaay.db)              │
│  • helpers table (skills, timings, location, rates)    │
│  • bookings table (customers, schedules, status)       │
│  • messages table (in-app chat threads)                │
└────────────────────────────────────────────────────────┘
```

---

## 🎯 Viva Q&A — Commonly Asked Evaluation Questions

### Q1: Why did you choose Flask for this backend rather than Django?
> **Answer:** Flask is a micro-framework for Python that gives fine-grained control over RESTful routing and HTTP methods without enforcing complex boilerplate or heavyweight ORMs. It is lightweight, fast to execute, and ideal for building clean REST APIs and decoupled architectures.

### Q2: What HTTP methods are used in your application and where?
> **Answer:**
> - **`GET`**: Used to retrieve lists of helpers (`/api/helpers`), single helper details (`/api/helpers/<id>`), emergency providers (`/api/emergency`), bookings (`/api/bookings`), and chat history (`/api/chat/<id>`).
> - **`POST`**: Used to create new resources: registering a new helper profile (`POST /api/helpers`), creating a new booking (`POST /api/bookings`), and sending an inquiry message (`POST /api/chat`).
> - **`PUT`**: Used to modify existing resource state, such as updating helper availability or hourly rates (`PUT /api/helpers/<id>`).
> - **`DELETE`**: Used to delete an existing helper profile from the platform (`DELETE /api/helpers/<id>`).

### Q3: How is the frontend integrated with the backend?
> **Answer:** The frontend does not reload the page upon actions. Instead, it uses JavaScript `async/await` and the `fetch()` API. When an action occurs (such as registering a helper or sending a message):
> 1. JavaScript gathers the form values into a JSON object.
> 2. `fetch()` sends an asynchronous HTTP request (e.g., `POST` with `Content-Type: application/json`).
> 3. Flask processes the request, commits changes to SQLite, and returns a JSON response with the appropriate HTTP status code (`201 Created`).
> 4. JavaScript receives the response, shows an instant toast notification, and updates the DOM dynamically.

### Q4: What is CORS and how is it addressed in your project?
> **Answer:** CORS (Cross-Origin Resource Sharing) is a security mechanism enforced by browsers that restricts web pages from making requests to a different domain/origin than the one that served the page. Since our website can be hosted on GitHub Pages (`https://<user>.github.io`) while the API runs on a cloud service (e.g. Render or localhost), we configured CORS headers in `app.py` allowing cross-origin requests (`Access-Control-Allow-Origin: *`).

### Q5: How is data persisted? What is your database structure?
> **Answer:** We use Python's built-in `sqlite3` engine with three normalized tables:
> 1. `helpers`: Stores helper profiles, contact, residence locality, JSON-encoded skills array, timings, hourly rate, and an `is_emergency` flag.
> 2. `bookings`: Stores customer name, phone, address, selected date/time, and a foreign key referencing `helper_id`.
> 3. `messages`: Stores chat communications between household and helper linked by `helper_id`.

### Q6: How does the custom skill addition feature work?
> **Answer:** In the registration form, apart from standard checkboxes (cleaning, cooking, babysitting, etc.), helpers can input custom skills. A client-side script validates the entry, creates a dynamic checkbox in the DOM, and packages it into the `skills` array before sending it to `POST /api/helpers`.

### Q7: How did you test your application?
> **Answer:** We implemented automated unit tests in `test_api.py` using Python's `unittest` framework and Flask's `test_client()`. It tests 100% of the routes (GET, POST, PUT, DELETE, chat, emergency, bookings) ensuring reliable status codes and payload structure without manual effort.
