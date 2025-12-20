import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Button, TextField, Paper, Typography } from '@mui/material';

const MaintenanceLog = ({ vehicleId }) => {
    const [details, setDetails] = useState('');
    const [cost, setCost] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!details || !cost) return;

        try {
            await addDoc(collection(db, `assets/${vehicleId}/maintenance`), {
                details,
                cost: parseFloat(cost),
                timestamp: serverTimestamp(),
            });
            setDetails('');
            setCost('');
        } catch (error) {
            console.error('Error adding maintenance log: ', error);
        }
    };

    return (
        <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6">Add Maintenance Log</Typography>
            <form onSubmit={handleSubmit}>
                <TextField
                    label="Details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                />
                <TextField
                    label="Cost"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    type="number"
                    fullWidth
                    margin="normal"
                    required
                />
                <Button type="submit" variant="contained">Add Log</Button>
            </form>
        </Paper>
    );
};

export default MaintenanceLog;
