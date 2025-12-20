import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import {
  Container,
  Typography,
  CssBaseline,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import FirestoreData from "./FirestoreData";
import AddAsset from "./AddAsset";
import AssetCard from "./assetCard";
import Dashboard from "./dashboard";
import VehicleDetails from "./VehicleDetails";
import AdminPage from "./AdminPage";
import ProtectedRoute from "./ProtectedRoute";
import Login from "./Login";
import SignUp from "./SignUp";
import Navbar from "./Navbar"; // Import the Navbar component

// --- THEME --- //
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: "#90caf9", // A lighter blue for dark mode
    },
    secondary: {
      main: "#f48fb1", // A lighter pink for dark mode
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
    success: {
        main: '#81c784',
    },
    error: {
        main: '#e57373',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontWeight: 300,
      color: '#ffffff',
    },
    h5: {
      fontWeight: 400,
      color: '#ffffff',
    },
  },
});

function App() {
  const [selectedAsset, setSelectedAsset] = useState(null);

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
  };

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container sx={{ py: 4 }} maxWidth="lg">
          <Navbar />
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Asset Management Dashboard
          </Typography>

          <Routes>
            <Route path="/" element={
                <>
                    <Typography variant="h5" component="h2" gutterBottom sx={{mt: 4}}>
                      Asset Fleet
                    </Typography>
                    <FirestoreData onAssetSelect={handleAssetSelect} />
                    <AssetCard asset={selectedAsset} />
                </>
            }/>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/add-asset" element={<AddAsset />} />
            <Route path="/vehicle/:id" element={<VehicleDetails />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route 
                path="/admin" 
                element={
                    <ProtectedRoute roles={['admin']}>
                        <AdminPage />
                    </ProtectedRoute>
                }
            />
          </Routes>

        </Container>
      </ThemeProvider>
    </Router>
  );
}

export default App;
