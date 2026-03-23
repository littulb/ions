import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Paper, Typography, CircularProgress, Alert, List, ListItem, ListItemText, Select, MenuItem } from '@mui/material';

const AdminPage = () => {
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
            <Typography variant="h4" gutterBottom>User Management</Typography>
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
