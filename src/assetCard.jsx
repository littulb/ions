import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link as RouterLink } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Box,
  Paper,
  Link,
  List,
  ListItem,
  ListItemText,
  Chip
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

// --- CONFIGURATION ---
const ACCESS_TOKEN = "b41c40940d370527fc69d053c6138afbed9094c2";
const FUNCTION_NAME = "ignitionSwitch";
const LOCATION_FUNCTION_NAME = "getLocation";
const VARIABLE_NAME = "ignitionStatus";
const EVENT_NAME = "gps-telemetry"; 
const MAX_RETRIES = 3;
const DELAY_MS = 1000;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// --- HOOK --- //
const useParticleSwitch = (deviceId) => {
    const [isReady, setIsReady] = useState(false);
    const [status, setStatus] = useState("off");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("Initializing...");
    const [deviceName, setDeviceName] = useState("Loading...");
    const [gpsLocation, setGpsLocation] = useState(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    
    const { DEVICE_API_URL, STATUS_API_URL, FUNCTION_API_URL } = useMemo(() => {
        const FUNCTION_API_URL = `https://api.particle.io/v1/devices/${deviceId}/${FUNCTION_NAME}`;
        const STATUS_API_URL = `https://api.particle.io/v1/devices/${deviceId}/${VARIABLE_NAME}`;
        const DEVICE_API_URL = `https://api.particle.io/v1/devices/${deviceId}`;
        return { DEVICE_API_URL, STATUS_API_URL, FUNCTION_API_URL };
    }, [deviceId]);

    const fetchInitialData = useCallback(async () => {
        setMessage("Connecting to Particle Cloud...");
        const authHeaders = { Authorization: `Bearer ${ACCESS_TOKEN}` };

        try {
            const nameResponse = await fetch(DEVICE_API_URL, { method: 'GET', headers: authHeaders });
            const nameData = await nameResponse.json().catch(() => ({}));

            if (nameResponse.ok && nameData.name) {
                setDeviceName(nameData.name);
            } else {
                setDeviceName("Name Unavailable");
            }

            const statusResponse = await fetch(STATUS_API_URL, { method: 'GET', headers: authHeaders });
            const statusData = await statusResponse.json().catch(() => ({}));

            if (statusResponse.ok && statusData.result !== undefined) {
                const currentStatus = [1, "on", "ON", true].includes(statusData.result) ? "on" : "off";
                setStatus(currentStatus);
                setMessage(`Ready.`);
            } else {
                setStatus("off");
            }
        } catch (err) {
            setMessage(`Network error: ${err.message}`);
            setStatus("off");
        } finally {
            setIsReady(true);
        }
    }, [DEVICE_API_URL, STATUS_API_URL]);

    useEffect(() => {
        if (!ACCESS_TOKEN || !deviceId) {
            setIsReady(false);
        } else {
            fetchInitialData();
        }
    }, [fetchInitialData, deviceId]);

    const executeCall = useCallback(async (command, attempt = 0) => {
        if (!isReady) return false;
        const nextStatus = command.toLowerCase() === "on" ? "on" : "off";
        try {
            const payload = new URLSearchParams({ arg: nextStatus }).toString();
            const response = await fetch(FUNCTION_API_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: payload,
            });
            if (response.ok) {
                setStatus(nextStatus);
                console.log('here')
                
                return true;
            }
            return false;
        } catch (err) {
            if (attempt < MAX_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
                return executeCall(command, attempt + 1);
            }
            return false;
        }
    }, [isReady, FUNCTION_API_URL]);

    const handleGetLocation = useCallback(async () => {
        if (!isReady || isGettingLocation) return;

        setIsGettingLocation(true);
        setMessage("Requesting spatial telemetry from device...");

        let eventSource;
        let timeoutId;

        const cleanup = () => {
            if (eventSource) {
                eventSource.close();
            }
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            setIsGettingLocation(false);
        };

        try {


          setMessage(`Device acknowledged. Listening for stream: ${EVENT_NAME}`);

            const privateEventSourceUrl = `https://api.particle.io/v1/devices/${deviceId}/events/${EVENT_NAME}?access_token=${ACCESS_TOKEN}`;
            eventSource = new EventSource(privateEventSourceUrl);
            
            timeoutId = setTimeout(() => {
                setMessage("GPS signal timeout. Check antenna or move to an open area.");
                cleanup();
            }, 35000);

            eventSource.addEventListener(EVENT_NAME, (messageEvent) => {

                const eventData = JSON.parse(messageEvent.data);
                const rawTelemetry = eventData.data;
                const parts = rawTelemetry.split(',');
                if (parts.length === 2) {
                    const lat = parseFloat(parts[0]);
                    const lon = parseFloat(parts[1]);

                    if (!isNaN(lat) && !isNaN(lon)) {
                        setGpsLocation({
                            lat: lat,
                            lng: lon,
                            fix: true
                        });
                        setMessage(`Location synced: ${lat}, ${lon}`);
                        cleanup();
                    } else {
                        setMessage(`Received invalid GPS data: ${rawTelemetry}`);
                    }
                } else {
                     setMessage(`Awaiting location data...`);
                }
            });




            const callFunctionApiUrl = `https://api.particle.io/v1/devices/${deviceId}/${LOCATION_FUNCTION_NAME}`;
            const callFunctionResponse = await fetch(callFunctionApiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ACCESS_TOKEN}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({ arg: '' }).toString()
            });

            if (!callFunctionResponse.ok) {
                const errorData = await callFunctionResponse.json().catch(() => ({}));
                throw new Error(errorData.error_description || 'Failed to trigger GPS function.');
            }
            
            

            eventSource.onerror = () => {
                setMessage(`GPS Stream Error. Retrying might be needed.`);
                cleanup();
            };

        } catch (err) {
            setMessage(`GPS Error: ${err.message || err}`);
            cleanup();
        }
    }, [isReady, isGettingLocation, deviceId]);

    const handleToggle = async () => {
        if (!isReady || isLoading) return;
        setIsLoading(true);
        const nextCommand = status === "on" ? "off" : "on";
        await executeCall(nextCommand);
        setIsLoading(false);
    };

    return { status, isLoading, message, isReady, handleToggle, deviceName, gpsLocation, isGettingLocation, handleGetLocation };
};

// --- COMPONENT --- //
const AssetCard = ({ asset }) => {
  const theme = useTheme();
  const deviceId = asset["asset-id"] || asset.assetId;
  const {
    status,
    isLoading,
    message,
    isReady,
    handleToggle,
    deviceName,
    gpsLocation,
    isGettingLocation,
    handleGetLocation
  } = useParticleSwitch(deviceId);
  const [showTripHistory, setShowTripHistory] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const buttonText = status === "on" ? "POWER OFF" : "POWER ON";
  const isError = message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") || message.includes("FAILURE") || loadError;

  const StatusIndicator = styled("div")({
    width: 16,
    height: 16,
    borderRadius: "50%",
    backgroundColor: status === "on" ? theme.palette.success.main : theme.palette.error.main,
    display: "inline-block",
    verticalAlign: "middle",
  });

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    return timestamp.toDate().toLocaleString();
  };

  const mapCenter = useMemo(() => {
    if (gpsLocation && gpsLocation.lat) {
        return { lat: gpsLocation.lat, lng: gpsLocation.lng };
    }
    const lastLocation = asset.assetLocation && asset.assetLocation.length > 0 ? asset.assetLocation[asset.assetLocation.length - 1] : null;
    if (lastLocation && typeof lastLocation === 'string') {
        const parts = lastLocation.split(',');
        if (parts.length === 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }
    }
    return { lat: 32.61, lng: -97.14 }; 
  }, [gpsLocation, asset.assetLocation]);

  return (
    <Card elevation={4}>
      <Grid container>
        <Grid xs={12} md={6}>
          <Box sx={{ position: "relative", height: "100%", minHeight: "400px" }}>
            {asset['asset-image'] || asset.assetImage ? (
              <CardMedia
                component="img"
                sx={{ height: "100%", objectFit: "cover" }}
                image={asset['asset-image'] || asset.assetImage}
                alt={asset["asset-name"] || asset.assetName}
              />
            ) : (
              <Box sx={{ height: "100%", backgroundColor: "grey.900", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography variant="h5" color="text.secondary">No Image</Typography>
              </Box>
            )}
            
            {isLoaded && mapCenter && (
              <Box sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  height: "50%",
                  width: "100%",
                  border: `2px solid ${theme.palette.common.white}`,
                  borderRadius: 1,
                  boxShadow: 3,
                  overflow: "hidden",
                  zIndex: 2
                }}>
                <GoogleMap
                  mapContainerStyle={{ height: "100%", width: "100%" }}
                  center={mapCenter}
                  zoom={gpsLocation ? 17 : 14}
                >
                  <Marker position={mapCenter} label={gpsLocation ? "LIVE" : "DB"} />
                </GoogleMap>
              </Box>
            )}
          </Box>
        </Grid>
        
        <Grid xs={12} md={6}>
          <CardContent sx={{ p: 3 }}>
            <Typography gutterBottom variant="h4">{asset["asset-name"] || asset.assetName}</Typography>
            
            {/* 1, 2, 3: RESTORED METADATA FIELDS */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body1" color="text.secondary">
                <strong>ID:</strong> {asset["asset-id"] || asset.assetId}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                <strong>License:</strong> {asset["asset-license"] || asset.assetLicense}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                <strong>VIN:</strong> {asset["asset-vin"] || asset.assetVin}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                <strong>Description:</strong> {asset["asset-description"] || asset.assetDescription}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                <strong>Created At:</strong> {formatDate(asset.createdAt)}
              </Typography>
              {/* <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mr: 1 }}>
                  <strong>Kill Switch:</strong>
                </Typography>
                <Chip
                  label={asset["kill-switch-activated"] ? "Activated" : "Deactivated"}
                  color={asset["kill-switch-activated"] ? "error" : "success"}
                  size="small"
                />
              </Box> */}
            </Box>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <StatusIndicator />
                <Typography variant="h6" sx={{ ml: 1.5 }}>{deviceName}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">Remote Status: {status.toUpperCase()}</Typography>
            </Paper>

            <Grid container spacing={2}>
                <Grid xs={6}>
                    <Button
                        onClick={handleToggle}
                        disabled={!isReady || isLoading}
                        variant="contained"
                        color={status === "on" ? "error" : "success"}
                        fullWidth
                    >
                        {isLoading ? <CircularProgress size={24} /> : buttonText}
                    </Button>
                </Grid>
                <Grid xs={6}>
                    <Button
                        onClick={handleGetLocation}
                        disabled={!isReady || isGettingLocation}
                        variant="outlined"
                        fullWidth
                    >
                        GET GPS
                    </Button>
                </Grid>
            </Grid>

            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'background.paper', border: '1px solid', borderColor: isError ? 'error.main' : 'divider', borderRadius: 1 }}>
              <Typography variant="body2" color={isError ? "error" : "text.secondary"}>
                <strong>Log:</strong> {message}
              </Typography>
            </Box>

            <Link component="button" variant="body2" onClick={() => setShowTripHistory(!showTripHistory)} sx={{ mt: 2, display: 'block' }}>
              {showTripHistory ? "Hide History" : "Show Trip History"}
            </Link>

            {showTripHistory && asset.assetLocation && (
              <List dense>
                {asset.assetLocation.map((loc, i) => (
                  <ListItem key={i}><ListItemText secondary={loc} /></ListItem>
                ))}
              </List>
            )}

            {/* 4: RESTORED VIEW DETAILS BUTTON */}
            <Button
              component={RouterLink}
              to={`/vehicle/${asset.id}`}
              variant="outlined"
              sx={{ mt: 2 }}
              fullWidth
            >
              View Details
            </Button>
          </CardContent>
        </Grid>
      </Grid>
    </Card>
  );
};

export default AssetCard;