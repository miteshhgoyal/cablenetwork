import React, { useState, useEffect } from "react";
import { X, Loader, Settings, AlertCircle, IndianRupee } from "lucide-react";
import api from "../services/api.js";

const CappingSettingsModal = ({ isOpen, onClose, onUpdate, cappingType }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [distributorCapping, setDistributorCapping] = useState("");
  const [resellerCapping, setResellerCapping] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchCappingSettings();
    }
  }, [isOpen]);

  const fetchCappingSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/capping");
      setDistributorCapping(response.data.data.distributorCapping);
      setResellerCapping(response.data.data.resellerCapping);
      setError("");
    } catch (error) {
      console.error("Failed to fetch capping settings:", error);
      setError("Failed to load capping settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const distCap = Number(distributorCapping);
    const resellerCap = Number(resellerCapping);

    if (isNaN(distCap) || distCap < 0) {
      setError("Distributor capping must be a non-negative number");
      return;
    }

    if (isNaN(resellerCap) || resellerCap < 0) {
      setError("Reseller capping must be a non-negative number");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put("/capping", {
        distributorCapping: distCap,
        resellerCapping: resellerCap,
      });

      alert("✅ Capping settings updated successfully!");
      onUpdate(response.data.data);
      onClose();
    } catch (error) {
      console.error("Update capping error:", error);
      setError(
        error.response?.data?.message || "Failed to update capping settings"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">
              Universal Capping Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">What is capping?</p>
                    <p>
                      Capping is the minimum balance that users must maintain.
                      They cannot perform transactions that would bring their
                      balance below this limit.
                    </p>
                  </div>
                </div>
              </div>

              {/* Distributor Capping */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Distributor Capping Amount
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <input
                    type="number"
                    value={distributorCapping}
                    onChange={(e) => setDistributorCapping(e.target.value)}
                    placeholder="Enter distributor capping amount"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Current: ₹{Number(distributorCapping).toLocaleString("en-IN")}
                </p>
              </div>

              {/* Reseller Capping */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reseller Capping Amount
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <input
                    type="number"
                    value={resellerCapping}
                    onChange={(e) => setResellerCapping(e.target.value)}
                    placeholder="Enter reseller capping amount"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    required
                    min="0"
                    step="100"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Current: ₹{Number(resellerCapping).toLocaleString("en-IN")}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Preview */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-emerald-900 mb-3">
                  Preview of Changes:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-700">
                      All Distributors minimum balance:
                    </span>
                    <span className="text-sm font-bold text-emerald-900">
                      ₹{Number(distributorCapping).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-emerald-700">
                      All Resellers minimum balance:
                    </span>
                    <span className="text-sm font-bold text-emerald-900">
                      ₹{Number(resellerCapping).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-4 py-3 rounded-xl transition-all font-semibold ${
                    submitting
                      ? "bg-gray-400 text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg"
                  }`}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center space-x-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </span>
                  ) : (
                    "Update Capping Settings"
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CappingSettingsModal;
