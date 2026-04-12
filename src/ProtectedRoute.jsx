import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from './useAuth';

const ProtectedRoute = ({ children, roles }) => {
    const { user, role, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>; // Or a spinner
    }

    if (!user) {
        return <Navigate to="/" />;
    }

    if (roles && !roles.includes(role)) {
        // Fallback root permission to bypass custom claims out of sync
        if (user.email === 'littub@gmail.com') {
            return children;
        }
        return <Navigate to="/" />;
    }

    return children;
};

export default ProtectedRoute;
