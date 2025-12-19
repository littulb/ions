import React, { useState, useEffect, useCallback } from 'react';

// --- CONFIGURATION ---
const DEVICE_ID = 'e00fce68edbf13517f31b1be'; 
const ACCESS_TOKEN = '60663cf66a5f00faedc01094f3ad1aafd26edab3'; 

// Remote Function (for writing/commanding the state)
const FUNCTION_NAME = 'ignitionSwitch';
const FUNCTION_API_URL = `https://api.particle.io/v1/devices/${DEVICE_ID}/${FUNCTION_NAME}`;

// Remote Variable (for reading the state)
// !! IMPORTANT: Ensure this name exactly matches the name used in Particle.variable() in your Boron firmware. !!
const VARIABLE_NAME = 'ignitionStatus'; 
const STATUS_API_URL = `https://api.particle.io/v1/devices/${DEVICE_ID}/${VARIABLE_NAME}`;

// General Device Metadata API URL (for fetching the device name)
const DEVICE_API_URL = `https://api.particle.io/v1/devices/${DEVICE_ID}`;
// ---------------------

// Helper for exponential backoff retry logic
const MAX_RETRIES = 3;
const DELAY_MS = 1000;

/**
 * Custom hook to manage the remote function call and state.
 */
const useParticleSwitch = () => {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState('off'); // Tracks the desired state
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Initializing...');
  const [deviceName, setDeviceName] = useState('Loading...'); // New state for device name

  /**
   * Fetches the device name and the current status variable on load.
   */
  const fetchInitialData = useCallback(async () => {
    setMessage('Connecting to Particle Cloud...');
    
    // Authorization headers for all requests
    const authHeaders = { 'Authorization': `Bearer ${ACCESS_TOKEN}` };

    try {
      // 1. Fetch Device Metadata (Name)
      const nameResponse = await fetch(DEVICE_API_URL, { method: 'GET', headers: authHeaders });
      const nameData = await nameResponse.json().catch(() => ({}));
      
      if (nameResponse.ok && nameData.name) {
          setDeviceName(nameData.name);
          setMessage(`Device found: ${nameData.name}. Reading status...`);
      } else {
          setDeviceName('Name Unavailable');
          // Update message based on potential failure during name fetch
          const nameErrorDetail = nameData.error_description || `HTTP ${nameResponse.status}`;
          setMessage(`Warning: Could not fetch device name (${nameErrorDetail}). Reading status...`);
      }

      // 2. Fetch Status Variable
      const statusResponse = await fetch(STATUS_API_URL, { method: 'GET', headers: authHeaders });
      const statusData = await statusResponse.json().catch(() => ({})); 

      if (statusResponse.ok && statusData.result !== undefined) {
        // Check for common return values (1/0, 'on'/'off', true/false)
        const currentStatus = (
            statusData.result === 1 || 
            statusData.result === 'on' || 
            statusData.result === true || 
            statusData.result === 'ON'
        ) ? 'on' : 'off';

        setStatus(currentStatus);
        setMessage(`Ready. Initial state found: ${currentStatus.toUpperCase()} (Value: ${statusData.result})`);
      } else {
        // Status variable read error (Likely a 404 if the variable name is wrong)
        const statusErrorDetail = statusData.error_description || `HTTP ${statusResponse.status}`;
        setMessage(`Error reading initial state (${statusErrorDetail}). Please check if '${VARIABLE_NAME}' is the correct variable name in your Boron firmware.`);
        setStatus('off');
      }
    } catch (error) {
      setMessage(`Network error during connection. Defaulting to OFF.`);
      setDeviceName('Connection Failed');
      setStatus('off');
    } finally {
        setIsReady(true);
    }
  }, [ACCESS_TOKEN, DEVICE_ID]);

  // Effect to perform initial readiness check and data fetch
  useEffect(() => {
    if (ACCESS_TOKEN.includes('PASTE_YOUR_NEW_ACCESS_TOKEN_HERE')) {
        setMessage("Configuration Error: Please update ACCESS_TOKEN with a newly generated token.");
        setIsReady(false);
    } else {
        fetchInitialData(); // Call status check on mount
    }
  }, [fetchInitialData]);

  /**
   * Performs the API call with retry logic to execute the function.
   * (This remains unchanged as it handles the toggle command)
   */
  const executeCall = useCallback(async (command, attempt = 0) => {
    if (!isReady) return false;
    
    const nextStatus = command.toLowerCase() === 'on' ? 'on' : 'off';
    
    try {
      // 1. Construct the payload
      const payload = new URLSearchParams({ 'arg': nextStatus }).toString();

      // Update message with details before the call
      setMessage(`Attempt ${attempt + 1}: Sending '${nextStatus}' to ${FUNCTION_NAME}...`);

      // 2. Perform the POST request
      const response = await fetch(FUNCTION_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
      });

      // Try to parse JSON data regardless of response.ok
      const data = await response.json().catch(() => ({})); 

      if (response.ok) {
        if (data.return_value !== undefined && data.return_value !== -1) {
          // Success: Boron's function executed
          setStatus(nextStatus);
          setMessage(`[HTTP 200 OK] Success! Boron set to '${nextStatus}'. Return value: ${data.return_value}`);
          return true;
        } else {
          // Success status but function returned -1 (error in firmware)
          setMessage(`[HTTP 200 OK] Function returned error (-1). Check Boron serial console for details.`);
          return false;
        }
      } else {
        // HTTP Error (4xx, 5xx)
        let errorMsg = `[HTTP ${response.status}] ${response.statusText}. `;

        if (data.error_description) {
            // Particle specific error description (e.g., if token is invalid)
            errorMsg += `API Error: ${data.error_description}`;
        } else if (data.error) {
             // General JSON error body
            errorMsg += `API Error: ${data.error}`;
        } else {
            errorMsg += 'Could not parse detailed API response.';
        }
        
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = DELAY_MS * Math.pow(2, attempt);
        // Log the error message to the UI
        setMessage(`RETRYING (${attempt + 1}/${MAX_RETRIES}): ${error.message}. Next attempt in ${delay / 1000}s.`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeCall(command, attempt + 1); // Retry with increasing delay
      } else {
        console.error('Final API call failed after multiple retries.', error);
        // Display the final error message in the UI
        setMessage(`FINAL FAILURE: ${error.message}`);
        return false;
      }
    }
  }, [isReady, ACCESS_TOKEN, FUNCTION_API_URL]);

  /**
   * Toggles the state and triggers the remote function call.
   */
  const handleToggle = async () => {
    if (!isReady || isLoading) return;

    setIsLoading(true);
    
    // Determine the next state
    const nextCommand = status === 'on' ? 'off' : 'on';
    
    const success = await executeCall(nextCommand);
    
    // If successful, the state and message are already updated in executeCall.
    // If not successful, the message is updated to FINAL FAILURE inside executeCall.

    setIsLoading(false);
  };

  return { status, isLoading, message, isReady, handleToggle, deviceName };
};

/**
 * Main application component.
 */
const App = () => {
  const { status, isLoading, message, isReady, handleToggle, deviceName } = useParticleSwitch();
  
  const buttonText = status === 'on' ? 'POWER OFF' : 'POWER ON'; // Swapped for better UX
  const isError = message.includes('[HTTP 4') || message.includes('[HTTP 5') || message.includes('FAILURE') || message.includes('Error');

  // Material Design inspired colors and states
  const colors = {
    primary: status === 'on' ? '#1B5E20' : '#B71C1C', // Deep Green / Deep Red
    onPrimary: '#FFFFFF',
    surface: '#FFFFFF',
    background: '#F5F5F5',
    outline: '#E0E0E0',
    success: '#4CAF50',
    error: '#D32F2F',
    text: '#212121',
    secondaryText: '#757575',
  };

  return (
    <>
      <style>
        {`
          /* Global Font */
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
          body {
            font-family: 'Roboto', sans-serif;
            margin: 0;
            background-color: ${colors.background};
          }

          /* Material Card Styles */
          .material-card {
            background-color: ${colors.surface};
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); /* Elevation 3 */
            padding: 32px;
            width: 100%;
            max-width: 440px;
            border: 1px solid ${colors.outline};
          }

          /* Material Button Styles */
          .material-button {
            color: ${colors.onPrimary};
            background-color: ${colors.primary};
            border: none;
            border-radius: 28px; /* High radius for Pill shape, M3 style */
            padding: 16px 24px;
            font-size: 1.25rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15); /* Low elevation */
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
          }
          
          .material-button:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.25); /* Higher elevation on hover */
            opacity: 0.95;
          }

          .material-button:active {
            transform: scale(0.98); /* Simulate ripple/press */
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); /* Lowers shadow on press */
          }

          .material-button:disabled {
            background-color: ${colors.secondaryText};
            color: #E0E0E0;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
          }

          /* Status Indicator */
          .status-indicator {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
            transition: background-color 0.3s;
          }

          /* Typography */
          .headline {
            font-size: 2rem;
            font-weight: 700;
            color: ${colors.text};
            margin-bottom: 8px;
          }
          .title {
            font-size: 1.5rem;
            font-weight: 500;
            color: ${colors.secondaryText};
            margin-bottom: 4px;
          }
          .label {
            font-size: 0.75rem;
            font-weight: 400;
            color: ${colors.secondaryText};
          }
          .log-box {
            background-color: #EEEEEE; /* Light background for code/logs */
            border-radius: 8px;
            padding: 16px;
            font-size: 0.85rem;
            font-family: monospace;
          }
        `}
      </style>

      <div style={{ minHeight: '100vh', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <div className="material-card">
          
          <h1 className="headline" style={{textAlign: 'center'}}>
            Boron Remote Ignition Switch
          </h1>
          
          {/* Device Name Display */}
          <p className="title" style={{textAlign: 'center', color: colors.text}}>
              {deviceName}
          </p>
          
          {/* Device ID Display */}
          <p className="label" style={{textAlign: 'center', marginBottom: '32px'}}>
            Device ID: <code style={{ backgroundColor: '#F0F0F0', padding: '2px 4px', borderRadius: '4px', color: colors.secondaryText}}>{DEVICE_ID}</code>
          </p>

          {/* Status Display */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', gap: '16px' }}>
            <div 
                className="status-indicator" 
                style={{ backgroundColor: status === 'on' ? colors.success : colors.error }}
            ></div>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: colors.secondaryText }}>
              Current Remote Status: 
              <span style={{ marginLeft: '8px', color: status === 'on' ? colors.success : colors.error, textTransform: 'uppercase' }}>
                {status}
              </span>
            </p>
          </div>

          {/* Control Button */}
          <button
            onClick={handleToggle}
            disabled={!isReady || isLoading}
            className="material-button"
            style={{ 
                backgroundColor: colors.primary, // Use the dynamically calculated color
                color: colors.onPrimary,
                marginBottom: '24px',
                pointerEvents: (!isReady || isLoading) ? 'none' : 'auto'
            }}
          >
            {isLoading ? (
              <svg className="animate-spin" style={{ marginRight: '12px', height: '20px', width: '20px', animation: 'spin 1s linear infinite' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                {/* Keyframe for spin animation needed for standard CSS, Tailwind normally handles this */}
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </svg>
            ) : (
              <>
                {status === 'on' ? (
                  // Power Off Icon (Lucide: PowerOff)
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" x2="12" y1="2" y2="12"></line></svg>
                ) : (
                  // Power On Icon (Lucide: Power)
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path><path d="M12 2v10"></path></svg>
                )}
                <span>{isLoading ? 'WORKING...' : buttonText}</span>
              </>
            )}
          </button>

          {/* Message Log */}
          <div className="log-box" style={{ border: isError ? `1px solid ${colors.error}` : `1px solid ${colors.outline}` }}>
            <p style={{ fontWeight: 500, color: colors.text, marginBottom: '4px' }}>Log:</p>
            <p style={{ color: isError ? colors.error : colors.secondaryText }}>{message}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;

