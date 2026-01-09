import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext.jsx";
import api from "../../services/api.js";
import {
  Search,
  Filter,
  Loader,
  UserCheck,
  Eye,
  Edit2,
  Trash2,
  X,
  Package as PackageIcon,
  Calendar,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

const Subscribers = () => {
  const { user } = useAuth();

  // Data states
  const [subscribers, setSubscribers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resellerFilter, setResellerFilter] = useState("");
  const [filterOption, setFilterOption] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Package extension states
  const [extendingPackageId, setExtendingPackageId] = useState(null);
  const [extensionDays, setExtensionDays] = useState("30");

  // Form data (only basic info now)
  const [formData, setFormData] = useState({
    subscriberName: "",
    macAddress: "",
    serialNumber: "",
  });

  // Fetch data on mount
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
      console.error("Failed to fetch subscribers", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchResellers = async () => {
    try {
      const response = await api.get("/subscribers/resellers");
      setResellers(response.data.data.resellers);
    } catch (error) {
      console.error("Failed to fetch resellers", error);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await api.get("/subscribers/packages");
      setPackages(response.data.data.packages);
    } catch (error) {
      console.error("Failed to fetch packages", error);
    }
  };

  // Modal handlers
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
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setShowDeleteModal(true);
  };

  const handlePackagesClick = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setExtendingPackageId(null);
    setExtensionDays("30");
    setShowPackagesModal(true);
  };

  // Update subscriber (basic info only)
  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/subscribers/${selectedSubscriber._id}`, formData);
      alert("Subscriber updated successfully!");
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

  // Delete subscriber
  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/subscribers/${selectedSubscriber._id}`);
      alert("Subscriber deleted successfully!");
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

  // Add package to subscriber
  const handleAddPackage = async (packageId) => {
    const days = parseInt(extensionDays) || 30;
    if (days <= 0) {
      alert("Please enter valid days");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(
        `/subscribers/${selectedSubscriber._id}/packages/add`,
        {
          packageId,
          days,
        }
      );

      const { chargedAmount, remainingBalance } = response.data;
      alert(
        `Package added successfully!\n` +
          `Charged: ₹${chargedAmount}\n` +
          `Remaining Balance: ₹${remainingBalance?.toFixed(2) || "N/A"}`
      );

      fetchSubscribers();
      // Refresh modal data
      const updatedSub = await api.get(
        `/subscribers/${selectedSubscriber._id}`
      );
      setSelectedSubscriber(updatedSub.data.data.subscriber);
      setExtensionDays("30");
    } catch (error) {
      console.error("Add package error:", error);
      alert(error.response?.data?.message || "Failed to add package");
    } finally {
      setSubmitting(false);
    }
  };

  // Extend package expiry
  const handleExtendPackage = async (packageId) => {
    const days = parseInt(extensionDays) || 30;
    if (days <= 0) {
      alert("Please enter valid days");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(
        `/subscribers/${selectedSubscriber._id}/packages/${packageId}/extend`,
        { days }
      );

      const { chargedAmount, remainingBalance } = response.data;
      alert(
        `Package extended successfully!\n` +
          `Charged: ₹${chargedAmount}\n` +
          `Remaining Balance: ₹${remainingBalance?.toFixed(2) || "N/A"}`
      );

      fetchSubscribers();
      // Refresh modal data
      const updatedSub = await api.get(
        `/subscribers/${selectedSubscriber._id}`
      );
      setSelectedSubscriber(updatedSub.data.data.subscriber);
      setExtendingPackageId(null);
      setExtensionDays("30");
    } catch (error) {
      console.error("Extend package error:", error);
      alert(error.response?.data?.message || "Failed to extend package");
    } finally {
      setSubmitting(false);
    }
  };

  // Remove package from subscriber
  const handleRemovePackage = async (packageId) => {
    if (!confirm("Are you sure you want to remove this package?")) return;

    setSubmitting(true);
    try {
      await api.delete(
        `/subscribers/${selectedSubscriber._id}/packages/${packageId}`
      );
      alert("Package removed successfully!");
      fetchSubscribers();
      // Refresh modal data
      const updatedSub = await api.get(
        `/subscribers/${selectedSubscriber._id}`
      );
      setSelectedSubscriber(updatedSub.data.data.subscriber);
    } catch (error) {
      console.error("Remove package error:", error);
      alert(error.response?.data?.message || "Failed to remove package");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate cost for extension
  const calculateExtensionCost = (packageId, days) => {
    const pkg = packages.find((p) => p._id === packageId);
    if (!pkg) return 0;
    const rawCost = (pkg.costPerDay || 0) * days;
    // Round to nearest 10
    return Math.round(rawCost / 10) * 10;
  };

  // Filter subscribers
  const filteredSubscribers = subscribers.filter((subscriber) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      subscriber.subscriberName.toLowerCase().includes(searchLower) ||
      subscriber.macAddress.toLowerCase().includes(searchLower) ||
      subscriber.serialNumber?.toLowerCase().includes(searchLower) ||
      subscriber.resellerInfo?.name?.toLowerCase().includes(searchLower) ||
      subscriber.resellerInfo?.partnerCode?.toLowerCase().includes(searchLower);

    if (!filterOption) return matchesSearch;

    const now = new Date();
    switch (filterOption) {
      case "active":
        return matchesSearch && subscriber.status === "Active";
      case "expired":
        return matchesSearch && subscriber.status === "Expired";
      case "fresh":
        return matchesSearch && subscriber.status === "Fresh";
      case "orphaned":
        return (
          matchesSearch &&
          subscriber.status === "Fresh" &&
          !subscriber.resellerId
        );
      case "expiringsoon":
        // Check if any package expires in next 7 days
        const hasExpiringSoon = subscriber.packages?.some((pkg) => {
          const expiry = new Date(pkg.expiryDate);
          const daysRemaining = Math.ceil(
            (expiry - now) / (1000 * 60 * 60 * 24)
          );
          return daysRemaining > 0 && daysRemaining <= 7;
        });
        return matchesSearch && hasExpiringSoon;
      default:
        return matchesSearch;
    }
  });

  // Get status color
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

  // Get package expiry status
  const getPackageExpiryStatus = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { text: "Expired", color: "text-red-600", bgColor: "bg-red-50" };
    } else if (daysRemaining <= 7) {
      return {
        text: `${daysRemaining}d left`,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
      };
    } else if (daysRemaining <= 30) {
      return {
        text: `${daysRemaining}d left`,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
      };
    } else {
      return {
        text: `${daysRemaining}d left`,
        color: "text-green-600",
        bgColor: "bg-green-50",
      };
    }
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

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
                  Subscribers Management
                </h1>
                <p className="text-sm text-gray-600">
                  Manage subscribers with per-package expiry tracking
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
              placeholder="Search by name, MAC, serial number, or partner code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Fresh">Fresh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quick Filter
                  </label>
                  <select
                    value={filterOption}
                    onChange={(e) => setFilterOption(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Subscribers</option>
                    <option value="active">Active Only</option>
                    <option value="expired">Expired</option>
                    <option value="expiringsoon">Expiring in 7 Days</option>
                    <option value="fresh">Fresh Users</option>
                    {user.role === "admin" && (
                      <option value="orphaned">Orphaned MACs</option>
                    )}
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
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Resellers</option>
                      {resellers.map((reseller) => (
                        <option key={reseller._id} value={reseller._id}>
                          {reseller.name} ({reseller.partnerCode || "N/A"})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-end">
                  {(statusFilter || resellerFilter || filterOption) && (
                    <button
                      onClick={() => {
                        setStatusFilter("");
                        setResellerFilter("");
                        setFilterOption("");
                      }}
                      className="w-full px-4 py-2.5 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 rounded-xl hover:bg-blue-100 transition-all"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Subscribers Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Subscriber
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    MAC / Serial
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Packages
                  </th>
                  {user.role !== "reseller" && (
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Reseller
                    </th>
                  )}
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSubscribers.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">
                        No subscribers found
                      </p>
                      <p className="text-sm">
                        Try adjusting your filters or search terms
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSubscribers.map((subscriber) => (
                    <tr
                      key={subscriber._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {subscriber.subscriberName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {subscriber.macAddress}
                        </div>
                        <div className="text-xs text-gray-500">
                          {subscriber.serialNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(
                            subscriber.status
                          )}`}
                        >
                          {subscriber.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {subscriber.packages &&
                        subscriber.packages.length > 0 ? (
                          <div className="space-y-1">
                            {subscriber.packages.slice(0, 2).map((pkg) => {
                              const status = getPackageExpiryStatus(
                                pkg.expiryDate
                              );
                              return (
                                <div
                                  key={pkg._id}
                                  className="flex items-center space-x-2 text-xs"
                                >
                                  <span className="font-medium text-gray-700">
                                    {pkg.packageId?.name || "Unknown"}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded ${status.bgColor} ${status.color} font-medium`}
                                  >
                                    {status.text}
                                  </span>
                                </div>
                              );
                            })}
                            {subscriber.packages.length > 2 && (
                              <div className="text-xs text-blue-600 font-medium">
                                +{subscriber.packages.length - 2} more
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            No packages
                          </span>
                        )}
                      </td>
                      {user.role !== "reseller" && (
                        <td className="px-6 py-4">
                          {subscriber.resellerInfo ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {subscriber.resellerInfo.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {subscriber.resellerInfo.partnerCode}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">N/A</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewDetails(subscriber)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(subscriber)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePackagesClick(subscriber)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Manage Packages"
                          >
                            <PackageIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(subscriber)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* View Details Modal */}
      {showViewModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Subscriber Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Name</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedSubscriber.subscriberName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">MAC Address</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedSubscriber.macAddress}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Serial Number</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedSubscriber.serialNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(
                        selectedSubscriber.status
                      )}`}
                    >
                      {selectedSubscriber.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Packages */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                  Packages
                </h3>
                {selectedSubscriber.packages &&
                selectedSubscriber.packages.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSubscriber.packages.map((pkg) => {
                      const status = getPackageExpiryStatus(pkg.expiryDate);
                      return (
                        <div
                          key={pkg._id}
                          className="p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">
                              {pkg.packageId?.name || "Unknown"}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs ${status.bgColor} ${status.color} font-medium`}
                            >
                              {status.text}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Expires: {formatDate(pkg.expiryDate)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No packages assigned</p>
                )}
              </div>

              {/* Reseller Info */}
              {selectedSubscriber.resellerInfo && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                    Reseller Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedSubscriber.resellerInfo.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Partner Code</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedSubscriber.resellerInfo.partnerCode}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Basic Info Only) */}
      {showEditModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Edit Subscriber</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Subscriber Name *
                </label>
                <input
                  type="text"
                  value={formData.subscriberName}
                  onChange={(e) =>
                    setFormData({ ...formData, subscriberName: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    setFormData({ ...formData, serialNumber: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-medium disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Packages Modal */}
      {showPackagesModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Manage Packages
                </h2>
                <p className="text-sm text-purple-100">
                  {selectedSubscriber.subscriberName}
                </p>
              </div>
              <button
                onClick={() => setShowPackagesModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Current Packages */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                  Active Packages
                </h3>
                {selectedSubscriber.packages &&
                selectedSubscriber.packages.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSubscriber.packages.map((pkg) => {
                      const status = getPackageExpiryStatus(pkg.expiryDate);
                      const isExtending =
                        extendingPackageId === pkg.packageId._id;

                      return (
                        <div
                          key={pkg._id}
                          className="p-4 bg-gray-50 rounded-xl border border-gray-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-900">
                                  {pkg.packageId?.name || "Unknown"}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded text-xs ${status.bgColor} ${status.color} font-medium`}
                                >
                                  {status.text}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600">
                                Expires: {formatDate(pkg.expiryDate)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ₹{pkg.packageId?.costPerDay || 0}/day
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!isExtending && (
                                <>
                                  <button
                                    onClick={() => {
                                      setExtendingPackageId(pkg.packageId._id);
                                      setExtensionDays("30");
                                    }}
                                    className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium"
                                    disabled={submitting}
                                  >
                                    Extend
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleRemovePackage(pkg.packageId._id)
                                    }
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    disabled={submitting}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Extension UI */}
                          {isExtending && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-end space-x-3">
                                <div className="flex-1">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Days to extend
                                  </label>
                                  <input
                                    type="number"
                                    value={extensionDays}
                                    onChange={(e) =>
                                      setExtensionDays(e.target.value)
                                    }
                                    min="1"
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                    placeholder="30"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Cost
                                  </label>
                                  <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm font-semibold text-purple-700">
                                    ₹
                                    {calculateExtensionCost(
                                      pkg.packageId._id,
                                      parseInt(extensionDays) || 0
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() =>
                                    handleExtendPackage(pkg.packageId._id)
                                  }
                                  disabled={
                                    submitting ||
                                    !extensionDays ||
                                    parseInt(extensionDays) <= 0
                                  }
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium text-sm disabled:opacity-50"
                                >
                                  {submitting ? "Processing..." : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setExtendingPackageId(null)}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium text-sm"
                                  disabled={submitting}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                    No packages assigned yet
                  </p>
                )}
              </div>

              {/* Available Packages */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                  Add New Package
                </h3>
                <div className="space-y-2">
                  {packages
                    .filter(
                      (pkg) =>
                        !selectedSubscriber.packages?.some(
                          (sp) => sp.packageId._id === pkg._id
                        )
                    )
                    .map((pkg) => {
                      const isAdding = extendingPackageId === pkg._id;

                      return (
                        <div
                          key={pkg._id}
                          className="p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1">
                                {pkg.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                ₹{pkg.cost} for {pkg.duration} days (₹
                                {pkg.costPerDay}/day)
                              </div>
                            </div>
                            {!isAdding && (
                              <button
                                onClick={() => {
                                  setExtendingPackageId(pkg._id);
                                  setExtensionDays("30");
                                }}
                                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium flex items-center space-x-1"
                                disabled={submitting}
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>

                          {/* Add Package UI */}
                          {isAdding && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-end space-x-3">
                                <div className="flex-1">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Days
                                  </label>
                                  <input
                                    type="number"
                                    value={extensionDays}
                                    onChange={(e) =>
                                      setExtensionDays(e.target.value)
                                    }
                                    min="1"
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                    placeholder="30"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                                    Cost
                                  </label>
                                  <div className="px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-semibold text-green-700">
                                    ₹
                                    {calculateExtensionCost(
                                      pkg._id,
                                      parseInt(extensionDays) || 0
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleAddPackage(pkg._id)}
                                  disabled={
                                    submitting ||
                                    !extensionDays ||
                                    parseInt(extensionDays) <= 0
                                  }
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-sm disabled:opacity-50"
                                >
                                  {submitting ? "Processing..." : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setExtendingPackageId(null)}
                                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium text-sm"
                                  disabled={submitting}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Confirm Delete</h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-center text-gray-700 mb-2">
                  Are you sure you want to delete this subscriber?
                </p>
                <p className="text-center text-sm text-gray-600 font-medium">
                  {selectedSubscriber.subscriberName}
                </p>
                <p className="text-center text-xs text-gray-500 mt-1">
                  {selectedSubscriber.macAddress}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-medium disabled:opacity-50"
                >
                  {submitting ? "Deleting..." : "Delete"}
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
