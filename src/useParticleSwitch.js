import { useState, useEffect, useCallback, useMemo } from 'react';

// --- CONFIGURATION ---
const ACCESS_TOKEN = "b41c40940d370527fc69d053c6138afbed9094c2";
const FUNCTION_NAME = "ignitionSwitch";
const LOCATION_FUNCTION_NAME = "getLocation";
const VARIABLE_NAME = "ignitionStatus";
const EVENT_NAME_GPS_TELEMETRY = "gps-telemetry";
const EVENT_NAME_WATCHDOG_STATUS = "WATCHDOG_STATS";
const MAX_RETRIES = 3;
const DELAY_MS = 1000;

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

  const { DEVICE_API_URL, STATUS_API_URL, FUNCTION_API_URL, DEVICE_VITALS_API_URL } = useMemo(() => {
    const FUNCTION_API_URL = `https://api.particle.io/v1/devices/${deviceId}/${FUNCTION_NAME}`;
    const STATUS_API_URL = `https://api.particle.io/v1/devices/${deviceId}/${VARIABLE_NAME}`;
    const DEVICE_API_URL = `https://api.particle.io/v1/devices/${deviceId}`;
    // const DEVICE_VITALS_API_URL = `https://api.particle.io/v1/diagnostics/${deviceId}/last`;
    const DEVICE_VITALS_API_URL = `https://api.particle.io/v1/diagnostics/${deviceId}/update`;
    return { DEVICE_API_URL, STATUS_API_URL, FUNCTION_API_URL, DEVICE_VITALS_API_URL };
  }, [deviceId]);

  const fetchInitialData = useCallback(async () => {
    setMessage("Connecting to Particle Cloud...");
    const authHeaders = { Authorization: `Bearer ${ACCESS_TOKEN}` };

    try {
      const nameResponse = await fetch(DEVICE_API_URL, { method: 'GET', headers: authHeaders, cache: 'no-store' });
      const nameData = await nameResponse.json().catch(() => ({}));

      if (nameResponse.ok && nameData.name) {
        setDeviceName(nameData.name);
      } else {
        setDeviceName("Name Unavailable");
      }

      const statusResponse = await fetch(STATUS_API_URL, { method: 'GET', headers: authHeaders, cache: 'no-store' });
      const statusData = await statusResponse.json().catch(() => ({}));

      if (statusResponse.ok && statusData.result !== undefined) {
        // Enforce Strict Logic: 1 = Activated, 0 = Deactivated
        const currentStatus = [1, "1", "on", "ON", true].includes(statusData.result) ? "on" : "off";
        setStatus(currentStatus);
        setMessage(`Ready.`);
      } else {
        setStatus("off");
      }

      // 1. FETCH LAST KNOWN VITALS FOR INSTANT UI RENDERING
      const lastVitalsUrl = `https://api.particle.io/v1/diagnostics/${deviceId}/last`;
      const vitalsResponse = await fetch(lastVitalsUrl, { method: 'GET', headers: authHeaders, cache: 'no-store' });
      const vitalsData = await vitalsResponse.json().catch(() => null);

      if (vitalsData?.diagnostics?.payload) {
        const battery = vitalsData.diagnostics.payload.device?.power?.battery || vitalsData.diagnostics.payload.power?.battery;
        const source = vitalsData.diagnostics.payload.device?.power?.source || vitalsData.diagnostics.payload.power?.source;
        const network = vitalsData.diagnostics.payload.device?.network || vitalsData.diagnostics.payload.network;

        if (battery && battery.charge && battery.charge.err === -210 && source === "USB host") {
          setBattery("Plugged In");
        } else if (battery && battery.charge && battery.charge.val !== undefined) {
          setBattery(Math.round(battery.charge.val));
        } else if (battery && battery.charge !== undefined && typeof battery.charge === 'number') {
          setBattery(Math.round(battery.charge));
        }

        if (network && network.signal && typeof network.signal.strength === 'number') {
          setSignal(network.signal.strength);
        }
      }

      // 2. ADD EVENT LISTENER TO PULL FRESH VITALS OVER-THE-AIR
      try {
        const DIAGNOSTICS_EVENT = "spark/device/diagnostics/update";
        setMessage(`Mission Start: Requesting fresh vitals for ${deviceId}...`);

        let eventSource;
        let timeoutId;

        const cleanup = () => {
          if (eventSource) eventSource.close();
          if (timeoutId) clearTimeout(timeoutId);
        };

        // Setup the EventSource Listener BEFORE triggering the update!
        const vitalsUrl = `https://api.particle.io/v1/devices/${deviceId}/events/${DIAGNOSTICS_EVENT}?access_token=${ACCESS_TOKEN}`;
        eventSource = new EventSource(vitalsUrl);

        // Increase timeout to 35s to comfortably accommodate Cellular Wake/Publish cycles.
        timeoutId = setTimeout(() => {
          setMessage("Vitals timeout. Device might be offline or sleeping.");
          cleanup();
        }, 35000);

        eventSource.addEventListener(DIAGNOSTICS_EVENT, (messageEvent) => {
          const eventData = JSON.parse(messageEvent.data);
          const vitals = JSON.parse(eventData.data);

          // clearTimeout(timeoutId);
          const battery = vitals?.device?.power?.battery || vitals?.power?.battery;
          const source = vitals?.device?.power?.source || vitals?.power?.source;
          const network = vitals?.device?.network || vitals?.network;


          if (battery && battery.charge && battery.charge.err === -210) {
            setBattery("Plugged In");
            setMessage("Power System: Stationary (USB Power)");
          } else if (battery && battery.charge && battery.charge.val !== undefined) {
            setBattery(Math.round(battery.charge.val));
            setMessage(`Battery Synced: ${battery.charge.val}%`);
          } else if (battery && battery.charge !== undefined && typeof battery.charge === 'number') {
            setBattery(Math.round(battery.charge));
            setMessage(`Battery Synced: ${Math.round(battery.charge)}%`);
          }

          if (network && network.signal && typeof network.signal.strength === 'number') {
            setSignal(network.signal.strength);
          }

          cleanup();
        });

        // Trigger the Update NOW (Action Phase)
        const triggerUrl = `https://api.particle.io/v1/diagnostics/${deviceId}/update`;
        const triggerResponse = await fetch(triggerUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`
          }
        });

        if (!triggerResponse.ok) {
          throw new Error('Cloud rejected diagnostics request.');
        }

        eventSource.onerror = () => {
          setMessage(`Vitals Stream Error.`);
          cleanup();
        };

      } catch (err) {
        setMessage(`Vitals request configuration error: ${err.message || err}`);
      }


    } catch (err) {
      setMessage(`Network error: ${err.message}`);
      setStatus("off");
    } finally {
      setIsReady(true);
    }
  }, [DEVICE_API_URL, STATUS_API_URL, DEVICE_VITALS_API_URL]);

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
      setMessage(`Device acknowledged. Listening for stream: ${EVENT_NAME_GPS_TELEMETRY}`);

      const privateEventSourceUrl = `https://api.particle.io/v1/devices/${deviceId}/events/${EVENT_NAME_GPS_TELEMETRY}?access_token=${ACCESS_TOKEN}`;
      eventSource = new EventSource(privateEventSourceUrl);

      timeoutId = setTimeout(() => {
        setMessage("GPS signal timeout. Check antenna or move to an open area.");
        cleanup();
      }, 35000);

      eventSource.addEventListener(EVENT_NAME_GPS_TELEMETRY, (messageEvent) => {
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
            if (onLocationUpdate) {
              onLocationUpdate({ lat, lng: lon });
            }
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

  return { status, isLoading, message, isReady, handleToggle, deviceName, gpsLocation, isGettingLocation, handleGetLocation, battery, signal };
}
