const functions = require('firebase-functions');
const admin = require('firebase-admin');
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


exports.ionisCommand = functions.https.onRequest(async (req, res) => {
    const secret = req.headers['x-ionis-key'];
    if (secret !== '1234') {
        return res.status(401).send("Unauthorized Access to IONIS");
    }

    // Capture 'arg' directly from the Shortcut JSON body
    const { arg } = req.body;

    if (!arg) {
        return res.status(400).send("Error: No argument provided in request body.");
    }

    try {
        const response = await axios.post(
            `https://api.particle.io/v1/devices/e00fce68edbf13517f31b1be/ignitionSwitch`,
            `arg=${arg}`,
            {
                headers: {
                    'Authorization': `Bearer b41c40940d370527fc69d053c6138afbed9094c2`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        res.status(200).send(`IONIS Success: Vehicle ${arg === 'on' ? 'Immobilized' : 'Restored'}`);
    } catch (error) {
        console.error("IONIS API Error:", error.response ? error.response.data : error.message);
        res.status(500).send("Failed to reach Boron via Particle Cloud");
    }
});