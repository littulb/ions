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
  Box,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import FirestoreData from "./FirestoreData";
import AddAsset from "./AddAsset";
import AssetCardModal from "./AssetCardModal";
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAsset(null);
  };

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{
          position: 'relative',
          minHeight: '100vh',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url('https://firebasestorage.googleapis.com/v0/b/ignitionswitch-3d71b.firebasestorage.app/o/assets%2Fe6edcbbc-9091-4302-ad88-2165a5e3287f?alt=media&token=82bf9090-61fc-4222-b31c-e6fcef5082b5')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.5,
            zIndex: -1,
          }
        }}>
          <Container sx={{ py: 4 }} maxWidth="lg">
            <Navbar />
            <Typography variant="h3" component="h1" gutterBottom align="center"></Typography>

            <Routes>
              <Route path="/" element={
                  <>
                      <Typography variant="h5" component="h2" gutterBottom sx={{mt: 4}}>
                        Asset Fleet
                      </Typography>
                      <FirestoreData onAssetSelect={handleAssetSelect} />
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

            <AssetCardModal
              asset={selectedAsset}
              open={isModalOpen}
              handleClose={handleCloseModal}
            />

          </Container>
        </Box>
      </ThemeProvider>
    </Router>
  );
}

export default App;
