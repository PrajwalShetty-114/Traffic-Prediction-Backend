# 🚦 Traffic Flow Prediction (Backend API Gateway)

A lightweight Node.js / Express API Gateway that acts as the middleman between the frontend UI and a set of Python-based ML microservices. It receives frontend requests, routes them to the correct model microservice (XGBoost, LSTM, RandomForest, etc.), and returns model predictions back to the frontend with robust error handling.

[![Status](https://img.shields.io/badge/status-active-brightgreen)](#) [![Node.js](https://img.shields.io/badge/node-%3E%3D14-brightgreen)](#)

---

## ✨ Core Functionality

- **API Gateway:** Receives all requests from the frontend and serves simple data (e.g., `/api/roads`).
- **Smart Router:** The `/api/expert-predict` route reads the `model` field from the incoming JSON body and forwards the request to the configured Python ML microservice for that model.
- **Error Handling:** Captures errors from downstream services and returns meaningful HTTP status codes and error messages back to the frontend.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Server:** Express.js
- **HTTP Client:** Axios (used to forward requests to Python microservices)
- **CORS:** `cors` middleware enabled

Dependencies (from `package.json`): `express`, `cors`, `axios`, `body-parser`.

---

## 📦 API Endpoints

All endpoints are prefixed with `/api` in `server.js`.

- **GET /api/roads**
  - Purpose: Returns a small list of roads (dummy data) used by the simple dashboard to draw roads on the map.

- **POST /api/predict**
  - Purpose: Simple prediction route for the main dashboard. Currently forwards the request to the XGBoost model (placeholder for the future "hybrid" model).
  - Behavior: Forwards the request body to the configured ML API's `/predict/` endpoint and relays the JSON response.

- **POST /api/expert-predict**
  - Purpose: Expert prediction route. Reads `req.body.model` and forwards the request to the specific ML microservice mapped in `ML_API_BASE_URL`.
  - Behavior: Validates that a URL exists for the requested model, forwards the request, and returns the downstream response. Handles and normalizes downstream errors.

---

## 🔗 Microservice Architecture

This gateway is intentionally minimal: it routes requests to multiple independent Python (FastAPI) microservices. The currently configured base URLs (from `server.js`) are:

```
const ML_API_BASE_URL = {
    xgboost: 'https://xg-boost-model.onrender.com',
    randomforest: 'https://randomforestmodel-latest.onrender.com',
    lstm: 'https://lstm-model-njtw.onrender.com',
    // additional models can be added here
};
```

Each of these microservices is expected to expose a `/predict/` POST endpoint that accepts the frontend's JSON payload and responds with prediction results.

---

## 🚀 Setup & Run

1. Clone the repository or navigate to the `backend/` folder:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
# or
node server.js
```

The server listens on `http://localhost:3000` by default.

---

## 🧭 How Routing Works (quick)

1. Frontend sends a POST to `/api/expert-predict` with a JSON body that includes a `model` field (e.g., `{ model: 'xgboost', coordinates: {...} }`).
2. The gateway looks up `ML_API_BASE_URL[model]` and forwards the body to `${baseUrl}/predict/` via Axios.
3. The Python microservice responds with prediction data which the gateway relays back to the frontend.
4. If the downstream call fails, the gateway inspects `error.response` / `error.request` and returns a helpful JSON error message and HTTP code.

---

## 🛡️ Error Handling

The server differentiates between:
- `error.response`: downstream service responded with non-2xx — gateway forwards status and a normalized message.
- `error.request`: no response received — gateway returns `503 Service Unavailable`.
- other errors: returns `500 Internal Server Error`.

This provides clear signals to the frontend so the UI can show meaningful messages to users.

---

## 🔧 Extending / Customization Notes

- To add new model endpoints, update the `ML_API_BASE_URL` object in `server.js` and ensure the new service implements `/predict/`.
- Consider extracting `ML_API_BASE_URL` to environment variables for production deployments.
- Add logging and request tracing for production observability (e.g., Winston, morgan, or a tracing solution).

---

If you'd like, I can:
- Add environment variable support and a `.env.example` file.
- Add unit tests and basic integration checks for the routing behavior.

Made with ❤️ — Traffic Flow Prediction Platform
