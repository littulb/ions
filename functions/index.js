const functions = require('firebase-functions');
const admin = require('firebase-admin');
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
