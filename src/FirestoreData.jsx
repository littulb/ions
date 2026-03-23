import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Grid,
  Card,
  CardMedia,
  CardContent,
  Typography,
  CircularProgress,
  Box,
  Pagination,
  Button,
  Divider,
} from "@mui/material";

const ASSETS_PER_PAGE = 6;

const FirestoreData = ({ onAssetSelect }) => {
  const [assets, setAssets] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "assets"),
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
  }, []);

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

  return (
    <Box>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {paginatedAssets.map((asset) => (
          <Grid item key={asset.id} xs={12} sm={6} md={4} lg={4}>
            <Card
              elevation={hovered === asset.id ? 8 : 2}
              onMouseEnter={() => setHovered(asset.id)}
              onMouseLeave={() => setHovered(null)}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: (theme) =>
                  theme.transitions.create(["box-shadow", "transform"], {
                    duration: theme.transitions.duration.short,
                  }),
                "&:hover": {
                  transform: "translateY(-4px)",
                },
                backgroundColor: 'rgba(18, 18, 18, 0.9)',
                color: 'white',
              }}
            >
              {asset["asset-image"] || asset.assetImage ? (
                  <CardMedia
                      component="img"
                      sx={{
                          height: 160,
                          width: 170,
                          margin: "0 auto",
                          objectFit: "cover",
                      }}
                      image={asset["asset-image"] || asset.assetImage}
                      alt={asset["asset-name"] || asset.assetName || "Unnamed Asset"}
                  />
               ) : (
                  <Box sx={{
                      height: 160,
                      backgroundColor: 'grey.900',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                  }}>
                      <Typography variant="h6" color="text.secondary">
                          Image
                      </Typography>
                  </Box>
               )}
              <CardContent sx={{ flexGrow: 1, paddingBottom: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {asset.id}
                </Typography>
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                  {asset["asset-license"] || asset.assetLicense || "N/A"}
                </Typography>
                <Typography variant="body1" sx={{ color: 'primary.main', mb: 2 }}>
                  {asset["asset-name"] || asset.assetName || "Unnamed Asset"}
                </Typography>
                <Divider sx={{ my: 1, backgroundColor: 'grey.700' }} />
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button 
                  variant="contained"
                  fullWidth
                  onClick={() => onAssetSelect(asset)}
                  sx={{
                    backgroundColor: 'white',
                    color: 'black',
                    '&:hover': {
                      backgroundColor: 'grey.300',
                    }
                  }}
                >
                  View Details
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <Pagination
          count={Math.ceil(assets.length / ASSETS_PER_PAGE)}
          page={page}
          onChange={handleChangePage}
          color="primary"
          sx={{
            '& .MuiPaginationItem-root': {
              color: 'white',
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default FirestoreData;
