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
    // 1. Simple Security: Check for a secret key sent from your Shortcut
    const secret = req.headers['x-ionis-key'];
    if (secret !== '1234') {
        return res.status(401).send("Unauthorized Access to IONIS");
    }

    const { deviceId, action } = req.body; // 'action' will be "on" or "off"

    try {
        const response = await axios.post(
            `https://api.particle.io/v1/devices/e00fce68edbf13517f31b1be/ignitionSwitch`,
            `arg=${action}`, // Particle prefers form-encoded for this
            {
                headers: {
                    'Authorization': `Bearer b41c40940d370527fc69d053c6138afbed9094c2`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        res.status(200).send(`IONIS Success: Vehicle ${action === 'on' ? 'Immobilized' : 'Restored'}`);
    } catch (error) {
        console.error("IONIS API Error:", error.response ? error.response.data : error.message);
        res.status(500).send("Failed to reach Boron via Particle Cloud");
    }
});