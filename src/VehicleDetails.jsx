import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Paper, Typography, CircularProgress, Alert, List, ListItem, ListItemText } from '@mui/material';
import MaintenanceLog from './MaintenanceLog';

const VehicleDetails = () => {
    const { id } = useParams();
    const [vehicle, setVehicle] = useState(null);
    const [maintenanceLogs, setMaintenanceLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchVehicle = async () => {
            try {
                const docRef = doc(db, 'assets', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setVehicle({ ...docSnap.data(), id: docSnap.id });
                } else {
                    setError('No such vehicle found!');
                }
            } catch (err) {
                setError('Failed to fetch vehicle details.');
                console.error(err);
            }
            setLoading(false);
        };

        fetchVehicle();

        const unsubscribe = onSnapshot(collection(db, `assets/${id}/maintenance`), (snapshot) => {
            const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setMaintenanceLogs(logs);
        });

        return () => unsubscribe();
    }, [id]);

    if (loading) {
        return <CircularProgress />;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (!vehicle) {
        return null; 
    }

    return (
        <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h4" gutterBottom>{vehicle['asset-name']}</Typography>
            <Typography><strong>VIN:</strong> {vehicle['asset-vin']}</Typography>
            <Typography><strong>License:</strong> {vehicle['asset-license']}</Typography>
            <Typography><strong>Description:</strong> {vehicle['asset-description']}</Typography>

            <MaintenanceLog vehicleId={id} />

            <Typography variant="h5" sx={{ mt: 4 }}>Maintenance History</Typography>
            <List>
                {maintenanceLogs.map(log => (
                    <ListItem key={log.id}>
                        <ListItemText 
                            primary={log.details} 
                            secondary={`Cost: $${log.cost} - ${log.timestamp?.toDate().toLocaleDateString()}`}
                        />
                    </ListItem>
                ))}
            </List>
        </Paper>
    );
};

export default VehicleDetails;
