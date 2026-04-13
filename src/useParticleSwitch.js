import { useState, useEffect, useCallback, useMemo } from 'react';

const ACCESS_TOKEN = "b41c40940d370527fc69d053c6138afbed9094c2";
const FUNCTION_NAME = "ignitionSwitch";
const VARIABLE_NAME = "ignitionStatus";
const EVENT_NAME_GPS_TELEMETRY = "gps-telemetry";

export default function useParticleSwitch(deviceId, initialGps = null, onLocationUpdate = null) {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState("off");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Initializing...");
  const [deviceName, setDeviceName] = useState("Loading...");
  const [gpsLocation, setGpsLocation] = useState(initialGps);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [battery, setBattery] = useState(null);
  const [signal, setSignal] = useState(null);

  const { DEVICE_API_URL, STATUS_API_URL, FUNCTION_API_URL } = useMemo(() => ({
    FUNCTION_API_URL: `https://api.particle.io/v1/devices/${deviceId}/${FUNCTION_NAME}`,
    STATUS_API_URL: `https://api.particle.io/v1/devices/${deviceId}/${VARIABLE_NAME}`,
    DEVICE_API_URL: `https://api.particle.io/v1/devices/${deviceId}`
  }), [deviceId]);

  // Helper to extract battery from various Particle payload formats
  const extractVitals = (payload) => {
    const batt = payload?.device?.power?.battery || payload?.power?.battery || payload?.battery;
    const pwrSource = payload?.device?.power?.source || payload?.power?.source || payload?.source;
    const net = payload?.device?.network || payload?.network;

    let batteryResult = null;
    if (batt?.charge?.err === -210 || pwrSource === "USB host") {
      batteryResult = "Plugged In";
    } else if (batt?.charge?.val !== undefined) {
      batteryResult = Math.round(batt.charge.val);
    } else if (typeof batt?.charge === 'number') {
      batteryResult = Math.round(batt.charge);
    }

    let signalResult = null;
    if (net?.signal?.strength !== undefined) {
      signalResult = Math.round(net.signal.strength);
    }

    return { batteryResult, signalResult };
  };

  const fetchInitialData = useCallback(async () => {
    const authHeaders = { Authorization: `Bearer ${ACCESS_TOKEN}` };
    try {
      // 1. Get Device Name & Basic Status
      const nameRes = await fetch(DEVICE_API_URL, { headers: authHeaders });
      const nameData = await nameRes.json();
      if (nameData.name) setDeviceName(nameData.name);

      const statusRes = await fetch(STATUS_API_URL, { headers: authHeaders });
      const statusData = await statusRes.json();
      if (statusRes.ok) setStatus([1, "1", "on", true].includes(statusData.result) ? "on" : "off");

      // 2. Fetch Last Known Vitals
      const lastVitalsUrl = `https://api.particle.io/v1/diagnostics/${deviceId}/last`;
      const vitalsRes = await fetch(lastVitalsUrl, { headers: authHeaders });
      const vitalsData = await vitalsRes.json();

      if (vitalsData?.diagnostics?.payload) {
        const { batteryResult, signalResult } = extractVitals(vitalsData.diagnostics.payload);
        if (batteryResult) setBattery(batteryResult);
        if (signalResult) setSignal(signalResult);
      }

      setMessage("Ready.");
    } catch (err) {
      setMessage(`Sync Error: ${err.message}`);
    } finally {
      setIsReady(true);
    }
  }, [DEVICE_API_URL, STATUS_API_URL, deviceId]);

  useEffect(() => {
    if (deviceId) fetchInitialData();
  }, [fetchInitialData, deviceId]);

  const handleToggle = async () => {
    setIsLoading(true);
    const nextCommand = status === "on" ? "off" : "on";
    try {
      const res = await fetch(FUNCTION_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ arg: nextCommand })
      });
      if (res.ok) setStatus(nextCommand);
    } catch (e) {
      setMessage("Toggle failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetLocation = useCallback(async () => {
    if (isGettingLocation) return;
    setIsGettingLocation(true);
    setMessage("Locating...");

    let es;
    let timeout;
    
    const cleanup = () => {
      if (es) es.close();
      if (timeout) clearTimeout(timeout);
      setIsGettingLocation(false);
    };

    // Trigger GPS Function
    try {
      const res = await fetch(`https://api.particle.io/v1/devices/${deviceId}/getLocation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ arg: '' })
      });
      
      if (!res.ok) {
        throw new Error("Failed to trigger GPS function");
      }

      // Listen for event
      es = new EventSource(`https://api.particle.io/v1/devices/${deviceId}/events/${EVENT_NAME_GPS_TELEMETRY}?access_token=${ACCESS_TOKEN}`);
      
      es.onerror = () => {
        setMessage("GPS Stream connection error.");
        cleanup();
      };
      
      es.addEventListener(EVENT_NAME_GPS_TELEMETRY, (e) => {
        try {
          const parsed = JSON.parse(e.data);
          const rawData = parsed.data || "";
          
          const parts = rawData.split(',');
          if (parts.length === 2) {
            const lat = parseFloat(parts[0]);
            const lng = parseFloat(parts[1]);
            if (!isNaN(lat) && !isNaN(lng)) {
              const loc = { lat, lng };
              setGpsLocation(loc);
              if (onLocationUpdate) onLocationUpdate(loc);
              setMessage("Location Refreshed.");
              cleanup();
            } else {
              setMessage("Received invalid coordinates.");
            }
          } else {
            setMessage("Searching for satellites...");
          }
        } catch(err) {
           setMessage("Telemetry parse error.");
        }
      });
      
      timeout = setTimeout(() => { 
        setMessage("GPS signal timeout. Check antenna location.");
        cleanup(); 
      }, 30000);
    } catch (e) {
      setMessage(`Locating failed: ${e.message}`);
      cleanup();
    }
  }, [deviceId, isGettingLocation, onLocationUpdate]);

  return { status, isLoading, message, isReady, handleToggle, deviceName, gpsLocation, isGettingLocation, handleGetLocation, battery, signal };
}