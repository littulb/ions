import React, { useState, useEffect, useCallback } from 'react';

const DEVICE_ID = import.meta.env.VITE_DEVICE_ID;
const ACCESS_TOKEN = import.meta.env.VITE_ACCESS_TOKEN;

const FUNCTION_NAME = 'ignitionSwitch';
const FUNCTION_API_URL = `https://api.particle.io/v1/devices/${DEVICE_ID}/${FUNCTION_NAME}`;

const VARIABLE_NAME = 'ignitionStatus'; 
const STATUS_API_URL = `https://api.particle.io/v1/devices/${DEVICE_ID}/${VARIABLE_NAME}`;

const DEVICE_API_URL = `https://api.particle.io/v1/devices/${DEVICE_ID}`;

const MAX_RETRIES = 3;
const DELAY_MS = 1000;

const useParticleSwitch = () => {
  const [isReady, setIsReady] = useState(false);
  const [status, setStatus] = useState('off');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('Initializing...');
  const [deviceName, setDeviceName] = useState('Loading...');

  const fetchInitialData = useCallback(async () => {
    setMessage('Connecting to Particle Cloud...');
    const authHeaders = { 'Authorization': `Bearer ${ACCESS_TOKEN}` };

    try {
      const nameResponse = await fetch(DEVICE_API_URL, { method: 'GET', headers: authHeaders });
      const nameData = await nameResponse.json().catch(() => ({}));
      
      if (nameResponse.ok && nameData.name) {
          setDeviceName(nameData.name);
          setMessage(`Device found: ${nameData.name}. Reading status...`);
      } else {
          setDeviceName('Name Unavailable');
          const nameErrorDetail = nameData.error_description || `HTTP ${nameResponse.status}`;
          setMessage(`Warning: Could not fetch device name (${nameErrorDetail}). Reading status...`);
      }

      const statusResponse = await fetch(STATUS_API_URL, { method: 'GET', headers: authHeaders });
      const statusData = await statusResponse.json().catch(() => ({})); 

      if (statusResponse.ok && statusData.result !== undefined) {
        const currentStatus = (statusData.result === 1 || statusData.result === 'on' || statusData.result === true || statusData.result === 'ON') ? 'on' : 'off';
        setStatus(currentStatus);
        setMessage(`Ready. Initial state found: ${currentStatus.toUpperCase()} (Value: ${statusData.result})`);
      } else {
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
  }, []);

  useEffect(() => {
    if (!ACCESS_TOKEN || ACCESS_TOKEN.includes('PASTE_YOUR_NEW_ACCESS_TOKEN_HERE')) {
        setMessage("Configuration Error: Please create a .env file and add your VITE_DEVICE_ID and VITE_ACCESS_TOKEN.");
        setIsReady(false);
    } else {
        fetchInitialData();
    }
  }, [fetchInitialData]);

  const executeCall = useCallback(async (command, attempt = 0) => {
    if (!isReady) return false;
    
    const nextStatus = command.toLowerCase() === 'on' ? 'on' : 'off';
    
    try {
      const payload = new URLSearchParams({ 'arg': nextStatus }).toString();
      setMessage(`Attempt ${attempt + 1}: Sending '${nextStatus}' to ${FUNCTION_NAME}...`);

      const response = await fetch(FUNCTION_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: payload
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
            errorMsg += 'Could not parse detailed API response.';
        }
        throw new Error(errorMsg);
      }
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = DELAY_MS * Math.pow(2, attempt);
        setMessage(`RETRYING (${attempt + 1}/${MAX_RETRIES}): ${error.message}. Next attempt in ${delay / 1000}s.`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeCall(command, attempt + 1);
      } else {
        console.error('Final API call failed after multiple retries.', error);
        setMessage(`FINAL FAILURE: ${error.message}`);
        return false;
      }
    }
  }, [isReady]);

  const handleToggle = async () => {
    if (!isReady || isLoading) return;
    setIsLoading(true);
    const nextCommand = status === 'on' ? 'off' : 'on';
    await executeCall(nextCommand);
    setIsLoading(false);
  };

  return { status, isLoading, message, isReady, handleToggle, deviceName };
};

const App = () => {
  const { status, isLoading, message, isReady, handleToggle, deviceName } = useParticleSwitch();
  
  const buttonText = status === 'on' ? 'POWER OFF' : 'POWER ON';
  const buttonColor = status === 'on' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';
  const indicatorColor = status === 'on' ? 'bg-green-400' : 'bg-red-400';
  
  const isError = message.includes('[HTTP 4') || message.includes('[HTTP 5') || message.includes('FAILURE') || message.includes('Error');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 bg-grid-slate-800/50">
      <div className="w-full max-w-sm bg-slate-800/60 backdrop-blur-sm rounded-3xl shadow-2xl shadow-cyan-500/10 border border-slate-700">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">
              Ignition
            </h1>
            <p className="text-lg font-semibold text-slate-300">
                {deviceName}
            </p>
            <p className="text-xs text-slate-500 font-mono">
              {DEVICE_ID}
            </p>
          </div>

          <div className="flex justify-center items-center space-x-4 mb-10">
            <div className={`w-5 h-5 rounded-full shadow-lg ${indicatorColor} shadow-${status === 'on' ? 'green' : 'red'}-500/50`}></div>
            <p className="text-xl font-bold text-slate-300">
              Status: 
              <span className={`ml-2 font-extrabold ${status === 'on' ? 'text-green-400' : 'text-red-400'} uppercase`}>
                {status}
              </span>
            </p>
          </div>

          <button
            onClick={handleToggle}
            disabled={!isReady || isLoading}
            className={`w-full py-5 px-6 text-2xl font-bold text-white transition-all duration-300 rounded-2xl shadow-lg 
                        ${!isReady || isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-98'}
                        ${status === 'on' ? 'bg-gradient-to-br from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-red-500/30' : 'bg-gradient-to-br from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 shadow-green-500/30'}
                        flex items-center justify-center space-x-3`}
          >
            {isLoading ? (
              <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <>
                {status === 'on' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" x2="12" y1="2" y2="12"></line></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path><path d="M12 2v10"></path></svg>
                )}
                <span>{isLoading ? 'SENDING...' : buttonText}</span>
              </>
            )}
          </button>
        </div>
        
        <div className="bg-slate-900/50 rounded-b-3xl px-6 py-4 border-t border-slate-700">
            <p className="text-xs font-mono text-slate-400 break-words leading-relaxed">
              <span className={`font-bold ${isError ? 'text-red-400' : 'text-cyan-400'}`}>LOG: </span> 
              {message}
            </p>
        </div>
      </div>
    </div>
  );
};

export default App;
