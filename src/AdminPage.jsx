import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import useAuth from './useAuth';
import { Paper, Typography, CircularProgress, Alert, List, ListItem, ListItemText, Select, MenuItem, Button, Box } from '@mui/material';

const AdminPage = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersCollection = collection(db, 'users');
                const userSnapshot = await getDocs(usersCollection);
                const userList = userSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                setUsers(userList);
            } catch (err) {
                setError('Failed to fetch users.');
                console.error(err);
            }
            setLoading(false);
        };

        fetchUsers();
    }, []);

    const assignAssetsToLittub = async () => {
        setLoading(true);
        try {
            // 1. Get UID directly from Auth session to bypass missing Firestore records
            if (!user || user.email !== 'littub@gmail.com') {
                setError("You must be logged in as littub@gmail.com to run this migration.");
                setLoading(false);
                return;
            }
            
            const littubId = user.uid;
            
            // 2. Fetch all assets
            const assetsRef = collection(db, 'assets');
            const assetsSnap = await getDocs(assetsRef);
            
            // 3. Update them all in a batch
            const batch = writeBatch(db);
            let updateCount = 0;
            
            assetsSnap.forEach((assetDoc) => {
                const data = assetDoc.data();
                if (!data.userId || data.userId !== littubId) {
                    batch.update(assetDoc.ref, { userId: littubId });
                    updateCount++;
                }
            });
            
            if (updateCount > 0) {
                await batch.commit();
                alert(`Successfully assigned ${updateCount} assets to littub@gmail.com`);
            } else {
                alert(`All assets are already correctly assigned!`);
            }
        } catch (err) {
            console.error("Error migrating assets:", err);
            setError("Failed to migrate asserts to littub");
        }
        setLoading(false);
    };

    const handleRoleChange = async (userId, role) => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { role });
            setUsers(users.map(user => user.id === userId ? { ...user, role } : user));
        } catch (error) {
            console.error('Error updating user role: ', error);
        }
    };

    if (loading) {
        return <CircularProgress />;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Paper sx={{ p: 3, mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4">User Management</Typography>
                <Button variant="contained" color="warning" onClick={assignAssetsToLittub}>
                    Transfer Core Assets to Littub
                </Button>
            </Box>
            <List>
                {users.map(user => (
                    <ListItem key={user.id}>
                        <ListItemText primary={user.email} secondary={`Role: ${user.role || 'N/A'}`} />
                        <Select
                            value={user.role || 'user'}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="editor">Editor</MenuItem>
                        </Select>
                    </ListItem>
                ))}
            </List>
        </Paper>
    );
};

export default AdminPage;
