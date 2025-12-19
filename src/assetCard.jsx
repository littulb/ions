import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Box,
  Container,
  Paper,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

// --- CONFIGURATION ---
const DEVICE_ID = "e00fce68edbf13517f31b1be";
const ACCESS_TOKEN = "60663cf66a5f00faedc01094f3ad1aafd26edab3";
const FUNCTION_NAME = "ignitionSwitch";
const VARIABLE_NAME = "ignitionStatus";
const FUNCTION_API_URL = `https://api.particle.io/v1/devices/${DEVICE_ID}/${FUNCTION_NAME}`;
const STATUS_API_URL = `https://api.particle.io/v1/devices/${DEVICE_ID}/${VARIABLE_NAME}`;
const DEVICE_API_URL = `https://api.particle.io/v1/devices/${DEVICE_ID}`;
const MAX_RETRIES = 3;
const DELAY_MS = 1000;

// --- HOOK --- //
const useParticleSwitch = () => {
    const [isReady, setIsReady] = useState(false);
    const [status, setStatus] = useState("off");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("Initializing...");
    const [deviceName, setDeviceName] = useState("Loading...");

    const fetchInitialData = useCallback(async () => {
        setMessage("Connecting to Particle Cloud...");
        const authHeaders = { Authorization: `Bearer ${ACCESS_TOKEN}` };

        try {
            const nameResponse = await fetch(DEVICE_API_URL, { method: 'GET', headers: authHeaders });
            const nameData = await nameResponse.json().catch(() => ({}));

            if (nameResponse.ok && nameData.name) {
                setDeviceName(nameData.name);
                setMessage(`Device found: ${nameData.name}. Reading status...`);
            } else {
                setDeviceName("Name Unavailable");
                const nameErrorDetail = nameData.error_description || `HTTP ${nameResponse.status}`;
                setMessage(`Warning: Could not fetch device name (${nameErrorDetail}). Reading status...`);
            }

            const statusResponse = await fetch(STATUS_API_URL, { method: 'GET', headers: authHeaders });
            const statusData = await statusResponse.json().catch(() => ({}));

            if (statusResponse.ok && statusData.result !== undefined) {
                const currentStatus = [1, "on", "ON", true].includes(statusData.result) ? "on" : "off";
                setStatus(currentStatus);
                setMessage(`Ready. Initial state found: ${currentStatus.toUpperCase()} (Value: ${statusData.result})`);
            } else {
                const statusErrorDetail = statusData.error_description || `HTTP ${statusResponse.status}`;
                setMessage(`Error reading initial state (${statusErrorDetail}). Please check if '${VARIABLE_NAME}' is the correct variable name in your Boron firmware.`);
                setStatus("off");
            }
        } catch (error) {
            setMessage(`Network error during connection. Defaulting to OFF.`);
            setDeviceName("Connection Failed");
            setStatus("off");
        } finally {
            setIsReady(true);
        }
    }, []);

    useEffect(() => {
        if (!ACCESS_TOKEN || ACCESS_TOKEN.includes("PASTE_YOUR")) {
            setMessage("Configuration Error: Particle ACCESS_TOKEN is missing.");
            setIsReady(false);
        } else {
            fetchInitialData();
        }
    }, [fetchInitialData]);

    const executeCall = useCallback(async (command, attempt = 0) => {
        if (!isReady) return false;

        const nextStatus = command.toLowerCase() === "on" ? "on" : "off";

        try {
            const payload = new URLSearchParams({ arg: nextStatus }).toString();

            setMessage(`Attempt ${attempt + 1}: Sending '${nextStatus}' to ${FUNCTION_NAME}...`);

            const response = await fetch(FUNCTION_API_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${ACCESS_TOKEN}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: payload,
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                if (data.return_value !== undefined && data.return_value !== -1) {
                    setStatus(nextStatus);
                    setMessage(`[HTTP 200 OK] Success! Boron set to '${nextStatus}'. Return value: ${data.return_value}`);
                    return true;
                } else {
                    setMessage(`[HTTP 200 OK] Function returned error (-1). Check Boron serial console for details.`);
                    return false;
                }
            } else {
                let errorMsg = `[HTTP ${response.status}] ${response.statusText}. `;

                if (data.error_description) {
                    errorMsg += `API Error: ${data.error_description}`;
                } else if (data.error) {
                    errorMsg += `API Error: ${data.error}`;
                } else {
                    errorMsg += "Could not parse detailed API response.";
                }

                throw new Error(errorMsg);
            }
        } catch (error) {
            if (attempt < MAX_RETRIES) {
                const delay = DELAY_MS * Math.pow(2, attempt);
                setMessage(`RETRYING (${attempt + 1}/${MAX_RETRIES}): ${error.message}. Next attempt in ${delay / 1000}s.`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return executeCall(command, attempt + 1);
            } else {
                console.error("Final API call failed after multiple retries.", error);
                setMessage(`FINAL FAILURE: ${error.message}`);
                return false;
            }
        }
    }, [isReady]);

    const handleToggle = async () => {
        if (!isReady || isLoading) return;

        setIsLoading(true);

        const nextCommand = status === "on" ? "off" : "on";

        await executeCall(nextCommand);

        setIsLoading(false);
    };

    return { status, isLoading, message, isReady, handleToggle, deviceName };
};

// --- COMPONENT --- //
const AssetCard = ({ asset }) => {
  const theme = useTheme();
  const { status, isLoading, message, isReady, handleToggle, deviceName } =
    useParticleSwitch();

  const buttonText = status === "on" ? "POWER OFF" : "POWER ON";
  const isError = message.toLowerCase().includes("error") || message.toLowerCase().includes("failed") || message.includes("FAILURE") ||  message.includes("Warning");

  const StatusIndicator = styled("div")({
    width: 16,
    height: 16,
    borderRadius: "50%",
    backgroundColor:
      status === "on"
        ? theme.palette.success.main
        : theme.palette.error.main,
    display: "inline-block",
    verticalAlign: "middle",
  });

  if (!asset) {
    return (
      <Container sx={{ mt: 4, textAlign: "center" }}>
        <Paper elevation={2} sx={{ p: 3 }}>
          <Typography variant="h6" color="text.secondary">
            Select an asset from the fleet to view its details and remote controls.
          </Typography>
        </Paper>
      </Container>
    );
  }

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    return timestamp.toDate().toLocaleString();
  };

  return (
    <Grid container justifyContent="center" sx={{ mt: 4 }}>
      <Grid item xs={12} md={10} lg={8}>
        <Card elevation={4}>
          <Grid container>
            <Grid item xs={12} md={6}>
                {asset.assetImage ? (
                    <CardMedia
                        component="img"
                        sx={{ height: '100%', objectFit: "cover" }}
                        image={asset.assetImage}
                        alt={asset["asset-name"]}
                    />
                 ) : (
                    <Box sx={{
                        height: '100%',
                        backgroundColor: 'grey.900',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Typography variant="h5" color="text.secondary">
                            Image
                        </Typography>
                    </Box>
                 )}
            </Grid>
            <Grid item xs={12} md={6}>
              <CardContent sx={{ p: 3 }}>
                <Typography gutterBottom variant="h4" component="div">
                  {asset["asset-name"]}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" color="text.secondary">
                    <strong>ID:</strong> {asset["asset-id"]}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    <strong>License:</strong> {asset["asset-license"]}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    <strong>VIN:</strong> {asset["asset-vin"]}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    <strong>Description:</strong> {asset["asset-description"]}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    <strong>Created At:</strong> {formatDate(asset["createdAt"])}
                  </Typography>
                </Box>

                <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                        <StatusIndicator />
                        <Typography variant="h6" sx={{ ml: 1.5 }}>
                            {deviceName}
                        </Typography>
                    </Box>
                     <Typography variant="body2" color="text.secondary">
                            Remote Status: {status.toUpperCase()}
                     </Typography>
                </Paper>
                
                <Box sx={{ mt: 2, position: 'relative' }}>
                  <Button
                    onClick={handleToggle}
                    disabled={!isReady || isLoading}
                    variant="contained"
                    color={status === "on" ? "error" : "success"}
                    size="large"
                    fullWidth
                  >
                    {buttonText}
                  </Button>
                  {isLoading && (
                    <CircularProgress
                      size={24}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ mt: 2, p: 1.5, border: `1px solid ${isError ? theme.palette.error.main : theme.palette.grey[800]}`, borderRadius: 1, minHeight: '5em', maxHeight: '10em', overflowY: 'auto' }}>
                  <Typography variant="body2" color={isError ? "error" : "text.secondary"}>
                    <strong>Log:</strong> {message}
                  </Typography>
                </Box>
              </CardContent>
            </Grid>
          </Grid>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AssetCard;
