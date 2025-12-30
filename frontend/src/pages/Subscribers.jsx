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
  Calendar,
  Package as PackageIcon,
  User,
  Hash,
  Clock,
  AlertCircle,
  Info,
  UserX,
  RefreshCw,
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
  const [showReassignModal, setShowReassignModal] = useState(false); // NEW
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [renewDuration, setRenewDuration] = useState(30);
  const [selectedResellerId, setSelectedResellerId] = useState(""); // NEW

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

  // Auto-calculate expiry date when packages change
  useEffect(() => {
    if (formData.packages.length > 0 && packages.length > 0) {
      const calculatedExpiry = calculateExpiryDate(formData.packages);
      if (calculatedExpiry) {
        setFormData((prev) => ({
          ...prev,
          expiryDate: calculatedExpiry,
        }));
      }
    }
  }, [formData.packages, packages]);

  /**
   * Calculate expiry date based on the longest duration package
   */
  const calculateExpiryDate = (selectedPackageIds) => {
    if (!selectedPackageIds || selectedPackageIds.length === 0) {
      return "";
    }

    const maxDuration = selectedPackageIds.reduce((max, pkgId) => {
      const pkg = packages.find((p) => p._id === pkgId);
      if (pkg && pkg.duration > max) {
        return pkg.duration;
      }
      return max;
    }, 0);

    if (maxDuration === 0) {
      return "";
    }

    const today = new Date();
    const expiryDate = new Date(
      today.getTime() + maxDuration * 24 * 60 * 60 * 1000
    );

    return expiryDate.toISOString().split("T")[0];
  };

  /**
   * Get package details for display
   */
  const getPackageSummary = (selectedPackageIds) => {
    if (!selectedPackageIds || selectedPackageIds.length === 0) {
      return { maxDuration: 0, longestPackage: null, totalCost: 0 };
    }

    let maxDuration = 0;
    let longestPackage = null;
    let totalCost = 0;

    selectedPackageIds.forEach((pkgId) => {
      const pkg = packages.find((p) => p._id === pkgId);
      if (pkg) {
        totalCost += pkg.cost || 0;
        if (pkg.duration > maxDuration) {
          maxDuration = pkg.duration;
          longestPackage = pkg;
        }
      }
    });

    return { maxDuration, longestPackage, totalCost };
  };

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
    setRenewDuration(30);
    setShowRenewModal(true);
  };

  // NEW: Handle reassign reseller click
  const handleReassignClick = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setSelectedResellerId("");
    setShowReassignModal(true);
  };

  const handleActivate = async () => {
    setSubmitting(true);
    try {
      await api.patch(`/subscribers/${selectedSubscriber._id}/activate`, {
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      alert("Subscriber activated successfully!");
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
      await api.patch(`/subscribers/${selectedSubscriber._id}/renew`, {
        duration: renewDuration,
      });
      alert(`Package renewed successfully for ${renewDuration} days!`);
      fetchSubscribers();
      setShowRenewModal(false);
      setSelectedSubscriber(null);
    } catch (error) {
      console.error("Renew error:", error);
      alert(error.response?.data?.message || "Renew failed");
    } finally {
      setSubmitting(false);
    }
  };

  // NEW: Handle reassign reseller
  const handleReassign = async () => {
    if (!selectedResellerId) {
      alert("Please select a reseller");
      return;
    }

    setSubmitting(true);
    try {
      // Update subscriber with new reseller
      await api.put(`/subscribers/${selectedSubscriber._id}`, {
        subscriberName: selectedSubscriber.subscriberName,
        macAddress: selectedSubscriber.macAddress,
        serialNumber: selectedSubscriber.serialNumber,
        status: "Fresh", // Set to Fresh for new reseller to activate
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        packages: [], // Clear packages - new reseller will assign
      });

      alert(
        "MAC reassigned successfully! New reseller can now assign packages and activate."
      );
      fetchSubscribers();
      setShowReassignModal(false);
      setSelectedSubscriber(null);
      setSelectedResellerId("");
    } catch (error) {
      console.error("Reassign error:", error);
      alert(error.response?.data?.message || "Reassignment failed");
    } finally {
      setSubmitting(false);
    }
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

      // Show appropriate message based on role
      if (user.role === "admin") {
        alert("Subscriber deleted successfully!");
      } else {
        alert(
          "MAC released successfully! It will be available for admin to reassign."
        );
      }

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
      subscriber.resellerId?.name?.toLowerCase().includes(searchLower) ||
      subscriber.resellerId?.partnerCode?.toLowerCase().includes(searchLower);

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
      case "orphaned": // NEW: Filter for orphaned MACs
        return (
          matchesSearch &&
          subscriber.status === "Fresh" &&
          !subscriber.resellerId
        );
      case "expiring_soon":
        const daysRemaining = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        return matchesSearch && daysRemaining > 0 && daysRemaining <= 7;
      default:
        return matchesSearch;
    }
  });

  // NEW: Get orphaned MACs count
  const orphanedCount = subscribers.filter(
    (s) => s.status === "Fresh" && !s.resellerId
  ).length;

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
                  Complete subscriber tracking with location, device info, and
                  upline details
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
        {/* NEW: Orphaned MACs Alert - Only show for admin */}
        {user.role === "admin" && orphanedCount > 0 && (
          <div className="mb-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <UserX className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-orange-900 mb-1">
                  Orphaned MACs Detected
                </h3>
                <p className="text-sm text-orange-800 mb-3">
                  You have <span className="font-bold">{orphanedCount}</span>{" "}
                  MAC address(es) that were released by resellers and are now
                  unassigned. These MACs are available for reassignment to new
                  resellers.
                </p>
                <button
                  onClick={() => setFilterOption("orphaned")}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 transition-all"
                >
                  View Orphaned MACs ({orphanedCount})
                </button>
              </div>
            </div>
          </div>
        )}

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
                    {user.role === "admin" && (
                      <option value="orphaned">
                        Orphaned MACs ({orphanedCount})
                      </option>
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
                          {reseller.name}{" "}
                          {reseller.partnerCode
                            ? `(${reseller.partnerCode})`
                            : ""}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
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
          {/* NEW: Orphaned MACs Card - Only for admin */}
          {user.role === "admin" && (
            <div
              className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-300 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setFilterOption("orphaned")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium mb-1">
                    Orphaned
                  </p>
                  <p className="text-3xl font-bold text-orange-900">
                    {orphanedCount}
                  </p>
                </div>
                <UserX className="w-10 h-10 text-orange-600 opacity-50" />
              </div>
            </div>
          )}
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
                      Status / Expiry
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
                      const isOrphaned = !subscriber.resellerId; // NEW

                      return (
                        <tr
                          key={subscriber._id}
                          className={`hover:bg-blue-50 transition-colors ${
                            isOrphaned ? "bg-orange-50" : ""
                          }`}
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

                          {/* Upline Info - NEW: Show orphaned indicator */}
                          <td className="px-4 py-4">
                            {isOrphaned ? (
                              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-2 border-2 border-orange-300">
                                <div className="flex items-center space-x-2 mb-1">
                                  <UserX className="w-4 h-4 text-orange-600" />
                                  <p className="text-xs font-bold text-orange-900">
                                    Orphaned MAC
                                  </p>
                                </div>
                                <p className="text-xs text-orange-700">
                                  No reseller assigned
                                </p>
                              </div>
                            ) : (
                              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-2 border border-indigo-200">
                                <div className="flex items-center space-x-2 mb-1">
                                  <User className="w-3 h-3 text-indigo-600" />
                                  <p className="text-xs font-bold text-indigo-900">
                                    {subscriber.resellerId?.name || "N/A"}
                                  </p>
                                </div>
                                {subscriber.resellerId?.partnerCode && (
                                  <div className="flex items-center space-x-1">
                                    <Hash className="w-3 h-3 text-indigo-500" />
                                    <p className="text-xs font-mono text-indigo-700 font-semibold">
                                      {subscriber.resellerId.partnerCode}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Status / Expiry */}
                          <td className="px-4 py-4">
                            <div className="space-y-2">
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                                  subscriber.status
                                )}`}
                              >
                                {subscriber.status}
                              </span>
                              <div
                                className={`flex items-center space-x-1 px-2 py-1 rounded-md ${expiryStatus.bgColor}`}
                              >
                                <Clock
                                  className={`w-3 h-3 ${expiryStatus.color}`}
                                />
                                <p
                                  className={`text-xs font-bold ${expiryStatus.color}`}
                                >
                                  {expiryStatus.text}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500">
                                {formatDate(subscriber.expiryDate)}
                              </p>
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
                                    <p
                                      key={idx}
                                      className="text-xs text-gray-600 truncate"
                                    >
                                      • {pkg.name}
                                    </p>
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

                          {/* Actions - NEW: Add Reassign button for orphaned MACs */}
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-end space-x-1">
                              {/* NEW: Reassign button for orphaned MACs (admin only) */}
                              {user.role === "admin" && isOrphaned && (
                                <button
                                  onClick={() =>
                                    handleReassignClick(subscriber)
                                  }
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Reassign to Reseller"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}

                              {(subscriber.status === "Inactive" ||
                                subscriber.status === "Fresh") && (
                                <button
                                  onClick={() =>
                                    handleActivateClick(subscriber)
                                  }
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                  title="Activate"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
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
                              {!isOrphaned && (
                                <button
                                  onClick={() => handleRenewClick(subscriber)}
                                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                  title="Renew Package"
                                >
                                  <Clock className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteClick(subscriber)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title={
                                  user.role === "admin"
                                    ? "Delete"
                                    : "Release MAC"
                                }
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

      {/* NEW: REASSIGN RESELLER MODAL */}
      {showReassignModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <RefreshCw className="w-5 h-5" />
                <span>Reassign MAC to Reseller</span>
              </h2>
            </div>
            <div className="p-6">
              <div className="bg-orange-50 rounded-xl p-4 mb-4 border-2 border-orange-200">
                <p className="text-sm text-orange-600 font-semibold mb-1">
                  Orphaned MAC
                </p>
                <p className="text-lg font-bold text-orange-900 font-mono">
                  {selectedSubscriber.macAddress}
                </p>
                <p className="text-xs text-orange-700 mt-2">
                  Subscriber: {selectedSubscriber.subscriberName}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Reseller *
                </label>
                <select
                  value={selectedResellerId}
                  onChange={(e) => setSelectedResellerId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose a reseller --</option>
                  {resellers.map((reseller) => (
                    <option key={reseller._id} value={reseller._id}>
                      {reseller.name}
                      {reseller.partnerCode ? ` (${reseller.partnerCode})` : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  MAC will be assigned as Fresh status. New reseller can assign
                  packages and activate.
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> Packages will be cleared. New reseller
                  will need to assign packages and activate this subscriber.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleReassign}
                  disabled={submitting || !selectedResellerId}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 font-semibold"
                >
                  {submitting ? "Reassigning..." : "Reassign MAC"}
                </button>
                <button
                  onClick={() => {
                    setShowReassignModal(false);
                    setSelectedSubscriber(null);
                    setSelectedResellerId("");
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

      {/* ... REST OF THE MODALS (VIEW, EDIT, DELETE, ACTIVATE, RENEW) ... */}
      {/* Keep all existing modals unchanged */}

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

              {/* Upline Info Section - NEW: Show orphaned status */}
              <div
                className={`${
                  !selectedSubscriber.resellerId
                    ? "bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300"
                    : "bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300"
                } rounded-xl p-4`}
              >
                <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center space-x-2">
                  {!selectedSubscriber.resellerId ? (
                    <>
                      <UserX className="w-4 h-4" />
                      <span>Orphaned MAC - No Reseller Assigned</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      <span>Upline / Reseller Information</span>
                    </>
                  )}
                </h3>
                {!selectedSubscriber.resellerId ? (
                  <div className="bg-white rounded-lg p-3 border border-orange-200">
                    <p className="text-sm text-orange-800">
                      This MAC was released by a reseller and is now available
                      for reassignment.
                    </p>
                    {user.role === "admin" && (
                      <button
                        onClick={() => {
                          setShowViewModal(false);
                          handleReassignClick(selectedSubscriber);
                        }}
                        className="mt-3 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Reassign to Reseller</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-indigo-600 font-semibold mb-1">
                        Reseller Name
                      </p>
                      <p className="text-base font-bold text-indigo-900">
                        {selectedSubscriber.resellerId?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 font-semibold mb-1">
                        Partner Code
                      </p>
                      <p className="text-base font-mono font-bold text-indigo-900">
                        {selectedSubscriber.resellerId?.partnerCode || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 font-semibold mb-1">
                        Email
                      </p>
                      <p className="text-sm text-indigo-700">
                        {selectedSubscriber.resellerId?.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-indigo-600 font-semibold mb-1">
                        Phone
                      </p>
                      <p className="text-sm text-indigo-700">
                        {selectedSubscriber.resellerId?.phone || "N/A"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscription Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                  <p className="text-xs text-yellow-600 font-semibold mb-2">
                    Expiry Date
                  </p>
                  <p className="text-base font-bold text-yellow-900">
                    {formatDate(selectedSubscriber.expiryDate)}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {getExpiryStatus(selectedSubscriber.expiryDate).text}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                  <p className="text-xs text-pink-600 font-semibold mb-2">
                    Created At
                  </p>
                  <p className="text-base font-bold text-pink-900">
                    {formatDate(selectedSubscriber.createdAt)}
                  </p>
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
                          <span className="font-semibold text-gray-900">
                            {pkg.name}
                          </span>
                          <span className="text-sm font-bold text-blue-600">
                            ₹{pkg.cost} / {pkg.duration}d
                          </span>
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
                    <div>
                      <p className="text-xs text-gray-600 mb-1">
                        Security Status
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          selectedSubscriber.deviceInfo.isRooted ||
                          selectedSubscriber.deviceInfo.isVPNActive
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {selectedSubscriber.deviceInfo.isRooted && "Rooted"}
                        {selectedSubscriber.deviceInfo.isRooted &&
                          selectedSubscriber.deviceInfo.isVPNActive &&
                          " | "}
                        {selectedSubscriber.deviceInfo.isVPNActive &&
                          "VPN Active"}
                        {!selectedSubscriber.deviceInfo.isRooted &&
                          !selectedSubscriber.deviceInfo.isVPNActive &&
                          "Secure"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Last IP</p>
                      <p className="text-sm font-mono font-semibold text-gray-900">
                        {selectedSubscriber.deviceInfo.lastIPAddress || "N/A"}
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

      {/* EDIT MODAL - With Auto-Calculate Expiry Date */}
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Fresh">Fresh</option>
                  </select>
                </div>
              </div>

              {/* Packages Selection Section */}
              <div>
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
                        className="flex items-center space-x-3 p-3 hover:bg-white rounded-lg cursor-pointer transition-all border border-transparent hover:border-orange-200"
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
                          className="w-5 h-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
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
                          <div className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded">
                            Selected
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

              {/* Auto-Calculated Expiry Date Display */}
              {formData.packages.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-300">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-blue-900 mb-2">
                        Auto-Calculated Expiry Date
                      </h4>
                      {(() => {
                        const summary = getPackageSummary(formData.packages);
                        return (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div className="bg-white rounded-lg p-2 border border-blue-200">
                                <p className="text-blue-600 font-semibold mb-1">
                                  Longest Package
                                </p>
                                <p className="text-blue-900 font-bold">
                                  {summary.longestPackage?.name || "N/A"}
                                </p>
                                <p className="text-blue-700">
                                  {summary.maxDuration} days
                                </p>
                              </div>
                              <div className="bg-white rounded-lg p-2 border border-blue-200">
                                <p className="text-blue-600 font-semibold mb-1">
                                  Calculated Expiry
                                </p>
                                <p className="text-blue-900 font-bold">
                                  {formatDate(formData.expiryDate)}
                                </p>
                                <p className="text-blue-700">
                                  From today + {summary.maxDuration}d
                                </p>
                              </div>
                            </div>
                            <div className="bg-blue-100 rounded-lg p-2 border border-blue-300">
                              <p className="text-xs text-blue-800">
                                <strong>Note:</strong> The expiry date is
                                automatically set to the longest duration among
                                selected packages ({summary.maxDuration} days
                                from today).
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Expiry Date (Read-Only Display) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expiry Date (Auto-Calculated) *
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  readOnly
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl focus:outline-none cursor-not-allowed text-gray-700 font-semibold"
                  title="This field is automatically calculated based on selected packages"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This date is automatically calculated based on the longest
                  package duration
                </p>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || formData.packages.length === 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
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

      {/* ACTIVATE MODAL */}
      {showActivateModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Activate Subscriber
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Activate "
                <span className="font-semibold">
                  {selectedSubscriber?.subscriberName}
                </span>
                "? Status will be set to Active with 30 days validity.
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleActivate}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 font-semibold"
                >
                  {submitting ? "Activating..." : "Activate"}
                </button>
                <button
                  onClick={() => {
                    setShowActivateModal(false);
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

      {/* RENEW MODAL - Enhanced */}
      {showRenewModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Renew Package</h2>
            </div>
            <div className="p-6">
              <div className="bg-purple-50 rounded-xl p-4 mb-4 border border-purple-200">
                <p className="text-sm text-purple-600 font-semibold mb-1">
                  Subscriber
                </p>
                <p className="text-lg font-bold text-purple-900">
                  {selectedSubscriber?.subscriberName}
                </p>
                <p className="text-xs text-purple-700 mt-2">
                  Current Expiry: {formatDate(selectedSubscriber.expiryDate)}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Renewal Duration (Days) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={renewDuration}
                  onChange={(e) => setRenewDuration(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  New expiry will be calculated from current expiry date
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRenew}
                  disabled={submitting || !renewDuration || renewDuration <= 0}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 font-semibold"
                >
                  {submitting
                    ? "Renewing..."
                    : `Renew for ${renewDuration} Days`}
                </button>
                <button
                  onClick={() => {
                    setShowRenewModal(false);
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
    </div>
  );
};

export default Subscribers;
