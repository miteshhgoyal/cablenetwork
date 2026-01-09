// frontend/src/pages/subscribers/Subscribers.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";
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
  Calendar,
  Package as PackageIcon,
  User,
  Hash,
  Clock,
  AlertCircle,
  Info,
  UserX,
  RefreshCw,
  Plus,
  TrendingUp,
} from "lucide-react";

const Subscribers = () => {
  const { user } = useAuth();
  const [subscribers, setSubscribers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterOption, setFilterOption] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Package management states
  const [extendingPackageId, setExtendingPackageId] = useState(null);
  const [extensionDays, setExtensionDays] = useState("30");

  const [formData, setFormData] = useState({
    subscriberName: "",
    macAddress: "",
    serialNumber: "",
  });

  useEffect(() => {
    fetchSubscribers();
    fetchPackages();
    if (user.role !== "reseller") {
      fetchResellers();
    }
  }, [statusFilter, filterOption]);

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

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
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setShowDeleteModal(true);
  };

  const handleManagePackages = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setExtendingPackageId(null);
    setExtensionDays("30");
    setShowPackageModal(true);
  };

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

  // NEW: Add package to subscriber
  const handleAddPackage = async (packageId) => {
    if (!extensionDays || parseInt(extensionDays) <= 0) {
      alert("Please enter valid number of days");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(
        `/subscribers/${selectedSubscriber._id}/packages/add`,
        {
          packageId,
          days: parseInt(extensionDays),
        }
      );

      alert(response.data.message || "Package added successfully!");

      // Update the subscriber in the modal
      setSelectedSubscriber(response.data.data.subscriber);

      // Refresh the list
      fetchSubscribers();
      setExtendingPackageId(null);
      setExtensionDays("30");
    } catch (error) {
      console.error("Add package error:", error);
      alert(error.response?.data?.message || "Failed to add package");
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Extend existing package
  const handleExtendPackage = async (packageId) => {
    if (!extensionDays || parseInt(extensionDays) <= 0) {
      alert("Please enter valid number of days");
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(
        `/subscribers/${selectedSubscriber._id}/packages/${packageId}/extend`,
        {
          days: parseInt(extensionDays),
        }
      );

      alert(response.data.message || "Package extended successfully!");

      // Update the subscriber in the modal
      setSelectedSubscriber(response.data.data.subscriber);

      // Refresh the list
      fetchSubscribers();
      setExtendingPackageId(null);
      setExtensionDays("30");
    } catch (error) {
      console.error("Extend package error:", error);
      alert(error.response?.data?.message || "Failed to extend package");
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Remove package from subscriber
  const handleRemovePackage = async (packageId) => {
    if (!confirm("Are you sure you want to remove this package?")) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.delete(
        `/subscribers/${selectedSubscriber._id}/packages/${packageId}`
      );

      alert("Package removed successfully!");

      // Update the subscriber in the modal
      setSelectedSubscriber(response.data.data.subscriber);

      // Refresh the list
      fetchSubscribers();
    } catch (error) {
      console.error("Remove package error:", error);
      alert(error.response?.data?.message || "Failed to remove package");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate extension cost
  const calculateExtensionCost = (packageId, days) => {
    const pkg = packages.find((p) => p._id === packageId);
    if (!pkg) return 0;

    const cost = (pkg.costPerDay || 0) * days;
    // Round to nearest 10
    return Math.round(cost / 10) * 10;
  };

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
    const expiry = new Date(subscriber.expiryDate);

    switch (filterOption) {
      case "active":
        return matchesSearch && expiry > now && subscriber.status === "Active";
      case "expired":
        return matchesSearch && expiry < now;
      case "fresh":
        return matchesSearch && subscriber.status === "Fresh";
      case "expiring_soon":
        const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return matchesSearch && daysRemaining > 0 && daysRemaining <= 7;
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

  const getExpiryStatus = (expiryDate) => {
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

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-IN", {
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
                    <option value="expiring_soon">Expiring in 7 Days</option>
                    <option value="fresh">Fresh Users</option>
                  </select>
                </div>

                <div className="flex items-end">
                  {(statusFilter || filterOption) && (
                    <button
                      onClick={() => {
                        setStatusFilter("");
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium mb-1">Total</p>
                <p className="text-3xl font-bold text-blue-900">
                  {filteredSubscribers.length}
                </p>
              </div>
              <UserCheck className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium mb-1">
                  Active
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {
                    filteredSubscribers.filter((s) => s.status === "Active")
                      .length
                  }
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium mb-1">
                  Expiring Soon
                </p>
                <p className="text-3xl font-bold text-orange-900">
                  {
                    filteredSubscribers.filter((s) => {
                      const days = Math.ceil(
                        (new Date(s.expiryDate) - new Date()) /
                          (1000 * 60 * 60 * 24)
                      );
                      return days > 0 && days <= 7;
                    }).length
                  }
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-orange-600 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium mb-1">
                  Fresh
                </p>
                <p className="text-3xl font-bold text-purple-900">
                  {
                    filteredSubscribers.filter((s) => s.status === "Fresh")
                      .length
                  }
                </p>
              </div>
              <User className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
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
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Subscriber Info
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      MAC / Serial
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Upline Info
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Packages
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <UserCheck className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">
                            No subscribers found
                          </p>
                          <p className="text-sm text-gray-400">
                            Try adjusting your filters
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSubscribers.map((subscriber, index) => {
                      const expiryStatus = getExpiryStatus(
                        subscriber.expiryDate
                      );

                      return (
                        <tr
                          key={subscriber._id}
                          className="hover:bg-blue-50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <span className="text-sm font-bold text-gray-600">
                              {index + 1}
                            </span>
                          </td>

                          {/* Subscriber Info */}
                          <td className="px-4 py-4">
                            <div className="flex items-start space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                {subscriber.subscriberName
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">
                                  {subscriber.subscriberName}
                                </p>
                                <div className="flex items-center space-x-1 mt-1">
                                  <Calendar className="w-3 h-3 text-gray-400" />
                                  <p className="text-xs text-gray-500">
                                    Joined: {formatDate(subscriber.createdAt)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* MAC / Serial */}
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1">
                                <Hash className="w-3 h-3 text-gray-400" />
                                <p className="text-xs font-mono text-gray-900 font-semibold">
                                  {subscriber.macAddress}
                                </p>
                              </div>
                              <p className="text-xs font-mono text-gray-500">
                                SN: {subscriber.serialNumber}
                              </p>
                            </div>
                          </td>

                          {/* Upline Info */}
                          <td className="px-4 py-4">
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-2 border border-indigo-200">
                              <div className="flex items-center space-x-2 mb-1">
                                <User className="w-3 h-3 text-indigo-600" />
                                <p className="text-xs font-bold text-indigo-900">
                                  {subscriber.resellerInfo?.name || "N/A"}
                                </p>
                              </div>
                              {subscriber.resellerInfo?.partnerCode && (
                                <div className="flex items-center space-x-1">
                                  <Hash className="w-3 h-3 text-indigo-500" />
                                  <p className="text-xs font-mono text-indigo-700 font-semibold">
                                    {subscriber.resellerInfo.partnerCode}
                                  </p>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                                  subscriber.status
                                )}`}
                              >
                                {subscriber.status}
                              </span>
                            </div>
                          </td>

                          {/* Packages */}
                          <td className="px-4 py-4">
                            {subscriber.packages &&
                            subscriber.packages.length > 0 ? (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  <PackageIcon className="w-3 h-3 text-blue-600" />
                                  <p className="text-xs font-bold text-blue-900">
                                    {subscriber.packages.length} Package(s)
                                  </p>
                                </div>
                                {subscriber.packages
                                  .slice(0, 2)
                                  .map((pkg, idx) => (
                                    <div
                                      key={idx}
                                      className="text-xs text-gray-600"
                                    >
                                      <p className="font-semibold">
                                        • {pkg.packageId?.name || "Unknown"}
                                      </p>
                                      <p className="text-gray-500 ml-3">
                                        Expires: {formatDate(pkg.expiryDate)}
                                      </p>
                                    </div>
                                  ))}
                                {subscriber.packages.length > 2 && (
                                  <p className="text-xs text-blue-600 font-semibold">
                                    +{subscriber.packages.length - 2} more
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">
                                No packages
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleViewDetails(subscriber)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(subscriber)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleManagePackages(subscriber)}
                                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                title="Manage Packages"
                              >
                                <PackageIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(subscriber)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-between px-6 py-4">
              <h2 className="text-xl font-bold text-white">
                Subscriber Complete Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 font-semibold mb-2">
                    Subscriber Name
                  </p>
                  <p className="text-lg font-bold text-blue-900">
                    {selectedSubscriber.subscriberName}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs text-purple-600 font-semibold mb-2">
                    MAC Address
                  </p>
                  <p className="text-lg font-mono font-bold text-purple-900">
                    {selectedSubscriber.macAddress}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                  <p className="text-xs text-indigo-600 font-semibold mb-2">
                    Serial Number
                  </p>
                  <p className="text-lg font-mono font-bold text-indigo-900">
                    {selectedSubscriber.serialNumber}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <p className="text-xs text-green-600 font-semibold mb-2">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(
                      selectedSubscriber.status
                    )}`}
                  >
                    {selectedSubscriber.status}
                  </span>
                </div>
              </div>

              {/* Upline Info */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-300">
                <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center space-x-2">
                  <User className="w-4 h-4" />
                  <span>Upline / Reseller Information</span>
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-indigo-600 font-semibold mb-1">
                      Reseller Name
                    </p>
                    <p className="text-base font-bold text-indigo-900">
                      {selectedSubscriber.resellerInfo?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600 font-semibold mb-1">
                      Partner Code
                    </p>
                    <p className="text-base font-mono font-bold text-indigo-900">
                      {selectedSubscriber.resellerInfo?.partnerCode || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Packages */}
              {selectedSubscriber.packages &&
                selectedSubscriber.packages.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center space-x-2">
                      <PackageIcon className="w-4 h-4" />
                      <span>
                        Assigned Packages ({selectedSubscriber.packages.length})
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {selectedSubscriber.packages.map((pkg, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-200"
                        >
                          <div>
                            <span className="font-semibold text-gray-900">
                              {pkg.packageId?.name || "Unknown"}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              Added: {formatDate(pkg.addedAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-blue-600">
                              ₹{pkg.packageId?.cost || 0} /{" "}
                              {pkg.packageId?.duration || 0}d
                            </span>
                            <p className="text-xs text-gray-600 mt-1">
                              Expires: {formatDate(pkg.expiryDate)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Location & Device */}
              {selectedSubscriber.lastLocation && (
                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 border border-green-200">
                  <h3 className="text-sm font-bold text-green-900 mb-3 flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>Last Known Location</span>
                  </h3>
                  <p className="text-sm font-mono text-green-800">
                    {selectedSubscriber.lastLocation.coordinates[1].toFixed(6)},{" "}
                    {selectedSubscriber.lastLocation.coordinates[0].toFixed(6)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatDateTime(selectedSubscriber.lastLocation.timestamp)}
                  </p>
                </div>
              )}

              {selectedSubscriber.deviceInfo && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Device Information</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Model</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedSubscriber.deviceInfo.deviceModel || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">OS Version</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedSubscriber.deviceInfo.osVersion || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t">
              <button
                onClick={() => setShowViewModal(false)}
                className="w-full px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all font-semibold"
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
            <div className="sticky top-0 bg-gradient-to-r from-orange-600 to-red-600 flex items-center justify-between px-6 py-4">
              <h2 className="text-xl font-bold text-white">Edit Subscriber</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-white" />
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    required
                  />
                </div>

                <div className="md:col-span-2">
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> To manage packages, use the "Manage
                  Packages" button from the actions menu.
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 font-semibold"
                >
                  {submitting ? "Updating..." : "Update Subscriber"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
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
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
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
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 font-semibold"
                >
                  {submitting ? "Deleting..." : "Delete"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedSubscriber(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PACKAGE MANAGEMENT MODAL */}
      {showPackageModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-between px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <PackageIcon className="w-5 h-5" />
                <span>
                  Manage Packages - {selectedSubscriber.subscriberName}
                </span>
              </h2>
              <button
                onClick={() => {
                  setShowPackageModal(false);
                  setExtendingPackageId(null);
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Packages */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">
                    Current Packages
                  </h3>
                  {selectedSubscriber.packages &&
                  selectedSubscriber.packages.length > 0 ? (
                    <div className="space-y-3">
                      {selectedSubscriber.packages.map((pkg) => {
                        const isExtending =
                          extendingPackageId === pkg.packageId._id;

                        return (
                          <div
                            key={pkg.packageId._id}
                            className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900 mb-1">
                                  {pkg.packageId.name}
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                  <p>
                                    ₹{pkg.packageId.cost} for{" "}
                                    {pkg.packageId.duration} days (₹
                                    {pkg.packageId.costPerDay}/day)
                                  </p>
                                  <p>
                                    Expires:{" "}
                                    <span className="font-semibold">
                                      {formatDate(pkg.expiryDate)}
                                    </span>
                                  </p>
                                  <p>Added: {formatDate(pkg.addedAt)}</p>
                                </div>
                              </div>
                              <div className="flex space-x-1">
                                {!isExtending && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setExtendingPackageId(
                                          pkg.packageId._id
                                        );
                                        setExtensionDays("30");
                                      }}
                                      className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-all"
                                      title="Extend"
                                      disabled={submitting}
                                    >
                                      <TrendingUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleRemovePackage(pkg.packageId._id)
                                      }
                                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                      title="Remove"
                                      disabled={submitting}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Extend Package UI */}
                            {isExtending && (
                              <div className="mt-3 pt-3 border-t border-blue-300">
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
        </div>
      )}
    </div>
  );
};

export default Subscribers;
