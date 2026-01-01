import React, { useState, useEffect } from "react";
import {
  Tv,
  AlertCircle,
  Smartphone,
  Key,
  LogIn,
  X,
  RefreshCw,
  CheckCircle,
} from "lucide-react";

const Login = () => {
  const [partnerCode, setPartnerCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [deviceInfo, setDeviceInfo] = useState({
    macAddress: "cph2667_15.0.0.1300(ex01)",
    deviceName: "Samsung Galaxy S23",
    osName: "Android",
    osVersion: "15.0",
    appVersion: "1.0.0",
  });
  const [showCustomMacModal, setShowCustomMacModal] = useState(false);
  const [customMac, setCustomMac] = useState("");
  const [inactiveMessage, setInactiveMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDeviceInfo({
        macAddress: "cph2667_15.0.0.1300(ex01)",
        deviceName: "Samsung Galaxy S23",
        osName: "Android",
        osVersion: "15.0",
        appVersion: "1.0.0",
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (useCustomMac = false) => {
    setError("");
    const finalCode = partnerCode.trim() || "2001";

    if (useCustomMac && !customMac.trim()) {
      setError("Please enter custom MAC address");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setError("Invalid partner code or device inactive");
      setInactiveMessage(
        "Your subscription has expired. Use another active device MAC."
      );
    }, 2000);
  };

  const handleCustomMacLogin = () => {
    handleSubmit(true);
    setShowCustomMacModal(false);
  };

  const clearPartnerCode = () => setPartnerCode("");
  const clearCustomMac = () => setCustomMac("");

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-md mx-auto px-6 py-12">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-orange-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Tv className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Online IPTV Hub</h1>
          <p className="text-gray-400">
            Enter your partner code to access channels
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Device Info */}
        <div className="mb-8 p-5 bg-gray-800 border border-gray-700 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Smartphone className="w-5 h-5 text-orange-500" />
            <span className="font-semibold">This Device</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">MAC:</span>
              <span className="font-mono font-semibold">
                {deviceInfo.macAddress}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Device:</span>
              <span>{deviceInfo.deviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">OS:</span>
              <span>
                {deviceInfo.osName} {deviceInfo.osVersion}
              </span>
            </div>
          </div>
        </div>

        {/* Partner Code Input */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-300 mb-3">
            Partner Code
          </label>
          <div className="relative">
            <Key className="w-5 h-5 text-orange-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              placeholder="Enter partner code"
              className="w-full pl-12 pr-12 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit(false)}
            />
            {partnerCode && (
              <button
                onClick={clearPartnerCode}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={isLoading}
          className={`w-full py-4 px-6 rounded-xl font-semibold text-lg mb-6 transition-all ${
            isLoading
              ? "bg-gray-700 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600 active:scale-[0.98]"
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
              Verifying...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5 inline mr-2" />
              Access Channels
            </>
          )}
        </button>

        {/* Custom MAC Button */}
        <button
          onClick={() => setShowCustomMacModal(true)}
          disabled={isLoading}
          className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl hover:border-orange-500 hover:bg-gray-750 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold">Custom MAC Login</p>
              <p className="text-gray-400 text-sm">
                Login with another device MAC
              </p>
            </div>
          </div>
        </button>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-8">
          Contact admin for activation | v{deviceInfo.appVersion}
        </p>
      </div>

      {/* Custom MAC Modal */}
      {showCustomMacModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-500/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Custom MAC Login</h2>
              <p className="text-gray-400">Enter active device MAC address</p>
            </div>

            {inactiveMessage && (
              <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-xl">
                <p className="text-yellow-300 text-sm">{inactiveMessage}</p>
              </div>
            )}

            <div className="mb-6 p-4 bg-gray-800 rounded-xl">
              <p className="text-gray-400 text-xs mb-2">Your MAC:</p>
              <p className="font-mono font-bold">{deviceInfo.macAddress}</p>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-300 mb-3">
                Active MAC Address
              </label>
              <div className="relative">
                <Key className="w-5 h-5 text-orange-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customMac}
                  onChange={(e) => setCustomMac(e.target.value)}
                  placeholder="Enter active MAC"
                  className="w-full pl-12 pr-12 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white font-mono placeholder-gray-500 focus:border-orange-500"
                />
                {customMac && (
                  <button
                    onClick={clearCustomMac}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCustomMacLogin}
                disabled={isLoading || !customMac.trim()}
                className={`w-full py-4 px-6 rounded-xl font-semibold ${
                  !customMac.trim() || isLoading
                    ? "bg-gray-700 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600"
                }`}
              >
                Login with Custom MAC
              </button>
              <button
                onClick={() => {
                  setShowCustomMacModal(false);
                  setCustomMac("");
                }}
                className="w-full py-4 px-6 rounded-xl border border-gray-700 bg-transparent hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
