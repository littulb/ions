import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import useAuth from "./useAuth";
import {
  Grid,
  Card,
  Typography,
  CircularProgress,
  Box,
  Pagination,
  Button,
} from "@mui/material";

const ASSETS_PER_PAGE = 6;

const FirestoreData = ({ onAssetSelect }) => {
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [page, setPage] = useState(1);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  useEffect(() => {
    if (location.state?.reopenAsset && !loading && assets.length > 0) {
      const targetId = location.state.reopenAsset.id || location.state.reopenAsset['asset-id'];
      const targetAsset = assets.find(a => (a.id === targetId) || (a['asset-id'] === targetId)) || location.state.reopenAsset;
      onAssetSelect(targetAsset, location.state.restoredGps);
      navigate('.', { replace: true, state: {} });
    }
  }, [location.state, loading, assets, onAssetSelect, navigate]);

  useEffect(() => {
    if (!user) return;

    // Optional: Admins can see the whole fleet, regular users see only their assigned assets
    const q = role === 'admin' 
        ? collection(db, "assets") 
        : query(collection(db, "assets"), where("userId", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAssets(data);
        setLoading(false);
      },
      (error) => {
        setError(
          "Error fetching data from Firestore. Please check your security rules and ensure the 'assets' collection exists."
        );
        console.error("Firestore error: ", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, role]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  const paginatedAssets = assets.slice(
    (page - 1) * ASSETS_PER_PAGE,
    page * ASSETS_PER_PAGE
  );
  const fontHeadline = "'Space Grotesk', sans-serif";
  const fontBody = "'Inter', sans-serif";
  const colors = {
    primary: "#90d792",
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

  const gradientOverlay = 'linear-gradient(to top, rgba(12, 14, 16, 0.95) 0%, rgba(12, 14, 16, 0.4) 50%, transparent 100%)';

  return (
    <Box sx={{ fontFamily: fontBody, color: colors.onSurface }}>
      {/* Section Header */}
      <Box sx={{ mb: 6, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontFamily: fontHeadline, fontSize: { xs: 32, md: 40 }, fontWeight: 700, letterSpacing: '-0.02em', textTransform: 'uppercase', color: colors.onSurface, lineHeight: 1 }}>
            Asset Fleet
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {paginatedAssets.map((asset) => (
          <Grid key={asset.id} size={{ xs: 12, sm: 6, md: 6, lg: 4 }}>
            <Card
              elevation={0}
              onMouseEnter={() => setHovered(asset.id)}
              onMouseLeave={() => setHovered(null)}
              sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'stretch',
                position: 'relative',
                aspectRatio: '4/5',
                overflow: 'hidden',
                borderRadius: '12px',
                bgcolor: colors.surfaceContainer,
                transition: 'all 0.5s ease',
                cursor: 'pointer',
                border: hovered === asset.id ? `2px solid rgba(144, 215, 146, 0.3)` : `2px solid transparent`,
                boxShadow: hovered === asset.id ? '0 32px 64px rgba(0,0,0,0.5)' : 'none',
              }}
              onClick={() => onAssetSelect(asset)}
            >
              {/* Background Image */}
              {asset['asset-image'] || asset.assetImage ? (
                <Box
                  component="img"
                  src={asset['asset-image'] || asset.assetImage}
                  alt={asset['asset-name'] || asset.assetName || "Vehicle"}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.7s ease',
                    transform: hovered === asset.id ? 'scale(1.1)' : 'scale(1)',
                  }}
                />
              ) : (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: colors.surfaceContainerLowest }}>
                  <Typography sx={{ fontFamily: fontHeadline, color: colors.onSurfaceVariant }}>No Image Available</Typography>
                </Box>
              )}

              {/* Gradient Overlay */}
              <Box sx={{ position: 'absolute', inset: 0, background: gradientOverlay, pointerEvents: 'none' }} />

              {/* Content Panel (Bottom absolute) */}
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', p: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontFamily: fontHeadline, fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: colors.onSurface, textTransform: 'uppercase', lineHeight: 1.2, mb: 0.5 }}>
                      {asset['asset-name'] || asset.assetName || "UNIDENTIFIED ASSET"}
                    </Typography>
                    <Typography sx={{ fontFamily: fontHeadline, fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: colors.primary, textTransform: 'uppercase' }}>
                      {asset["asset-license"] || asset.assetLicense || "NO PLATES"}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  onClick={(e) => { e.stopPropagation(); onAssetSelect(asset); }}
                  fullWidth
                  sx={{
                    bgcolor: colors.surfaceContainerHighest,
                    border: `1px solid ${colors.outlineFaint}`,
                    color: colors.onSurface,
                    fontFamily: fontHeadline,
                    fontWeight: 700,
                    fontSize: 12,
                    py: 2,
                    mt: 1,
                    borderRadius: '6px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: colors.primary,
                      color: colors.onPrimary,
                      borderColor: 'transparent',
                    },
                    '&:active': { transform: 'scale(0.95)' }
                  }}
                >
                  VIEW DETAILS
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
        <Pagination
          count={Math.ceil(assets.length / ASSETS_PER_PAGE)}
          page={page}
          onChange={handleChangePage}
          color="primary"
          sx={{
            '& .MuiPaginationItem-root': {
              color: colors.onSurface,
              fontFamily: fontHeadline,
              fontWeight: 700,
              '&.Mui-selected': {
                bgcolor: colors.primary,
                color: colors.onPrimary,
              }
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default FirestoreData;
