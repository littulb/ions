import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import {
  TextField,
  Button,
  Container,
  Typography,
  Box,
  CircularProgress,
  Switch,
  FormControlLabel,
  Alert,
} from "@mui/material";
import { v4 as uuidv4 } from "uuid";

const AddAsset = () => {
  const [assetId, setAssetId] = useState("");
  const [assetName, setAssetName] = useState("");
  const [assetLicense, setAssetLicense] = useState("");
  const [assetVin, setAssetVin] = useState("");
  const [assetDescription, setAssetDescription] = useState("");
  const [assetLocation, setAssetLocation] = useState("");
  const [killSwitchActivated, setKillSwitchActivated] = useState(false);
  const [assetImage, setAssetImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setAssetImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let imageUrl = "";
      if (assetImage) {
        const imageRef = ref(storage, `assets/${uuidv4()}`);
        await uploadBytes(imageRef, assetImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      await addDoc(collection(db, "assets"), {
        "asset-id": assetId,
        "asset-name": assetName,
        "asset-license": assetLicense,
        "asset-vin": assetVin,
        "asset-description": assetDescription,
        //  "asset-location": assetLocation
        //   ? assetLocation.split(",").map((s) => s.trim())
        //   : [],
        // "kill-switch-activated": killSwitchActivated,
        "asset-image": imageUrl,
        createdAt: serverTimestamp(),
      });

      navigate("/");
    } catch (error) {
      console.error("Error adding document: ", error);
      setError("Failed to add asset. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Add New Asset
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Asset ID"
              variant="outlined"
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
            />
            <TextField
              label="Asset Name"
              variant="outlined"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              required
            />
            <TextField
              label="Asset License"
              variant="outlined"
              value={assetLicense}
              onChange={(e) => setAssetLicense(e.target.value)}
            />
            <TextField
              label="Asset VIN"
              variant="outlined"
              value={assetVin}
              onChange={(e) => setAssetVin(e.target.value)}
            />
            <TextField
              label="Asset Description"
              variant="outlined"
              multiline
              rows={4}
              value={assetDescription}
              onChange={(e) => setAssetDescription(e.target.value)}
            />
            {/* <TextField
              label="Asset Location (comma-separated)"
              variant="outlined"
              value={assetLocation}
              onChange={(e) => setAssetLocation(e.target.value)}
            /> */}
            {/* <FormControlLabel
              control={
                <Switch
                  checked={killSwitchActivated}
                  onChange={(e) => setKillSwitchActivated(e.target.checked)}
                  name="kill-switch-activated"
                  color="primary"
                />
              }
              label="Kill Switch Activated"
            /> */}
            <Button variant="contained" component="label">
              Upload Asset Image
              <input type="file" hidden onChange={handleImageChange} />
            </Button>
            {assetImage && (
              <Typography variant="body2">{assetImage.name}</Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Add Asset"
              )}
            </Button>
          </Box>
        </form>
      </Box>
    </Container>
  );
};

export default AddAsset;
