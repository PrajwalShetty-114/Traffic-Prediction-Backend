// ===================================================
// Traffic Flow Prediction - Express.js Server
// ===================================================

// 1. GATHERING OUR TOOLS (IMPORTS)
// ---------------------------------------------------
import express from 'express';
import cors from 'cors';
import axios from 'axios'; // Import axios for making HTTP requests

// 2. SERVER INITIALIZATION
// ---------------------------------------------------
const app = express();
const PORT = 3000;

// Define the base URL for our Python ML API servers
// We'll add more as we build them
const ML_API_BASE_URL = {
    xgboost: 'https://xg-boost-model.onrender.com', // Default FastAPI port
    randomforest: 'https://randomforestmodel-latest.onrender.com',
    // Add other model URLs here later, e.g.:
    lstm: 'https://lstm-model-njtw.onrender.com',
    // Temporary fallback: if 'hybrid' is requested but not available, route to xgboost for now
    // hybrid: 'https://xg-boost-model.onrender.com',
    catboost: 'https://catboost-model.onrender.com'
};

// 3. SETTING THE RULES (MIDDLEWARE)
// ---------------------------------------------------
app.use(cors());
app.use(express.json()); // Crucial for reading req.body

// 4. DEFINING THE SERVER'S JOBS (API ROUTES)
// ---------------------------------------------------

/**
 * ROUTE #1: Get All Roads (for the simple dashboard)
 * Method: GET
 * Path: /api/roads
 */
app.get('/api/roads', (req, res) => {
    // Keeping dummy data for roads for now
    const roadsData = [
        { "id": "MG_ROAD_01", "name": "MG Road", "path": "..." },
        { "id": "BRIGADE_ROAD_02", "name": "Brigade Road", "path": "..." },
        { "id": "HOSUR_ROAD_03", "name": "Hosur Road", "path": "..." }
    ];
    res.status(200).json(roadsData);
});

/**
 * ROUTE #2: Simple Prediction (for the simple dashboard)
 * Method: POST
 * Path: /api/predict
 * Purpose: Always calls the best model (Hybrid, eventually)
 */
app.post('/api/predict', async (req, res) => {
    console.log('Received request on SIMPLE route (/api/predict)');
    // --- THIS WILL BE UPDATED TO CALL THE HYBRID MODEL ---
    // For now, let's call the XGBoost API as a placeholder
    const modelToCall = 'xgboost'; // Change to 'hybrid' later
    const pythonApiUrl = `${ML_API_BASE_URL[modelToCall]}/predict/`;

    try {
        console.log(`Forwarding simple request to ${pythonApiUrl}`);
        // Send the exact data received from the frontend to the Python API
        const pythonResponse = await axios.post(pythonApiUrl, req.body);

        // Send the response from the Python API back to the frontend
        res.status(200).json(pythonResponse.data);

    } catch (error) {
        console.error('Error calling Python API from simple route:', error.message);
        if (error.response) console.error('Downstream response data:', error.response.data);
        // Determine the error type for a better response
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error("Python API Error Data:", error.response.data);
            console.error("Python API Error Status:", error.response.status);
            res.status(error.response.status).json({
                error: "Prediction service failed",
                // Forward the whole downstream payload where possible for easier debugging
                detail: error.response.data || error.response.data.detail || 'Unknown error from ML service'
            });
        } else if (error.request) {
            // The request was made but no response was received
            console.error("No response received from Python API:", error.request);
            res.status(503).json({ error: "Prediction service unavailable", detail: "No response from ML service" });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Axios request setup error:', error.message);
            res.status(500).json({ error: "Internal Server Error", detail: error.message });
        }
    }
});


/**
 * --- UPDATED EXPERT ROUTE ---
 * ROUTE #3: Expert Prediction (for the expert dashboard)
 * Method: POST
 * Path: /api/expert-predict
 * Purpose: Calls the specific Python ML API based on the model chosen by the user.
 */
app.post('/api/expert-predict', async (req, res) => {
    console.log('Received request on EXPERT route (/api/expert-predict)');
    console.log('Frontend sent this data:', req.body);

    const requestedModel = req.body.model;

    // --- 1. Find the correct Python API URL ---
    const baseUrl = ML_API_BASE_URL[requestedModel];
    if (!baseUrl) {
        console.error(`No API URL configured for model: ${requestedModel}`);
        return res.status(400).json({ error: `Model '${requestedModel}' is not supported.` });
    }
    // All our Python APIs will use the /predict/ endpoint convention
    const pythonApiUrl = `${baseUrl}/predict/`;

    try {
        // --- 2. Call the specific Python API ---
        console.log(`Forwarding expert request for model ${requestedModel} to ${pythonApiUrl}`);
        // Send the exact data received from the frontend to the Python API
        const pythonResponse = await axios.post(pythonApiUrl, req.body);

        // --- 3. Send the Python API's response back to the frontend ---
        console.log('Received response from Python API:', pythonResponse.data);
        res.status(200).json(pythonResponse.data);

    } catch (error) {
        // --- 4. Handle Errors ---
        console.error(`Error calling Python API for model ${requestedModel}:`, error.message);
        if (error.response) {
            console.error("Python API Error Data:", error.response.data);
            console.error("Python API Error Status:", error.response.status);
            res.status(error.response.status).json({
                error: `Prediction service for model ${requestedModel} failed`,
                detail: error.response.data || error.response.data.detail || 'Unknown error from ML service'
            });
        } else if (error.request) {
            console.error("No response received from Python API:", error.request);
            res.status(503).json({ error: `Prediction service for model ${requestedModel} unavailable`, detail: "No response from ML service" });
        } else {
            console.error('Axios request setup error:', error.message);
            res.status(500).json({ error: "Internal Server Error", detail: error.message });
        }
    }
});


/**
 * ROUTE: Health check for configured ML services
 * Method: GET
 * Path: /api/health
 * Purpose: Quickly verify reachability of configured ML microservices.
 */
app.get('/api/health', async (req, res) => {
    const results = {};
    const keys = Object.keys(ML_API_BASE_URL);
    await Promise.all(keys.map(async (k) => {
        const url = ML_API_BASE_URL[k];
        try {
            // A simple GET to the base URL (may return HTML or JSON depending on service)
            const r = await axios.get(url, { timeout: 3000 });
            results[k] = { ok: true, status: r.status };
        } catch (err) {
            results[k] = { ok: false, message: err.message, status: err.response ? err.response.status : null };
        }
    }));
    res.json({ services: results });
});


// 5. OPENING FOR BUSINESS (START THE SERVER)
// ---------------------------------------------------
app.listen(PORT, () => {
    console.log(`✅ Backend server is running and listening on http://localhost:${PORT}`);
});