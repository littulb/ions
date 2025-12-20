import React, { useState } from "react";
import { db, storage } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  Button,
  TextField,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Paper,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { styled } from "@mui/material/styles";

const Input = styled("input")({
  display: "none",
});

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    backgroundColor: '#3a4a5b',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: '#4a5a6b',
    },
    '&.Mui-focused': {
      backgroundColor: '#4a5a6b',
    },
  },
  '& .MuiOutlinedInput-notchedOutline': {
    border: 'none',
  },
  '& .MuiInputBase-input': {
    color: 'white',
  },
  '& .MuiInputBase-input::placeholder': {
    color: '#A9A9A9',
  },
   '& .MuiInputLabel-root': {
    display: 'none', // Hide the default label
  },
}));

const buttonSx = {
  backgroundColor: '#2563eb',
  '&:hover': {
    backgroundColor: '#1d4ed8',
  },
  borderRadius: '4px',
  py: 1.5,
  textTransform: 'none',
  fontSize: '1rem'
};

const AddAsset = () => {
  const [assetId, setAssetId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetLicense, setAssetLicense] = useState("");
  const [assetVin, setAssetVin] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetLocation, setAssetLocation] = useState("");
  const [killSwitch, setKillSwitch] = useState(false);
  const [assetImage, setAssetImage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setAssetImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let imageUrl = "";
      if (assetImage) {
        const imageRef = ref(storage, `assets/${Date.now()}_${assetImage.name}`);
        await uploadBytes(imageRef, assetImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "assets"), {
        "asset-id": assetId,
        "asset-name": assetName,
        "asset-license": assetLicense,
        "asset-vin": assetVin,
        "asset-description": assetDescription,
        assetLocation: assetLocation.split(',').map(s => s.trim()),
        killSwitch: killSwitch,
        assetImage: imageUrl,
        createdAt: serverTimestamp(),
      });

      setAssetId("");
      setAssetName("");
      setAssetLicense("");
      setAssetVin("");
      setAssetDescription("");
      setAssetLocation("");
      setKillSwitch(false);
      setAssetImage(null);
      setSuccess(true);
    } catch (error) {
      setError("Error adding asset. Please try again.");
      console.error("Error adding asset: ", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ p: 4, mt: 4, backgroundColor: '#2b394a', borderRadius: '8px', width: '100%', maxWidth: '800px' }}>
      <Typography variant="h5" component="h2" gutterBottom align="center" sx={{color: 'white'}}>
        Add New Asset
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="body1" sx={{ color: '#A9A9A9', mb: 1 }}>Asset ID</Typography>
            <StyledTextField
              placeholder="Asset ID"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
          <Typography variant="body1" sx={{ color: '#A9A9A9', mb: 1 }}>Asset Name</Typography>
            <StyledTextField
              placeholder="Asset Name"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
           <Typography variant="body1" sx={{ color: '#A9A9A9', mb: 1 }}>Asset License</Typography>
            <StyledTextField
              placeholder="Asset License"
              value={assetLicense}
              onChange={(e) => setAssetLicense(e.target.value)}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
             <Typography variant="body1" sx={{ color: '#A9A9A9', mb: 1 }}>Asset VIN</Typography>
            <StyledTextField
              placeholder="Asset VIN"
              value={assetVin}
              onChange={(e) => setAssetVin(e.target.value)}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
             <Typography variant="body1" sx={{ color: '#A9A9A9', mb: 1 }}>Asset Description</Typography>
            <StyledTextField
              placeholder="Asset Description"
              value={assetDescription}
              onChange={(e) => setAssetDescription(e.target.value)}
              fullWidth
              multiline
              rows={4}
              required
            />
          </Grid>
          <Grid item xs={12}>
             <Typography variant="body1" sx={{ color: '#A9A9A9', mb: 1 }}>Asset Location</Typography>
            <StyledTextField
              placeholder="Asset Location (comma-separated)"
              value={assetLocation}
              onChange={(e) => setAssetLocation(e.target.value)}
              fullWidth
            />
          </Grid>
           <Grid item xs={12}>
                <FormControlLabel
                    control={<Checkbox checked={killSwitch} onChange={(e) => setKillSwitch(e.target.checked)} name="killSwitch" />}
                    label="Kill Switch Activated"
                />
           </Grid>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <label htmlFor="contained-button-file" style={{ display: 'block', width: '100%' }}>
                  <Input
                    accept="image/*"
                    id="contained-button-file"
                    type="file"
                    onChange={handleImageChange}
                  />
                  <Button fullWidth variant="contained" component="span" sx={buttonSx}>
                    Upload Image
                  </Button>
                </label>
                {assetImage && (
                    <Typography sx={{ mt: 1, color: 'white', textAlign: 'center' }}>
                        Selected: {assetImage.name}
                    </Typography>
                )}

              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
                sx={buttonSx}
              >
                {loading ? <CircularProgress size={24} sx={{color: 'white'}}/> : 'Add Asset'}
              </Button>
            </Box>
          </Grid>
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}
          {success && (
            <Grid item xs={12}>
              <Alert severity="success">Asset added successfully!</Alert>
            </Grid>
          )}
        </Grid>
      </form>
    </Paper>
  );
};

export default AddAsset;
