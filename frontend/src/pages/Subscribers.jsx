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
  Calendar,
  Package as PackageIcon,
  User,
  X,
} from "lucide-react";

const Subscribers = () => {
  const { user } = useAuth();
  const [subscribers, setSubscribers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [resellerFilter, setResellerFilter] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchSubscribers();
    if (user.role !== "reseller") {
      fetchResellers();
    }
  }, [statusFilter, resellerFilter]);

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

  const handleViewDetails = (subscriber) => {
    setSelectedSubscriber(subscriber);
    setShowViewModal(true);
  };

  const filteredSubscribers = subscribers.filter((subscriber) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      subscriber.subscriberName.toLowerCase().includes(searchLower) ||
      subscriber.macAddress.toLowerCase().includes(searchLower) ||
      subscriber.serialNumber?.toLowerCase().includes(searchLower) ||
      subscriber.resellerId?.name.toLowerCase().includes(searchLower)
    );
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
    return new Date(date).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
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
                  View and manage subscriber information
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
          {/* Search Bar */}
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

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status Filter */}
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

                {/* Reseller Filter (only for admin/distributor) */}
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

              {/* Clear Filters */}
              {(statusFilter || resellerFilter) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setStatusFilter("");
                      setResellerFilter("");
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Reseller
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Subscriber Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      MAC Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Expiry Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredSubscribers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
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
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {subscriber.resellerId?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {subscriber.subscriberName}
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
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(subscriber.expiryDate)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {subscriber.package?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => handleViewDetails(subscriber)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center justify-center"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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

      {/* View Details Modal */}
      {showViewModal && selectedSubscriber && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
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

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Subscriber Name
                  </label>
                  <p className="text-base text-gray-900">
                    {selectedSubscriber.subscriberName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Reseller
                  </label>
                  <p className="text-base text-gray-900">
                    {selectedSubscriber.resellerId?.name || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Serial Number
                  </label>
                  <p className="text-base text-gray-900 font-mono">
                    {selectedSubscriber.serialNumber || "N/A"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    MAC Address
                  </label>
                  <p className="text-base text-gray-900 font-mono">
                    {selectedSubscriber.macAddress}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Status
                  </label>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                      selectedSubscriber.status
                    )}`}
                  >
                    {selectedSubscriber.status}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Expiry Date
                  </label>
                  <p className="text-base text-gray-900">
                    {formatDate(selectedSubscriber.expiryDate)}
                  </p>
                </div>
              </div>

              {/* Package Info */}
              {selectedSubscriber.package && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <PackageIcon className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">
                      Package Information
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">
                        Package Name
                      </label>
                      <p className="text-base text-gray-900">
                        {selectedSubscriber.package.name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">
                        Cost
                      </label>
                      <p className="text-base text-gray-900">
                        ₹{selectedSubscriber.package.cost}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">
                        Duration
                      </label>
                      <p className="text-base text-gray-900">
                        {selectedSubscriber.package.duration} days
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Created At
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedSubscriber.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedSubscriber.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => setShowViewModal(false)}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscribers;
