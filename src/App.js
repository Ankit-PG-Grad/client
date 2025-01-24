import React, { useState, useEffect } from "react";
import { useVisitorData } from "@fingerprintjs/fingerprintjs-pro-react";
// import {
//   startAuthentication,
//   platformAuthenticatorIsAvailable,
//   bufferToBase64URLString,
//   browserSupportsWebAuthn,
// } from "@simplewebauthn/browser";
import "./App.css";

// Fixed user credentials
const FIXED_USER = {
  email: "demo@example.com",
  password: "password123"
};

function App() {
  const [message, setMessage] = useState("");
  // const [isSupported, setIsSupported] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [savedDevices, setSavedDevices] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  const { isLoading: isFingerprintLoading, error, data, getData } = useVisitorData(
    { extendedResult: true },
    { immediate: true }
  );

  useEffect(() => {
    const loadSavedDevices = async () => {
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        try {
          const response = await fetch(`https://server-production-19e9.up.railway.app/api/devices/${userEmail}`);
          if (!response.ok) {
            throw new Error('Failed to fetch devices');
          }
          const devices = await response.json();
          setSavedDevices(Array.isArray(devices) ? devices : []);
        } catch (error) {
          console.error('Error loading devices:', error);
          setSavedDevices([]);
        }
      }
    };
    loadSavedDevices();
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (data && isAuthenticated) {
      const userEmail = localStorage.getItem('userEmail');
      if (!userEmail) return;

      const saveDevice = async () => {
        try {
          console.log('Current fingerprint data:', data); // Debug log

          const deviceData = {
            userEmail,
            visitorId: data.visitorId,
            browserName: data.browserName || 'Unknown',
            os: data.os || 'Unknown',
            device: data.device || 'Unknown',
            ip: data.ip || 'Unknown'
          };

          console.log('Saving device data:', deviceData); // Debug log

          const response = await fetch('https://server-production-19e9.up.railway.app/api/devices', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(deviceData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Server error:', errorData);
            throw new Error('Failed to save device');
          }

          // Refresh device list
          const devicesResponse = await fetch(`https://server-production-19e9.up.railway.app/api/devices/${userEmail}`);
          if (!devicesResponse.ok) {
            throw new Error('Failed to fetch updated devices');
          }
          const devices = await devicesResponse.json();
          console.log('Updated devices list:', devices);
          setSavedDevices(Array.isArray(devices) ? devices : []);
        } catch (error) {
          console.error('Error saving device:', error);
        }
      };

      saveDevice();
    }
  }, [data, isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Check against fixed user credentials first
      if (email === FIXED_USER.email && password === FIXED_USER.password) {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userEmail', email);
        
        // Load user's devices
        try {
          const devicesResponse = await fetch(`https://server-production-19e9.up.railway.app/api/devices/${email}`);
          if (!devicesResponse.ok) {
            throw new Error('Failed to fetch devices');
          }
          const devices = await devicesResponse.json();
          setSavedDevices(Array.isArray(devices) ? devices : []);
          setMessage("Login successful!");

          // Save current device if fingerprint data is available
          if (data) {
            const deviceData = {
              userEmail: email,
              visitorId: data.visitorId,
              browserName: data.browserName || 'Unknown',
              os: data.os || 'Unknown',
              device: data.device || 'Unknown',
              ip: data.ip || 'Unknown'
            };

            await fetch('https://server-production-19e9.up.railway.app/api/devices', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(deviceData),
            });

            // Refresh device list after adding new device
            const updatedDevicesResponse = await fetch(`https://server-production-19e9.up.railway.app/api/devices/${email}`);
            if (updatedDevicesResponse.ok) {
              const updatedDevices = await updatedDevicesResponse.json();
              setSavedDevices(Array.isArray(updatedDevices) ? updatedDevices : []);
            }
          }
        } catch (error) {
          console.error('Error handling devices:', error);
          // Still allow login even if device handling fails
          setMessage("Login successful, but there was an error loading devices.");
        }
      } else {
        setMessage("Invalid credentials. Please try again.");
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage("Error during login. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmail("");
    setPassword("");
    setMessage("");
    setSavedDevices([]);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
  };

  // PWA install prompt code
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
  };

  const InstallPrompt = () => {
    if (!showInstallPrompt) return null;
    
    return (
      <div className="install-prompt">
        <div className="install-prompt-content">
          <h2>Install Our App</h2>
          <p>Install this application on your device for quick and easy access.</p>
          <div className="button-group">
            <button onClick={handleInstallClick} className="auth-button primary">
              Install
            </button>
            <button 
              onClick={() => setShowInstallPrompt(false)} 
              className="auth-button secondary"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    );
  };

  const DeviceList = () => {
    if (savedDevices.length === 0) {
      return <p>No devices saved yet.</p>;
    }

    return (
      <div className="devices-container">
        <h2>Your Devices</h2>
        <div className="devices-grid">
          {savedDevices.map((device, index) => (
            <div key={device.visitorId} className="device-card">
              <div className="device-card-header">
                <h3>Device #{index + 1}</h3>
                <span className="device-timestamp">
                  {new Date(device.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="device-info">
                <div className="info-row">
                  <span className="info-label">Visitor ID:</span>
                  <span className="info-value">{device.visitorId}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Browser:</span>
                  <span className="info-value">{device.browserName}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">OS:</span>
                  <span className="info-value">{device.os}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Device:</span>
                  <span className="info-value">{device.device}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">IP:</span>
                  <span className="info-value">{device.ip}</span>
                </div>
              </div>
              <button 
                onClick={async () => {
                  const userEmail = localStorage.getItem('userEmail');
                  if (!userEmail) return;

                  try {
                    const response = await fetch(
                      `https://server-production-19e9.up.railway.app/api/devices/${userEmail}/${device.visitorId}`,
                      {
                        method: 'DELETE',
                      }
                    );

                    if (response.ok) {
                      // Refresh device list
                      const devicesResponse = await fetch(`https://server-production-19e9.up.railway.app/api/devices/${userEmail}`);
                      const devices = await devicesResponse.json();
                      setSavedDevices(devices);
                    }
                  } catch (error) {
                    console.error('Error deleting device:', error);
                  }
                }}
                className="auth-button secondary delete-device"
              >
                Remove Device
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleRefreshData = async () => {
    try {
      // First refresh fingerprint data
      await getData({ ignoreCache: true });
      
      // Then refresh MongoDB data
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail && data) {
        const deviceData = {
          userEmail,
          visitorId: data.visitorId,
          browserName: data.browserName || 'Unknown',
          os: data.os || 'Unknown',
          device: data.device || 'Unknown',
          ip: data.ip || 'Unknown'
        };

        const response = await fetch('https://server-production-19e9.up.railway.app/api/devices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(deviceData),
        });

        if (!response.ok) {
          throw new Error('Failed to update device');
        }

        const devicesResponse = await fetch(`https://server-production-19e9.up.railway.app/api/devices/${userEmail}`);
        if (!devicesResponse.ok) {
          throw new Error('Failed to fetch updated devices');
        }
        const devices = await devicesResponse.json();
        setSavedDevices(Array.isArray(devices) ? devices : []);
        setMessage("Device information updated successfully!");
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      setMessage("Error updating device information. Please try again.");
    }
  };

  if (isLoading || isFingerprintLoading) {
    return (
      <div className="App">
        <header className="App-header">
          <div className="auth-container">
            <h1>Loading...</h1>
            <p className="message">Getting device information...</p>
          </div>
        </header>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="App">
        <header className="App-header">
          <div className="auth-container">
            <h1>Login</h1>
            {(message || error) && (
              <p className={`message ${message?.includes("Invalid") || error ? "error" : ""}`}>
                {message || error?.message}
              </p>
            )}
            <form onSubmit={handleLogin} className="auth-form">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />
              <button type="submit" className="auth-button primary">
                Login
              </button>
            </form>
            <p className="hint">Use demo@example.com / password123</p>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <InstallPrompt />
      <header className="App-header">
        <div className="auth-container">
          <div className="header-with-logout">
            <h1>Device Information</h1>
            <button onClick={handleLogout} className="auth-button secondary">
              Logout
            </button>
          </div>
          {message && (
            <p className={`message ${message.includes("successful") ? "success" : "error"}`}>
              {message}
            </p>
          )}
          <div className="content">
            {data && (
              <>
                <div className="fingerprint-data">
                  <h3>Current Device</h3>
                  <div className="info-row">
                    <span className="info-label">Visitor ID:</span>
                    <span className="info-value">{data.visitorId}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Browser:</span>
                    <span className="info-value">{data.browserName}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">OS:</span>
                    <span className="info-value">{data.os}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Device:</span>
                    <span className="info-value">{data.device}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">IP:</span>
                    <span className="info-value">{data.ip}</span>
                  </div>
                </div>
                <button 
                  onClick={handleRefreshData} 
                  className="auth-button primary"
                >
                  Refresh Data
                </button>
              </>
            )}
            <DeviceList />
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
