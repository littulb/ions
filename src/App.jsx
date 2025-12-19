import React, { useState } from "react";
import {
  Container,
  Typography,
  Box,
  CssBaseline,
  Button,
  Collapse,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import FirestoreData from "./FirestoreData";
import AddAsset from "./AddAsset";
import AssetCard from "./assetCard";

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
  const [showAddAsset, setShowAddAsset] = useState(false);

  const handleAssetSelect = (asset) => {
    setSelectedAsset(asset);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container sx={{ py: 4 }} maxWidth="lg">
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Asset Management Dashboard
        </Typography>

        <Box sx={{ my: 4, textAlign: 'center' }}>
          <Button 
            variant="contained" 
            onClick={() => setShowAddAsset(!showAddAsset)}
          >
            {showAddAsset ? "Hide Form" : "Add New Asset"}
          </Button>
          <Collapse in={showAddAsset} sx={{mt: 2, display: 'flex', justifyContent: 'center'}}>
            <AddAsset />
          </Collapse>
        </Box>
        
        <Typography variant="h5" component="h2" gutterBottom sx={{mt: 4}}>
          Asset Fleet
        </Typography>
        <FirestoreData onAssetSelect={handleAssetSelect} />
        
        <AssetCard asset={selectedAsset} />
      </Container>
    </ThemeProvider>
  );
}

export default App;
