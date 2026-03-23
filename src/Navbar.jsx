
import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import useAuth from "./useAuth";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

const Navbar = () => {
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign-out:", error);
    }
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-logo">
        404*IONIS
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/add-asset">Add Asset</Link>
            <button onClick={handleLogout} className="navbar-logout-button">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
