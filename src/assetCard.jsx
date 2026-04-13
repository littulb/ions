import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
  Chip,
  useMediaQuery,
  IconButton
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';

import useParticleSwitch from './useParticleSwitch';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from './firebase';
import { Slider } from '@mui/material';
import { getAddressFromCoords } from './utils/geoUtils';

// --- CONFIGURATION ---
const ACCESS_TOKEN = "b41c40940d370527fc69d053c6138afbed9094c2";
const FUNCTION_NAME = "ignitionSwitch";
const LOCATION_FUNCTION_NAME = "getLocation";
const VARIABLE_NAME = "ignitionStatus";
const EVENT_NAME = "gps-telemetry";
const MAX_RETRIES = 3;
const DELAY_MS = 1000;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// --- COMPONENT --- //
const AssetCard = ({ asset, handleClose, restoredGps }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  // Ensure we have an ID for the hook
  const deviceId = asset["asset-id"] || asset.assetId || asset.id;

  const handleLocationUpdate = useCallback(async (newLoc) => {
    if (!asset || !(asset.id || asset['asset-id'])) return;
    const docId = asset.id || asset['asset-id'];
    try {
      const locObj = {
        pos: `${newLoc.lat},${newLoc.lng}`,
        timestamp: new Date().toISOString()
      };
      const assetRef = doc(db, 'assets', docId);
      await updateDoc(assetRef, {
        'asset-location-history': arrayUnion(locObj)
      });
      console.log('Location saved to Firestore:', locObj);
    } catch (e) {
      console.error('Error saving location history:', e);
    }
  }, [asset]);

  const {
    status,
    isLoading,
    message,
    isReady,
    handleToggle,
    deviceName,
    gpsLocation,
    isGettingLocation,
    handleGetLocation,
    battery,
    signal
  } = useParticleSwitch(deviceId, restoredGps, handleLocationUpdate);
  const [showTripHistory, setShowTripHistory] = useState(false);
  const [hasRequestedGps, setHasRequestedGps] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(null);
  const [addressDisplay, setAddressDisplay] = useState('');

  useEffect(() => {
    if (isReady && !gpsLocation && !hasRequestedGps) {
      setHasRequestedGps(true);
      handleGetLocation();
    }
  }, [isReady, gpsLocation, hasRequestedGps, handleGetLocation]);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const isError = message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") || message.includes("FAILURE") || loadError;
  const isOn = status === "on";

  // Simulated static data for the new UI elements required by the design
  // since the Particle endpoint doesn't currently stream these properties.
  const displayBattery = battery !== null ? battery : '--';
  const displaySignal = signal !== null ? signal : '--';

  const normalizedHistory = useMemo(() => {
    const raw = asset['asset-location-history'] || [];
    return raw.map(item => {
      if (typeof item === 'string') return { pos: item, timestamp: null };
      return item;
    });
  }, [asset['asset-location-history']]);

  const liveLocation = useMemo(() => {
    if (gpsLocation && gpsLocation.lat) return { lat: gpsLocation.lat, lng: gpsLocation.lng };
    const lastItem = normalizedHistory.length > 0 ? normalizedHistory[normalizedHistory.length - 1] : null;
    if (lastItem && lastItem.pos) {
      const parts = lastItem.pos.split(',');
      if (parts.length === 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
      }
    }
    return { lat: 0, lng: -0 };
  }, [gpsLocation, normalizedHistory]);

  const mapCenter = useMemo(() => {
    if (selectedLoc) return selectedLoc;
    return liveLocation;
  }, [selectedLoc, liveLocation]);

  const polylinePath = useMemo(() => {
    return normalizedHistory.map(item => {
      if (!item || !item.pos) return null;
      const parts = item.pos.split(',');
      return { lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
    }).filter(p => p && !isNaN(p.lat) && !isNaN(p.lng));
  }, [normalizedHistory]);

  const handleScrub = async (event, newValue) => {
    setActiveHistoryIndex(newValue);
    const item = normalizedHistory[newValue];
    if (item && item.pos) {
      const parts = item.pos.split(',');
      setSelectedLoc({ lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) });
      setAddressDisplay('Fetching address...');
      const address = await getAddressFromCoords(item.pos);
      setAddressDisplay(address);
    }
  };

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
    surfaceContainerLowest: "#000000",
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
    primaryContainer: "#07521d",
    onPrimaryFixedVariant: "#246830",
  };

  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const mapOptions = {
    disableDefaultUI: true,
    mapTypeId: 'roadmap',
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
      { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
      { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
      { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }
    ]
  };

  const mapElement = isLoaded ? (
    <GoogleMap
      mapContainerStyle={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }}
      center={mapCenter}
      zoom={gpsLocation ? 16 : 13}
      options={mapOptions}
    >
      <Marker position={liveLocation} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png" }} />
      {polylinePath.length > 1 && (
        <Polyline
          path={polylinePath}
          options={{
            strokeColor: colors.primary,
            strokeOpacity: 0.8,
            strokeWeight: 4,
          }}
        />
      )}
      {activeHistoryIndex !== null && normalizedHistory[activeHistoryIndex] && (
        (() => {
          const parts = normalizedHistory[activeHistoryIndex].pos.split(',');
          return <Marker position={{ lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) }} icon={{ url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png" }} />;
        })()
      )}
    </GoogleMap>
  ) : (
    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={24} sx={{ color: colors.primary }} />
    </Box>
  );

  const desktopLayout = (
    <Box sx={{ color: colors.onSurface, fontFamily: fontBody, width: '100%', mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, bgcolor: colors.surfaceContainerLow, borderRadius: '12px', border: `1px solid ${colors.outlineFaint}`, overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.5)' }}>
      {/* Left Column (w-5/12 in Tailwind) */}
      <Box sx={{ width: { xs: '100%', md: '41.666%' }, display: 'flex', flexDirection: 'column', borderRight: { md: `1px solid ${colors.outlineFaint}` } }}>
        {/* Image Area */}
        <Box sx={{ position: 'relative', height: '60%', width: '100%', minHeight: { xs: 300, md: 450 }, bgcolor: colors.surfaceContainerLowest, overflow: 'hidden' }}>
          {asset['asset-image'] || asset.assetImage ? (
            <Box component="img"
              src={asset['asset-image'] || asset.assetImage}
              alt={asset["asset-name"] || asset.assetName || "Vehicle"}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9, filter: 'grayscale(0.2)', transition: 'all 0.7s ease', '&:hover': { filter: 'grayscale(0)' } }}
            />
          ) : (
            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontFamily: fontHeadline, color: colors.onSurfaceVariant }}>No Cover Image</Typography>
            </Box>
          )}
          <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${colors.surfaceContainerLow}, transparent, transparent)` }} />

          <Box sx={{ position: 'absolute', bottom: 24, left: 24 }}>
            <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, bgcolor: 'rgba(144, 215, 146, 0.1)', border: `1px solid rgba(144, 215, 146, 0.2)`, color: colors.primary, fontFamily: fontHeadline, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '4px', mb: 1 }}>
              Operational
            </Box>
            <Typography sx={{ fontFamily: fontHeadline, fontSize: { xs: 28, md: 36 }, fontWeight: 700, color: colors.onSurface, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {asset["asset-name"] || asset.assetName || "UNIDENTIFIED ASSET"}
            </Typography>
          </Box>
        </Box>

        {/* Profile Details Area */}
        <Box sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Grid container spacing={4}>
            <Grid item xs={6}>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>VIN / SERIAL</Typography>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 14, fontWeight: 500, color: colors.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset["asset-vin"] || asset.assetVin || "N/A"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>UNIT ID</Typography>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 14, fontWeight: 500, color: colors.onSurface }}>{deviceId || "MISSING"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>LICENSE PLATE</Typography>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 14, fontWeight: 500, color: colors.onSurface }}>{asset["asset-license"] || asset.assetLicense || "N/A"}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 0.5 }}>FIRMWARE</Typography>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 14, fontWeight: 500, color: colors.onSurface }}>v2.4.9-IGNITE</Typography>
            </Grid>
          </Grid>

          {/* View Details Button Contextually Placed */}
          <Box sx={{ mt: 'auto', pt: 2 }}>
            <Button
              component={RouterLink}
              to={`/vehicle/${asset.id}`}
              fullWidth
              sx={{
                bgcolor: colors.surfaceContainerHighest,
                color: colors.onSurface,
                fontFamily: fontHeadline,
                fontWeight: 700,
                fontSize: 12,
                py: 2, borderRadius: '6px',
                border: `1px solid ${colors.outlineVariant}`,
                '&:hover': { bgcolor: colors.surfaceBright },
                transition: 'all 0.15s',
                letterSpacing: '0.1em',
                textTransform: 'uppercase'
              }}
            >
              <span className="material-symbols-outlined" style={{ marginRight: 8, fontSize: 18 }}>info</span>
              VIEW MAINTENANCE HISTORY
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Right Column (w-7/12 in Tailwind) */}
      <Box sx={{ width: { xs: '100%', md: '58.333%' }, display: 'flex', flexDirection: 'column' }}>

        {/* Top Half: Remote System State */}
        <Box sx={{ flex: 1, bgcolor: colors.surfaceContainer, p: 4, display: 'flex', flexDirection: 'column', borderBottom: `1px solid ${colors.outlineFaint}` }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
            <Box>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: colors.onSurface }}>Remote System State</Typography>
              <Typography sx={{ fontSize: 12, color: colors.onSurfaceVariant, mt: 0.5 }}>Real-time telemetry and ignition control</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: colors.surfaceContainerHigh, px: 1.5, py: 1, borderRadius: '4px', border: `1px solid ${colors.outlineFaint}` }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: isReady ? colors.primary : colors.error, animation: 'pulse 2s infinite', boxShadow: isReady ? `0 0 8px ${colors.primary}` : `0 0 8px ${colors.error}` }} />
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: isReady ? colors.primary : colors.error, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>NETWORK SYNC</Typography>
            </Box>
          </Box>

          {/* Status Tiles Grid */}
          <Grid container spacing={3} sx={{ flex: 1, mb: 4 }}>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: colors.surfaceContainerHigh, p: 2.5, borderRadius: '8px', border: `1px solid ${colors.outlineFaint}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Battery</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 2 }}>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: displayBattery === 'Plugged In' ? 16 : 28, fontWeight: 700, color: colors.onSurface }}>{displayBattery}</Typography>
                  {typeof displayBattery === 'number' && <Typography sx={{ fontSize: 12, color: colors.onSurfaceVariant }}>%</Typography>}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: colors.surfaceContainerHigh, p: 2.5, borderRadius: '8px', border: `1px solid ${colors.outlineFaint}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>SIGNAL STRENGTH (RSSI)</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 2 }}>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: 28, fontWeight: 700, color: colors.onSurface }}>{displaySignal}</Typography>
                  <Typography sx={{ fontSize: 12, color: colors.onSurfaceVariant }}>%</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Contextual Power Button */}
          <Button
            onClick={handleToggle}
            disabled={!isReady || isLoading}
            fullWidth
            sx={{
              bgcolor: !isReady ? colors.surfaceContainerHighest : (isOn ? colors.error : colors.primary),
              color: !isReady ? colors.onSurfaceVariant : (isOn ? '#fff' : colors.onPrimary),
              fontFamily: fontHeadline,
              fontWeight: 700,
              fontSize: 14,
              py: 3, borderRadius: '6px',
              '&:hover': { bgcolor: !isReady ? colors.surfaceContainerHighest : (isOn ? '#d32f2f' : colors.primaryFixed) },
              boxShadow: !isReady ? 'none' : (isOn ? '0 8px 32px rgba(238,125,119,0.15)' : '0 8px 32px rgba(144,215,146,0.15)'),
              transition: 'all 0.2s ease-in-out',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              '&:active': { transform: !isReady ? 'none' : 'scale(0.98)' }
            }}
          >
            {(!isReady || isLoading) ? (
              <>
                <CircularProgress size={20} color="inherit" sx={{ mr: 2 }} />
                <span style={{ fontSize: 13, letterSpacing: '0.1em' }}>SYNCING HARDWARE...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ marginRight: 12, fontSize: 24 }}>power_settings_new</span>
                {isOn ? "DEACTIVATE SWITCH" : "ACTIVATE SWITCH"}
              </>
            )}
          </Button>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 10, color: isError ? colors.error : colors.onSurfaceVariant, maxWidth: '100%', textAlign: 'center', fontFamily: 'monospace' }}>
              [SYS_LOG]: {message.toUpperCase()}
            </Typography>
          </Box>
        </Box>

        {/* Bottom Half: Active Localization */}
        <Box sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
            <Box>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: colors.onSurface }}>Active Localization</Typography>
              <Typography sx={{ fontSize: 12, color: colors.onSurfaceVariant, mt: 0.5 }}>Global positioning and trajectory tracking</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Button
                onClick={handleGetLocation}
                disabled={!isReady || isGettingLocation}
                sx={{
                  bgcolor: colors.surfaceContainerHighest,
                  color: colors.onSurface,
                  fontFamily: fontHeadline,
                  fontWeight: 700,
                  fontSize: 10,
                  px: 2, py: 1, borderRadius: '4px',
                  border: `1px solid ${colors.outlineVariant}`,
                  '&:hover': { bgcolor: colors.surfaceBright },
                  letterSpacing: '0.1em',
                  transition: 'all 0.2s',
                }}
              >
                {isGettingLocation ? <CircularProgress size={16} color="inherit" /> : (
                  <>
                    <span className="material-symbols-outlined" style={{ marginRight: 6, fontSize: 16 }}>my_location</span>
                    GET GPS
                  </>
                )}
              </Button>
              {(mapCenter && (mapCenter.lat !== 0 || mapCenter.lng !== 0)) && (
                <Button
                  onClick={() => {
                    if (handleClose) handleClose();
                    navigate(`/map/${asset.id || asset['asset-id']}`, {
                      state: {
                        asset,
                        gpsLocation: mapCenter,
                        status,
                        battery: displayBattery,
                        signal: displaySignal
                      }
                    });
                  }}
                  sx={{
                    bgcolor: `${colors.primary}15`,
                    color: colors.primary,
                    fontFamily: fontHeadline,
                    fontWeight: 700,
                    fontSize: 10,
                    px: 2, py: 1, borderRadius: '4px',
                    border: `1px solid ${colors.primary}50`,
                    '&:hover': { bgcolor: colors.primary, color: colors.onPrimary },
                    letterSpacing: '0.1em',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(144,215,146,0.1)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ marginRight: 6, fontSize: 16 }}>open_in_new</span>
                  FULLSCREEN MAP
                </Button>
              )}
            </Box>
          </Box>

          {/* Map Container */}
          <Box sx={{ flex: 1, position: 'relative', width: '100%', minHeight: 250, bgcolor: colors.surfaceContainerLowest, borderRadius: '8px', border: `1px solid ${colors.outlineFaint}`, overflow: 'hidden' }}>
            {mapElement}

            {/* HUD Data Overlays */}
            <Box sx={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 3 }}>
              <Box>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 9, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>LATITUDE</Typography>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, fontWeight: 500, color: colors.primary, textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>{mapCenter.lat.toFixed(4)}° N</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 9, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>LONGITUDE</Typography>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, fontWeight: 500, color: colors.primary, textShadow: '0 0 10px rgba(0,0,0,0.8)' }}>{mapCenter.lng.toFixed(4)}° W</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link component="button" variant="body2" onClick={() => setShowTripHistory(!showTripHistory)} sx={{ color: colors.onSurfaceVariant, fontFamily: fontBody, fontSize: 12, transition: 'color 0.2s', '&:hover': { color: colors.primary } }}>
              {showTripHistory ? "HIDE HISTORY TIMELINE" : "SHOW HISTORY TIMELINE"}
            </Link>
          </Box>
          {showTripHistory && normalizedHistory.length > 0 && (
            <Box sx={{ mt: 2, p: 3, bgcolor: colors.surfaceContainerLowest, borderRadius: '8px', border: `1px solid ${colors.outlineFaint}`, textAlign: 'left' }}>
              <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', mb: 1 }}>Scrubber Timeline</Typography>
              <Slider
                value={activeHistoryIndex !== null ? activeHistoryIndex : normalizedHistory.length - 1}
                min={0}
                max={Math.max(0, normalizedHistory.length - 1)}
                step={1}
                onChange={handleScrub}
                marks
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => {
                  const item = normalizedHistory[value];
                  if (!item) return '';
                  return item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `Point ${value + 1}`;
                }}
                sx={{
                  color: colors.primary,
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: colors.surfaceContainerHigh,
                    color: colors.onSurface,
                    fontFamily: fontBody,
                    fontSize: 12,
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }
                }}
              />
              <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: colors.onSurfaceVariant }}>location_on</span>
                <Typography sx={{ fontSize: 12, color: colors.onSurface, fontFamily: fontBody }}>{addressDisplay || "Hover/Drag to fetch address"}</Typography>
              </Box>
            </Box>
          )}

        </Box>
      </Box>

    </Box>
  );

  const mobileLayout = (
    <Box sx={{ color: colors.onSurface, fontFamily: fontBody, width: '100%', mb: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Mobile Header Banner */}
      <Box sx={{ position: 'relative', width: '100%', height: 224, borderRadius: '12px', overflow: 'hidden' }}>
        {asset['asset-image'] || asset.assetImage ? (
          <Box component="img"
            src={asset['asset-image'] || asset.assetImage}
            alt={asset["asset-name"] || asset.assetName || "Vehicle"}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colors.surfaceContainerLowest }}>
            <Typography sx={{ fontFamily: fontHeadline, color: colors.onSurfaceVariant }}>No Cover Image</Typography>
          </Box>
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${colors.background}, transparent, transparent)` }} />
        <Box sx={{ position: 'absolute', bottom: 16, left: 16 }}>
          <Box sx={{ display: 'inline-block', px: 1.5, py: 0.5, bgcolor: 'rgba(144, 215, 146, 0.2)', border: `1px solid rgba(144, 215, 146, 0.3)`, color: colors.primary, fontFamily: fontHeadline, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: '16px', mb: 1, backdropFilter: 'blur(12px)' }}>
            Unit-{deviceId ? deviceId.slice(-4) : "UKN"} Active
          </Box>
          <Typography sx={{ fontFamily: fontHeadline, fontSize: 24, fontWeight: 700, color: colors.onSurface, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {asset["asset-name"] || asset.assetName || "UNIDENTIFIED ASSET"}
          </Typography>
        </Box>
      </Box>

      {/* Vehicle Profile */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
          <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Vehicle Profile</Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: colors.outlineFaint, mx: 2 }} />
          <span className="material-symbols-outlined" style={{ color: colors.primary, fontSize: 16 }}>fingerprint</span>
        </Box>
        <Box sx={{ bgcolor: colors.outlineFaint, borderRadius: '12px', border: `1px solid ${colors.outlineVariant}`, overflow: 'hidden' }}>
          <Grid container spacing={0.25} sx={{ bgcolor: colors.outlineFaint }}>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: colors.surfaceContainer, p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, height: '100%' }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 9, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>VIN / SERIAL</Typography>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, fontWeight: 500, color: colors.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset["asset-vin"] || asset.assetVin || "N/A"}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: colors.surfaceContainer, p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, height: '100%' }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 9, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>UNIT ID</Typography>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, fontWeight: 500, color: colors.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{deviceId || "MISSING"}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: colors.surfaceContainer, p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, height: '100%' }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 9, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>LICENSE PLATE</Typography>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, fontWeight: 500, color: colors.onSurface }}>{asset["asset-license"] || asset.assetLicense || "N/A"}</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: colors.surfaceContainer, p: 2, display: 'flex', flexDirection: 'column', gap: 0.5, height: '100%' }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 9, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>FIRMWARE</Typography>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, fontWeight: 500, color: colors.onSurface }}>v2.4.9-IGNITE</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Remote System State */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
          <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Remote System State</Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: colors.outlineFaint, mx: 2 }} />
          <span className="material-symbols-outlined" style={{ color: colors.primary, fontSize: 16 }}>sensors</span>
        </Box>
        <Box sx={{ bgcolor: colors.outlineFaint, borderRadius: '12px', border: `1px solid ${colors.outlineVariant}`, overflow: 'hidden' }}>
          <Grid container spacing={0.25} sx={{ bgcolor: colors.outlineFaint }}>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: colors.surfaceContainer, p: 2.5, display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Signal Strength</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: 24, fontWeight: 500, color: colors.primary }}>{displaySignal}</Typography>
                  <Typography sx={{ fontSize: 12, color: colors.primary, opacity: 0.6 }}>%</Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ bgcolor: colors.surfaceContainer, p: 2.5, display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Battery Level</Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                  <Typography sx={{ fontFamily: fontHeadline, fontSize: displayBattery === 'Plugged In' ? 14 : 24, fontWeight: 500, color: colors.primary }}>{displayBattery}</Typography>
                  {typeof displayBattery === 'number' && <Typography sx={{ fontSize: 12, color: colors.primary, opacity: 0.6 }}>%</Typography>}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Active Localization */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
          <Typography sx={{ fontFamily: fontHeadline, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Active Localization</Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: colors.outlineFaint, mx: 2 }} />
          <span className="material-symbols-outlined" style={{ color: colors.onSurfaceVariant, fontSize: 16 }}>location_on</span>
        </Box>
        <Box sx={{ borderRadius: '12px', overflow: 'hidden', border: `1px solid ${colors.outlineVariant}`, bgcolor: colors.surfaceContainerLow }}>
          <Box sx={{ height: 160, position: 'relative' }}>
            {mapElement}
            {!isLoaded && (
              <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 12, color: colors.primary }}>LOCATING...</Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ flex: 1, display: 'flex', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 9, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Latitude</Typography>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 14, fontWeight: 500, color: colors.onSurface }}>{mapCenter.lat.toFixed(4)}° N</Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 9, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Longitude</Typography>
                <Typography sx={{ fontFamily: fontHeadline, fontSize: 14, fontWeight: 500, color: colors.onSurface }}>{mapCenter.lng.toFixed(4)}° E</Typography>
              </Box>
            </Box>

            {(mapCenter && (mapCenter.lat !== 0 || mapCenter.lng !== 0)) && (
              <IconButton
                onClick={() => {
                  if (handleClose) handleClose();
                  navigate(`/map/${asset.id || asset['asset-id']}`, {
                    state: {
                      asset,
                      gpsLocation: mapCenter,
                      status,
                      battery: displayBattery,
                      temp: 22
                    }
                  });
                }}
                sx={{
                  width: 40, height: 40, borderRadius: '8px',
                  bgcolor: colors.surfaceContainerHighest,
                  border: `1px solid ${colors.outlineVariant}`,
                  color: colors.primary,
                  transition: 'transform 0.1s, background-color 0.2s',
                  '&:hover': { bgcolor: colors.surfaceBright },
                  '&:active': { transform: 'scale(0.9)' }
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>open_in_new</span>
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {/* Action Buttons Block */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
        <Button
          onClick={handleToggle}
          disabled={!isReady || isLoading}
          fullWidth
          sx={{
            background: !isReady ? colors.surfaceContainerHighest : (isOn ? `linear-gradient(to right, ${colors.error}, #bb5551)` : `linear-gradient(to right, ${colors.primary}, ${colors.primaryContainer})`),
            color: !isReady ? colors.onSurfaceVariant : (isOn ? '#fff' : colors.onPrimary),
            fontFamily: fontHeadline,
            fontWeight: 700,
            fontSize: 14,
            py: 2, borderRadius: '8px',
            boxShadow: !isReady ? 'none' : (isOn ? '0 0 12px 2px rgba(238, 125, 119, 0.2)' : '0 0 12px 2px rgba(144, 215, 146, 0.2)'),
            transition: 'transform 0.1s',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            '&:active': { transform: !isReady ? 'none' : 'scale(0.95)' }
          }}
        >
          {(!isReady || isLoading) ? (
            <>
              <CircularProgress size={18} color="inherit" />
              <span style={{ fontSize: 13, letterSpacing: '0.1em' }}>SYNCING...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>power_settings_new</span>
              {isOn ? "DEACTIVATE SWITCH" : "ACTIVATE SWITCH"}
            </>
          )}
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
          <Button
            onClick={handleGetLocation}
            disabled={!isReady || isGettingLocation}
            sx={{
              flex: 1,
              bgcolor: colors.surfaceContainerHigh,
              color: colors.onSurface,
              fontFamily: fontHeadline,
              fontWeight: 700,
              fontSize: 10,
              py: 1.5, borderRadius: '8px',
              border: `1px solid ${colors.outlineVariant}`,
              '&:hover': { bgcolor: colors.surfaceBright },
              transition: 'transform 0.1s',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              '&:active': { transform: 'scale(0.95)' }
            }}
          >
            {isGettingLocation ? <CircularProgress size={16} color="inherit" /> : (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>gps_fixed</span>
                GET GPS
              </>
            )}
          </Button>
          <Button
            component={RouterLink}
            to={`/vehicle/${asset.id}`}
            sx={{
              flex: 1,
              bgcolor: colors.surfaceContainerHigh,
              color: colors.onSurface,
              fontFamily: fontHeadline,
              fontWeight: 700,
              fontSize: 10,
              py: 1.5, borderRadius: '8px',
              border: `1px solid ${colors.outlineVariant}`,
              '&:hover': { bgcolor: colors.surfaceBright },
              transition: 'transform 0.1s',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              '&:active': { transform: 'scale(0.95)' }
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
            VIEW DETAILS
          </Button>
        </Box>
      </Box>

      {/* Informational Error/Log Display directly underneath actions */}
      {(message || isError) && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 10, color: isError ? colors.error : colors.onSurfaceVariant, maxWidth: '100%', textAlign: 'center', fontFamily: 'monospace' }}>
            [SYS_LOG]: {message.toUpperCase()}
          </Typography>
        </Box>
      )}
    </Box>
  );

  return isMobile ? mobileLayout : desktopLayout;
};

export default AssetCard;