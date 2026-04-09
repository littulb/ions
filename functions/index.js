const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { onRequest } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
admin.initializeApp();

exports.setUserRole = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const { userId } = context.params;
        const { role } = change.after.data();

        try {
            await admin.auth().setCustomUserClaims(userId, { role });
            console.log(`Custom claim set for user ${userId}: ${role}`);
        } catch (error) {
            console.error('Error setting custom claim:', error);
        }
    });


// System prompt to lock Gemma into "Controller Mode"
const SYSTEM_PROMPT = `You are the IONIS Fleet AI. 
Analyze the user command and return ONLY a JSON object: {"arg": "on"} to lock/stop or {"arg": "off"} to unlock/start. 
If the intent is unclear, return {"arg": "unknown"}.`;

exports.ionisAICommand = onRequest({ secrets: ["GEMINI_API_KEY"] }, async (req, res) => {
    // 1. Handshake Security (Your custom Shortcut password)
    const secret = req.headers['x-ionis-key'];
    if (secret !== '1234') return res.status(401).send("Unauthorized");

    const { prompt } = req.body;
    if (!prompt) return res.status(400).send("Missing prompt");

    try {
        // 2. Initialize Gemini with your SECURE key
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 3. Inference: Let the AI decide
        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser Command: ${prompt}`);
        const aiResponse = JSON.parse(result.response.text());
        const action = aiResponse.arg;

        if (action === "unknown") return res.status(200).send("AI uncertain. No action taken.");

        // 4. Dispatch to Boron (LTE Cat M1)
        await axios.post(
            `https://api.particle.io/v1/devices/e00fce68edbf13517f31b1be/ignitionSwitch`,
            `arg=${action}`,
            {
                headers: {
                    'Authorization': `Bearer b41c40940d370527fc69d053c6138afbed9094c2`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        res.status(200).send(`IONIS AI executed: ${action.toUpperCase()}`);
    } catch (error) {
        console.error("Critical AI Failure:", error);
        res.status(500).send("Command processing error.");
    }
});