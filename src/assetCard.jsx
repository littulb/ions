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
  // Ensure we have an ID for the hook
  const deviceId = asset["asset-id"] || asset.assetId || asset.id;
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

  const isError = message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") || message.includes("FAILURE") || loadError;
  const isOn = status === "on";

  const mapCenter = useMemo(() => {
    if (gpsLocation && gpsLocation.lat) return { lat: gpsLocation.lat, lng: gpsLocation.lng };
    const lastLoc = asset.assetLocation && asset.assetLocation.length > 0 ? asset.assetLocation[asset.assetLocation.length - 1] : null;
    if (lastLoc && typeof lastLoc === 'string') {
        const parts = lastLoc.split(',');
        if (parts.length === 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        }
    }
    return { lat: 32.61, lng: -97.14 }; 
  }, [gpsLocation, asset.assetLocation]);

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    return timestamp.toDate().toLocaleString();
  };

  // Shared Styles from "Obsidian Cockpit" Token Spec
  const fontHeadline = "'Space Grotesk', sans-serif";
  const fontBody = "'Inter', sans-serif";
  const colors = {
    primary: "#90d792",
    primaryFixed: "#abf4ac",
    onPrimary: "#004b18",
    background: "#0c0e10",
    surfaceContainerLow: "#111416",
    surfaceContainer: "#161a1e",
    surfaceContainerHigh: "#1b2025",
    surfaceContainerHighest: "#20262c",
    surfaceBright: "#252d33",
    onSurface: "#e0e6ed",
    onSurfaceVariant: "#a6acb2",
    outlineVariant: "rgba(66, 73, 78, 0.3)", 
    outlineFaint: "rgba(66, 73, 78, 0.1)",
    error: "#ee7d77",
  };

  return (
    <Box sx={{ color: colors.onSurface, fontFamily: fontBody, width: '100%', mb: 4 }}>
      {/* Main Grid */}
      <Grid container spacing={3}>
        {/* Left Column */}
        <Grid item xs={12} lg={8}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            
            {/* Image Header */}
            <Box sx={{
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              aspectRatio: { xs: '4/3', md: '16/9' },
              border: `1px solid ${colors.outlineVariant}`,
              bgcolor: colors.surfaceContainer
            }}>
              {asset['asset-image'] || asset.assetImage ? (
                <Box component="img" 
                  src={asset['asset-image'] || asset.assetImage} 
                  alt={asset["asset-name"] || asset.assetName || "Vehicle"}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ fontFamily: fontHeadline, color: colors.onSurfaceVariant }}>No Cover Image</Typography>
                </Box>
              )}
              {/* Telemetry Badge */}
              <Box sx={{
                position: 'absolute', top: 16, right: 16,
                bgcolor: 'rgba(12, 14, 16, 0.8)',
                backdropFilter: 'blur(12px)',
                px: 1.5, py: 0.75,
                borderRadius: '8px',
                border: `1px solid ${colors.outlineVariant}`,
                display: 'flex', alignItems: 'center', gap: 1
              }}>
                <Box sx={{ position: 'relative', display: 'flex', height: 8, width: 8 }}>
                  <Box sx={{
                    position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
                    bgcolor: isOn ? colors.primary : colors.error, opacity: 0.75,
                    animation: isGettingLocation || isLoading ? 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none'
                  }} />
                  <Box sx={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', bgcolor: isOn ? colors.primary : colors.error }} />
                </Box>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Telemetry Live
                </Typography>
              </Box>
            </Box>

            {/* Asset Identity Section */}
            <Box sx={{
              bgcolor: colors.surfaceContainerLow,
              borderRadius: '12px', p: { xs: 2.5, md: 4 },
              border: `1px solid ${colors.outlineFaint}`,
              flexGrow: 1
            }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, alignItems: { lg: 'flex-end' }, justifyContent: 'space-between', gap: 2, mb: 4 }}>
                <Box>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, color: 'rgba(144, 215, 146, 0.7)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                    Vehicle Profile
                  </Typography>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: { xs: 24, md: 32 }, fontWeight: 700, mt: 0.5, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    {asset["asset-name"] || asset.assetName || "Unidentified Asset"}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { lg: 'right' }, mt: { xs: 1, lg: 0 } }}>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>
                    Electronic ID
                  </Typography>
                  <Box component="code" sx={{ bgcolor: colors.surfaceContainerHighest, px: 1.5, py: 0.5, borderRadius: '4px', color: colors.primary, fontSize: 12, fontFamily: 'monospace' }}>
                    {deviceId || "MISSING"}
                  </Box>
                </Box>
              </Box>

              {/* Technical Specs Bento */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={5} md={4}>
                  <Box sx={{ bgcolor: colors.surfaceContainer, p: 2.5, borderRadius: '8px', border: `1px solid ${colors.outlineFaint}`, height: '100%' }}>
                    <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', mb: 1, letterSpacing: '0.05em' }}>License Plate</Typography>
                    <Typography sx={{ fontFamily: fontHeadline, fontSize: 18, fontWeight: 700, letterSpacing: '0.1em' }}>{asset["asset-license"] || asset.assetLicense || "N/A"}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={7} md={8}>
                  <Box sx={{ bgcolor: colors.surfaceContainer, p: 2.5, borderRadius: '8px', border: `1px solid ${colors.outlineFaint}`, height: '100%' }}>
                    <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', mb: 1, letterSpacing: '0.05em' }}>Vehicle Identification Number (VIN)</Typography>
                    <Typography sx={{ fontFamily: fontHeadline, fontSize: 18, fontWeight: 700, letterSpacing: '0.1em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset["asset-vin"] || asset.assetVin || "N/A"}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ bgcolor: colors.surfaceContainer, p: 2.5, borderRadius: '8px', border: `1px solid ${colors.outlineFaint}` }}>
                    <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', mb: 1, letterSpacing: '0.05em' }}>Description</Typography>
                    <Typography sx={{ fontSize: 14, color: '#c9d1d9', lineHeight: 1.6 }}>{asset["asset-description"] || asset.assetDescription || "No description provided. Please update the master asset database."}</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>

          </Box>
        </Grid>

        {/* Right Column */}
        <Grid item xs={12} lg={4}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            
            {/* Status & Telemetry HUD */}
            <Box sx={{ bgcolor: colors.surfaceContainer, p: 3, borderRadius: '12px', border: `1px solid ${colors.outlineVariant}`, position: 'relative', overflow: 'hidden' }}>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 3 }}>
                Remote System State
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                <Box sx={{ 
                  width: 48, height: 48, borderRadius: '8px', 
                  bgcolor: isOn ? 'rgba(144, 215, 146, 0.1)' : 'rgba(238, 125, 119, 0.1)',
                  border: `1px solid ${isOn ? 'rgba(144, 215, 146, 0.2)' : 'rgba(238, 125, 119, 0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <span className="material-symbols-outlined" style={{ color: isOn ? colors.primary : colors.error, fontSize: 24 }}>power_settings_new</span>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, color: colors.onSurfaceVariant, fontWeight: 500, mb: 0.5 }}>Ignition Status</Typography>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: 22, fontWeight: 700, color: isOn ? colors.primary : colors.error, display: 'flex', alignItems: 'center', gap: 1.5, lineHeight: 1 }}>
                    {isOn ? "READY_ON" : "STANDBY_OFF"}
                    {isOn && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colors.primary, boxShadow: `0 0 8px ${colors.primary}` }} />}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.5, borderBottom: `1px solid ${colors.outlineFaint}`, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: colors.onSurfaceVariant }}>Device Target</Typography>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: 14, fontWeight: 500 }}>{deviceName}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1.5, borderBottom: `1px solid ${colors.outlineFaint}`, alignItems: 'center' }}>
                  <Typography sx={{ fontSize: 12, color: colors.onSurfaceVariant }}>Network Logic</Typography>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: 14, color: isReady ? colors.primary : colors.onSurfaceVariant, fontWeight: 500 }}>
                    {isReady ? "CONNECTED" : "OFFLINE"}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 0.5 }}>
                  <Typography sx={{ fontSize: 12, color: isError ? colors.error : colors.onSurfaceVariant }}>Platform Log</Typography>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, color: isError ? colors.error : colors.onSurface, maxWidth: '65%', textAlign: 'right', fontWeight: 500 }}>
                    {message.toUpperCase()}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* GPS Integration Mini-Map */}
            <Box sx={{ bgcolor: colors.surfaceContainerLow, borderRadius: '12px', border: `1px solid ${colors.outlineVariant}`, overflow: 'hidden', flexGrow: 1, minHeight: 220, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ p: 2, borderBottom: `1px solid ${colors.outlineFaint}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: colors.surfaceContainer }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                  Active Localization
                </Typography>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: colors.onSurfaceVariant }}>my_location</span>
              </Box>
              <Box sx={{ position: 'relative', flexGrow: 1 }}>
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={mapCenter}
                    zoom={gpsLocation ? 16 : 13}
                    options={{ 
                        disableDefaultUI: true, 
                        // Simplified dark mode styling for the embedded minimal map
                        styles: [
                            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
                            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
                            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
                            { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
                            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
                        ] 
                    }}
                  >
                    <Marker position={mapCenter} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" }} />
                  </GoogleMap>
                ) : (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.02)' }}>
                    <CircularProgress size={24} sx={{ color: colors.primary }} />
                  </Box>
                )}
                {/* Simulated Radar Overlay Ping */}
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                     {!isLoaded && <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, color: colors.primary, mb: -6 }}>LOCATING...</Typography>}
                </Box>
                
                {/* Coordinates Tab */}
                <Box sx={{ position: 'absolute', bottom: 12, left: 12, bgcolor: 'rgba(12, 14, 16, 0.9)', px: 1.5, py: 0.75, borderRadius: '4px', border: `1px solid ${colors.outlineVariant}`, backdropFilter: 'blur(4px)' }}>
                  <Typography sx={{ fontFamily: 'monospace', fontSize: 10, color: colors.primary }}>
                    {mapCenter.lat.toFixed(4)}° N, {mapCenter.lng.toFixed(4)}° W
                  </Typography>
                </Box>
              </Box>
            </Box>

          </Box>
        </Grid>
      </Grid>

      {/* Unified High-Contrast Action Bar */}
      <Box sx={{ mt: 3, bgcolor: colors.surfaceContainerHigh, borderRadius: '12px', p: { xs: 1.5, sm: 2 }, border: `1px solid ${colors.outlineVariant}` }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Button
              onClick={handleToggle}
              disabled={!isReady || isLoading}
              fullWidth
              sx={{
                bgcolor: isOn ? colors.error : colors.primary,
                color: isOn ? '#fff' : colors.onPrimary,
                fontFamily: fontHeadline,
                fontWeight: 700,
                fontSize: 14,
                py: 2, borderRadius: '8px',
                '&:hover': { bgcolor: isOn ? '#d32f2f' : colors.primaryFixed },
                boxShadow: isOn ? '0 0 24px rgba(238,125,119,0.15)' : '0 0 24px rgba(144,215,146,0.15)',
                transition: 'all 0.2s ease-in-out',
                '&:active': { transform: 'scale(0.98)' }
              }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : (
                <>
                  <span className="material-symbols-outlined" style={{ marginRight: 8, fontSize: 20 }}>bolt</span>
                  {isOn ? "POWER OFF" : "POWER ON"}
                </>
              )}
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              onClick={handleGetLocation}
              disabled={!isReady || isGettingLocation}
              fullWidth
              sx={{
                bgcolor: colors.surfaceContainerHighest,
                color: colors.onSurface,
                fontFamily: fontHeadline,
                fontWeight: 700,
                fontSize: 14,
                py: 2, borderRadius: '8px',
                border: `1px solid ${colors.outlineVariant}`,
                '&:hover': { bgcolor: colors.surfaceBright },
                transition: 'all 0.2s ease-in-out',
                '&:active': { transform: 'scale(0.98)' }
              }}
            >
              {isGettingLocation ? <CircularProgress size={20} color="inherit" /> : (
                <>
                  <span className="material-symbols-outlined" style={{ marginRight: 8, fontSize: 20 }}>location_searching</span>
                  GET GPS
                </>
              )}
            </Button>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              component={RouterLink}
              to={`/vehicle/${asset.id}`}
              fullWidth
              sx={{
                bgcolor: colors.surfaceContainerHighest,
                color: colors.onSurface,
                fontFamily: fontHeadline,
                fontWeight: 700,
                fontSize: 14,
                py: 2, borderRadius: '8px',
                border: `1px solid ${colors.outlineVariant}`,
                '&:hover': { bgcolor: colors.surfaceBright },
                transition: 'all 0.2s ease-in-out',
                '&:active': { transform: 'scale(0.98)' }
              }}
            >
              <span className="material-symbols-outlined" style={{ marginRight: 8, fontSize: 20 }}>analytics</span>
              VIEW DETAILS
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Trip history link - styled subtly */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Link component="button" variant="body2" onClick={() => setShowTripHistory(!showTripHistory)} sx={{ color: colors.onSurfaceVariant, fontFamily: fontBody, fontSize: 12, transition: 'color 0.2s', '&:hover': { color: colors.primary } }}>
          {showTripHistory ? "HIDE DIAGNOSTIC HISTORY" : "SHOW DIAGNOSTIC HISTORY"}
        </Link>
        {showTripHistory && asset.assetLocation && (
          <List dense sx={{ mt: 2, bgcolor: colors.surfaceContainerLow, borderRadius: '8px', border: `1px solid ${colors.outlineFaint}`, textAlign: 'left', p: 1 }}>
            {asset.assetLocation.map((loc, i) => (
              <ListItem key={i} sx={{ borderBottom: `1px solid rgba(255,255,255,0.03)`}}>
                   <span className="material-symbols-outlined" style={{ fontSize: 14, color: colors.onSurfaceVariant, marginRight: 8 }}>history</span>
                   <ListItemText secondary={loc} secondaryTypographyProps={{ color: colors.onSurfaceVariant, fontSize: 12, fontFamily: 'monospace' }} />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

    </Box>
  );
};

export default AssetCard;