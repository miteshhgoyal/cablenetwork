// frontend/src/pages/subscribers/Subscribers.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import api from "../services/api.js";
import {
  Search,
  Filter,
  Loader,
  UserCheck,
  Eye,
  Edit2,
  Trash2,
  X,
  MapPin,
  Shield,
  CheckCircle,
} from "lucide-react";

const Subscribers = () => {
  const { user } = useAuth();
  const [subscribers, setSubscribers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resellerFilter, setResellerFilter] = useState("");
  const [filterOption, setFilterOption] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [renewDuration, setRenewDuration] = useState("30");

  const [formData, setFormData] = useState({
    subscriberName: "",
    macAddress: "",
    serialNumber: "",
    status: "Active",
    expiryDate: "",
    packages: [],
  });

  useEffect(() => {
    fetchSubscribers();
    fetchPackages();
    if (user.role !== "reseller") {
      fetchResellers();
    }
  }, [statusFilter, resellerFilter, filterOption]);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (resellerFilter) params.append("resellerId", resellerFilter);

      const response = await api.get(`/subscribers?${params.toString()}`);
      setSubscribers(response.data.data.subscribers);
    } catch (error) {
      console.error("Failed to fetch subscribers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResellers = async () => {
    try {
      const response = await api.get("/subscribers/resellers");
      setResellers(response.data.data.resellers);
    } catch (error) {
      console.error("Failed to fetch resellers:", error);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await api.get("/subscribers/packages");
      setPackages(response.data.data.packages);
    } catch (error) {
      console.error("Failed to fetch packages:", error);
    }
  };

  const handleViewDetails = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setShowViewModal(true);
  };

  const handleEdit = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setFormData({
      subscriberName: subscriber.subscriberName,
      macAddress: subscriber.macAddress,
      serialNumber: subscriber.serialNumber,
      status: subscriber.status,
      expiryDate: new Date(subscriber.expiryDate).toISOString().split("T")[0],
      packages: subscriber.packages?.map((pkg) => pkg._id) || [],
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setShowDeleteModal(true);
  };

  const handleActivateClick = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setShowActivateModal(true);
  };

  const handleRenewClick = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setRenewDuration("30"); // Default to 30 days
    setShowRenewModal(true);
  };

  const handleActivate = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/subscribers/${selectedSubscriber._id}/activate`, {
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      fetchSubscribers();
      setShowActivateModal(false);
      setSelectedSubscriber(null);
    } catch (error) {
      console.error("Activate error:", error);
      alert(error.response?.data?.message || "Activation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenew = async () => {
    setSubmitting(true);
    try {
      const durationDays = parseInt(renewDuration, 10);

      if (!durationDays || durationDays <= 0) {
        alert("Please enter a valid duration");
        setSubmitting(false);
        return;
      }

      await api.patch(`/subscribers/${selectedSubscriber._id}/renew`, {
        duration: durationDays, // Send duration in days
      });

      fetchSubscribers();
      setShowRenewModal(false);
      setSelectedSubscriber(null);
      setRenewDuration("30");
    } catch (error) {
      console.error("Renew error:", error);
      alert(error.response?.data?.message || "Renew failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/subscribers/${selectedSubscriber._id}`, formData);
      fetchSubscribers();
      setShowEditModal(false);
      setSelectedSubscriber(null);
    } catch (error) {
      console.error("Update error:", error);
      alert(error.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/subscribers/${selectedSubscriber._id}`);
      fetchSubscribers();
      setShowDeleteModal(false);
      setSelectedSubscriber(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.response?.data?.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubscribers = subscribers.filter((subscriber) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      subscriber.subscriberName.toLowerCase().includes(searchLower) ||
      subscriber.macAddress.toLowerCase().includes(searchLower) ||
      subscriber.serialNumber?.toLowerCase().includes(searchLower) ||
      subscriber.resellerId?.name.toLowerCase().includes(searchLower);

    if (!filterOption) return matchesSearch;

    const now = new Date();
    const expiry = new Date(subscriber.expiryDate);

    switch (filterOption) {
      case "active":
        return matchesSearch && expiry > now;
      case "expired":
        return matchesSearch && expiry < now;
      case "fresh":
        return matchesSearch && subscriber.status === "Fresh";
      default:
        return matchesSearch;
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "bg-green-50 text-green-700 border-green-200";
      case "Inactive":
        return "bg-red-50 text-red-700 border-red-200";
      case "Fresh":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Subscribers
                </h1>
                <p className="text-sm text-gray-600">
                  View and manage subscriber information with location tracking
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, MAC address, or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Fresh">Fresh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Filter
                  </label>
                  <select
                    value={filterOption}
                    onChange={(e) => setFilterOption(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="fresh">Fresh</option>
                  </select>
                </div>

                {user.role !== "reseller" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reseller
                    </label>
                    <select
                      value={resellerFilter}
                      onChange={(e) => setResellerFilter(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Resellers</option>
                      {resellers.map((reseller) => (
                        <option key={reseller._id} value={reseller._id}>
                          {reseller.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {(statusFilter || resellerFilter || filterOption) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setStatusFilter("");
                      setResellerFilter("");
                      setFilterOption("");
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Total Subscribers</p>
            <p className="text-2xl font-bold text-gray-900">
              {filteredSubscribers.length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {filteredSubscribers.filter((s) => s.status === "Active").length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Inactive</p>
            <p className="text-2xl font-bold text-red-600">
              {
                filteredSubscribers.filter((s) => s.status === "Inactive")
                  .length
              }
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">Fresh</p>
            <p className="text-2xl font-bold text-blue-600">
              {filteredSubscribers.filter((s) => s.status === "Fresh").length}
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      S.No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Subscriber
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      MAC Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                      Device
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <p className="text-gray-500">No subscribers found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((subscriber, index) => (
                      <tr
                        key={subscriber._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {subscriber.subscriberName}
                            </p>
                            <p className="text-xs text-gray-500">
                              Expires: {formatDate(subscriber.expiryDate)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                          {subscriber.macAddress}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                              subscriber.status
                            )}`}
                          >
                            {subscriber.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {subscriber.lastLocation &&
                          subscriber.lastLocation.coordinates[0] !== 0 ? (
                            <div className="flex items-start space-x-1">
                              <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                              <div>
                                <p className="text-xs font-mono text-gray-900">
                                  {subscriber.lastLocation.coordinates[1].toFixed(
                                    4
                                  )}
                                  ,{" "}
                                  {subscriber.lastLocation.coordinates[0].toFixed(
                                    4
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatDateTime(
                                    subscriber.lastLocation.timestamp
                                  )}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              No location
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {subscriber.deviceInfo &&
                          subscriber.deviceInfo.deviceModel ? (
                            <div className="flex items-start space-x-1">
                              <Shield
                                className={`w-4 h-4 mt-0.5 ${
                                  subscriber.deviceInfo.isRooted ||
                                  subscriber.deviceInfo.isVPNActive
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              />
                              <div>
                                <p className="text-xs font-medium text-gray-900">
                                  {subscriber.deviceInfo.deviceModel}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {subscriber.deviceInfo.osVersion}
                                </p>
                                {(subscriber.deviceInfo.isRooted ||
                                  subscriber.deviceInfo.isVPNActive) && (
                                  <p className="text-xs text-red-600 font-medium">
                                    {subscriber.deviceInfo.isRooted && "Rooted"}
                                    {subscriber.deviceInfo.isRooted &&
                                      subscriber.deviceInfo.isVPNActive &&
                                      " | "}
                                    {subscriber.deviceInfo.isVPNActive && "VPN"}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              No device info
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {(subscriber.status === "Inactive" ||
                              subscriber.status === "Fresh") && (
                              <button
                                onClick={() => handleActivateClick(subscriber)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                title="Activate Subscriber"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleViewDetails(subscriber)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(subscriber)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(subscriber)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRenewClick(subscriber)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="Renew Package"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODAL */}
      {showViewModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Subscriber Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Subscriber Name</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedSubscriber.subscriberName}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">MAC Address</p>
                  <p className="text-lg font-mono font-semibold text-gray-900">
                    {selectedSubscriber.macAddress}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Serial Number</p>
                  <p className="text-lg font-mono font-semibold text-gray-900">
                    {selectedSubscriber.serialNumber}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      selectedSubscriber.status
                    )}`}
                  >
                    {selectedSubscriber.status}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Expiry Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(selectedSubscriber.expiryDate)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-1">Reseller</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedSubscriber.resellerId?.name || "N/A"}
                  </p>
                </div>
              </div>

              {selectedSubscriber.packages &&
                selectedSubscriber.packages.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-gray-600 mb-2">Packages</p>
                    <div className="space-y-2">
                      {selectedSubscriber.packages.map((pkg, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white rounded-lg p-3"
                        >
                          <span className="font-medium text-gray-900">
                            {pkg.name}
                          </span>
                          <span className="text-sm text-gray-600">
                            ₹{pkg.cost} / {pkg.duration} days
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>

            <div className="px-6 py-4 bg-gray-50">
              <button
                onClick={() => setShowViewModal(false)}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Edit Subscriber
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subscriber Name *
                  </label>
                  <input
                    type="text"
                    value={formData.subscriberName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subscriberName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    MAC Address *
                  </label>
                  <input
                    type="text"
                    value={formData.macAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, macAddress: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Serial Number *
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        serialNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Fresh">Fresh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expiryDate: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Packages (Select Multiple) *
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-gray-200 rounded-xl p-4 bg-gray-50">
                  {packages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No packages available
                    </p>
                  ) : (
                    packages.map((pkg) => (
                      <label
                        key={pkg._id}
                        className="flex items-center space-x-3 p-3 hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-blue-200"
                      >
                        <input
                          type="checkbox"
                          checked={formData.packages.includes(pkg._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                packages: [...formData.packages, pkg._id],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                packages: formData.packages.filter(
                                  (id) => id !== pkg._id
                                ),
                              });
                            }
                          }}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-gray-900">
                            {pkg.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            (₹{pkg.cost} • {pkg.duration} days)
                          </span>
                        </div>
                        {formData.packages.includes(pkg._id) && (
                          <div className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded">
                            ✓ Selected
                          </div>
                        )}
                      </label>
                    ))
                  )}
                </div>
                {formData.packages.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2">
                    {formData.packages.length} package(s) selected
                  </p>
                )}
                {formData.packages.length === 0 && (
                  <p className="text-xs text-red-600 mt-2">
                    Please select at least one package
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || formData.packages.length === 0}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? "Updating..." : "Update Subscriber"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete Subscriber
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete "
                <span className="font-semibold">
                  {selectedSubscriber?.subscriberName}
                </span>
                "? This action cannot be undone.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 font-medium"
                >
                  {submitting ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedSubscriber(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVATE MODAL */}
      {showActivateModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Activate Subscriber
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to activate "
                <span className="font-semibold">
                  {selectedSubscriber?.subscriberName}
                </span>
                "? This will set the status to Active and extend expiry by 30
                days.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleActivate}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 font-medium"
                >
                  {submitting ? "Activating..." : "Activate"}
                </button>
                <button
                  onClick={() => {
                    setShowActivateModal(false);
                    setSelectedSubscriber(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENEW MODAL - FIXED */}
      {showRenewModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Renew Package
              </h2>

              <p className="text-gray-600 text-center mb-4">
                Renew package for{" "}
                <span className="font-semibold">
                  {selectedSubscriber.subscriberName}
                </span>
              </p>

              {/* Package Information */}
              <div className="mb-4 bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-2">Packages to Renew:</p>
                <div className="space-y-1">
                  {selectedSubscriber.packages?.map((pkg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="font-medium text-gray-900">
                        {pkg.name}
                      </span>
                      <span className="text-gray-600">₹{pkg.cost}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-900">Total Cost per Day:</span>
                    <span className="text-blue-600">
                      ₹
                      {selectedSubscriber.packages?.reduce(
                        (sum, pkg) => sum + pkg.cost,
                        0
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current Expiry */}
              <div className="mb-4 bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Current Expiry:</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(selectedSubscriber.expiryDate)}
                </p>
              </div>

              {/* Duration Input */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Renewal Duration (Days){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={renewDuration}
                  onChange={(e) => setRenewDuration(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter number of days"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the number of days to extend the subscription
                </p>
              </div>

              {/* Calculated Total */}
              {renewDuration && parseInt(renewDuration) > 0 && (
                <div className="mb-4 bg-green-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">Duration:</span>
                    <span className="font-semibold text-gray-900">
                      {renewDuration} days
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Total Amount:</span>
                    <span className="text-lg font-bold text-green-600">
                      ₹
                      {selectedSubscriber.packages?.reduce(
                        (sum, pkg) => sum + pkg.cost,
                        0
                      ) * parseInt(renewDuration || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRenew}
                  disabled={
                    submitting || !renewDuration || parseInt(renewDuration) <= 0
                  }
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? "Renewing..." : "Renew Package"}
                </button>
                <button
                  onClick={() => {
                    setShowRenewModal(false);
                    setSelectedSubscriber(null);
                    setRenewDuration("30");
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscribers;
