# Gold & Silver Platform – Backend API

FastAPI-powered backend foundation for the Gold & Silver platform, designed to serve both the User App and the Admin Panel.

## 🚀 Technologies

- **Python 3.10+**
- **FastAPI**
- **Uvicorn**
- **Pydantic & Pydantic-Settings**
- **python-dotenv**

---

## 📁 Project Structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application initialization & routes
│   ├── config.py            # Environment configuration settings
│   │
│   ├── routes/              # API Route endpoints
│   │   ├── __init__.py
│   │   ├── auth.py          # /api/auth
│   │   ├── users.py         # /api/users
│   │   ├── kyc.py           # /api/kyc
│   │   ├── rates.py         # /api/rates
│   │   ├── purchases.py     # /api/purchases
│   │   ├── holdings.py      # /api/holdings
│   │   ├── withdrawals.py   # /api/withdrawals
│   │   ├── notifications.py # /api/notifications
│   │   └── admin.py         # /api/admin
│   │
│   ├── models/              # Database models (MongoDB collections)
│   │   └── __init__.py
│   │
│   ├── schemas/             # Pydantic request / response schemas
│   │   └── __init__.py
│   │
│   ├── services/            # Core business logic
│   │   └── __init__.py
│   │
│   ├── database/            # Database client & connection handlers
│   │   └── __init__.py
│   │
│   └── utils/               # Helper utilities
│       └── __init__.py
│
├── .env.example
├── .gitignore
├── requirements.txt
└── README.md
```

---

## 🛠️ Setup & Installation

### 1. Create Virtual Environment

#### Windows
```bash
python -m venv venv
venv\Scripts\activate
```

#### macOS / Linux
```bash
python3 -m venv venv
source venv/bin/activate
```

---

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

---

### 3. Environment Variables Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your environment variables:
```env
MONGODB_URI=
DATABASE_NAME=gold_silver
JWT_SECRET=
```

---

### 4. Start the Development Server

From the `backend` folder, run:

```bash
uvicorn app.main:app --reload
```

Server will start on: `http://127.0.0.1:8000`

---

## 📖 API Documentation

Once the server is running, interactive API documentation is available at:

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🔌 API Endpoints (Base Foundation)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root health check message |
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/auth` | Authentication endpoints |
| `GET` | `/api/users` | User management endpoints |
| `GET` | `/api/kyc` | KYC verification endpoints |
| `GET` | `/api/rates` | Gold & Silver live/custom rates |
| `GET` | `/api/purchases` | Metal purchase transactions |
| `GET` | `/api/holdings` | User gold & silver holdings |
| `GET` | `/api/withdrawals` | Metal withdrawal requests |
| `GET` | `/api/notifications` | Admin & user notifications |
| `GET` | `/api/admin` | Admin management & metrics |
