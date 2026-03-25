import React, { useMemo } from 'react';
import { useParams, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, IconButton, Button, Chip, CircularProgress } from '@mui/material';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import useParticleSwitch from './useParticleSwitch';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

const colors = {
  primary: "#90d792",
  primaryFixed: "#abf4ac",
  primaryContainer: "#07521d",
  onPrimary: "#004b18",
  error: "#ee7d77",
  deactivated: "#0d00ffff",
  surfaceContainerHighest: "#20262c",
  outlineVariant: "#42494e",
  surfaceBright: "#252d33",
  onSurface: "#e0e6ed",
  onSurfaceVariant: "#a6acb2"
};

const fontHeadline = "'Space Grotesk', sans-serif";
const fontLabel = "'Space Grotesk', sans-serif";

export default function AssetMapView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  // Read data passed from the AssetCard navigate state
  const state = location.state || {};
  const asset = state.asset || { 'asset-name': 'Unknown', 'vin-serial': 'Unknown' };
  const deviceId = asset["asset-id"] || asset.assetId || asset.id || id;
  const initialGpsLocation = state.gpsLocation || { lat: 33.7259, lng: -84.3809 };
  const initialBattery = state.battery || '--';
  const temp = state.temp || 22;

  const {
    status,
    isLoading,
    isReady,
    handleToggle,
    gpsLocation: hookGpsLocation,
    battery: hookBattery,
    signal: hookSignal
  } = useParticleSwitch(deviceId, initialGpsLocation);

  const gpsLocation = hookGpsLocation || initialGpsLocation;
  const battery = hookBattery !== null ? hookBattery : initialBattery;
  const signal = hookSignal !== null ? hookSignal : '--';
  const isOn = status === 'on';

  const mapOptions = useMemo(() => ({
    styles: darkMapStyle,
    disableDefaultUI: true,
    zoomControl: true,
  }), []);

  if (!isLoaded) return <Box sx={{ width: '100vw', height: '100vh', bgcolor: '#0c0e10' }} />;

  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, bgcolor: '#0c0e10' }}>

      {/* Top Left Close Button */}
      <IconButton
        onClick={() => navigate('/', { state: { reopenAsset: asset, restoredGps: gpsLocation }, replace: true })}
        sx={{
          position: 'absolute', top: 24, left: 24, zIndex: 10,
          bgcolor: 'rgba(17, 20, 22, 0.8)', backdropFilter: 'blur(12px)',
          border: `1px solid ${colors.outlineVariant}`,
          color: colors.onSurface,
          '&:hover': { bgcolor: colors.surfaceBright }
        }}
      >
        <span className="material-symbols-outlined">close</span>
      </IconButton>

      {/* Google Map Fullscreen Canvas */}
      <Box sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, opacity: 0.8, filter: 'contrast(1.2)' }}>
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={gpsLocation}
          zoom={14}
          options={mapOptions}
        >
          <Marker position={gpsLocation} />
        </GoogleMap>
      </Box>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 50%, rgba(144, 215, 146, 0.05) 0%, transparent 70%)' }} />

      {/* Floating Quick View Card (Docked Bottom) */}
      <Box sx={{
        position: 'absolute', bottom: { xs: 24, md: 48 }, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 'sm', px: 2, zIndex: 40
      }}>
        <Box sx={{
          bgcolor: 'rgba(17, 20, 22, 0.95)', backdropFilter: 'blur(24px)',
          borderRadius: '16px', py: 3, px: 3, display: 'flex', flexDirection: 'column', gap: 2.5,
          border: `1px solid rgba(144, 215, 146, 0.15)`, boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
        }}>

          {/* Header Row */}
          <Box sx={{ display: 'flex', gap: 2.5 }}>
            <Box sx={{ width: 72, height: 72, minWidth: 72, bgcolor: colors.surfaceContainerHighest, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', border: `1px solid ${colors.outlineVariant}`, overflow: 'hidden' }}>
              <img src={asset['asset-image'] || 'https://firebasestorage.googleapis.com/v0/b/ignitionswitch-3d71b.firebasestorage.app/o/assets%2Fe6edcbbc-9091-4302-ad88-2165a5e3287f?alt=media'} alt={asset['asset-name']} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
              <Box sx={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, bgcolor: isOn ? colors.primary : colors.deactivated, borderRadius: '50%', boxShadow: isOn ? `0 0 12px ${colors.primary}` : 'none' }} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, overflow: 'hidden' }}>
              <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: fontHeadline, letterSpacing: '-0.05em', color: colors.onSurface, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{asset['asset-name']}</Typography>
              <Typography sx={{ fontSize: 11, fontFamily: fontLabel, letterSpacing: '0.2em', color: colors.onSurfaceVariant }}>VIN: {asset['vin-serial']}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                <Chip label={isOn ? "Switch Activated" : "Switch Deactivated"} size="small" sx={{ height: 22, fontSize: 10, fontWeight: 700, borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.1em', bgcolor: isOn ? colors.primaryContainer : colors.surfaceBright, color: isOn ? colors.primary : colors.onSurfaceVariant, border: `1px solid ${isOn ? 'rgba(144, 215, 146, 0.2)' : colors.outlineVariant}` }} />
                <Typography sx={{ fontSize: 10, fontFamily: fontLabel, color: 'rgba(166, 172, 178, 0.7)', textTransform: 'uppercase' }}>Route: Default</Typography>
              </Box>
            </Box>
          </Box>

          {/* Stats Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, pt: 2, pb: 1, borderTop: `1px solid ${colors.outlineVariant}30` }}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography sx={{ fontSize: 10, fontFamily: fontLabel, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Battery</Typography>
              <Typography sx={{ fontSize: battery === 'Plugged In' ? 16 : 22, fontWeight: 700, fontFamily: fontHeadline, color: colors.primary }}>
                {battery}{typeof battery === 'number' ? '%' : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography sx={{ fontSize: 10, fontFamily: fontLabel, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Signal</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700, fontFamily: fontHeadline, color: colors.onSurface }}>
                {signal}{typeof signal === 'number' ? '%' : ''}
              </Typography>
            </Box>
          </Box>

          {/* Action Row */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              onClick={handleToggle}
              disabled={!isReady || isLoading}
              sx={{
                flex: 1,
                bgcolor: isOn ? colors.error : colors.primary,
                color: isOn ? '#fff' : colors.onPrimary,
                fontFamily: fontHeadline,
                fontWeight: 700,
                fontSize: 12,
                py: 1.5, borderRadius: '8px',
                '&:hover': { bgcolor: isOn ? '#d32f2f' : colors.primaryFixed },
                boxShadow: isOn ? '0 8px 32px rgba(238,125,119,0.15)' : '0 8px 32px rgba(144,215,146,0.15)',
                transition: 'all 0.2s ease-in-out',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                '&:active': { transform: 'scale(0.98)' }
              }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : (
                <>
                  <span className="material-symbols-outlined" style={{ marginRight: 8, fontSize: 20 }}>power_settings_new</span>
                  {isOn ? "DEACTIVATE SWITCH" : "ACTIVATE SWITCH"}
                </>
              )}
            </Button>
            <Button component="a" href={`https://maps.google.com/?q=${gpsLocation.lat},${gpsLocation.lng}`} target="_blank" sx={{ width: 54, height: 54, minWidth: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colors.surfaceContainerHighest, borderRadius: '8px', border: `1px solid ${colors.outlineVariant}50`, color: colors.onSurface, '&:hover': { bgcolor: colors.surfaceBright } }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>navigation</span>
            </Button>
          </Box>

        </Box>
      </Box>

    </Box>
  );
}
