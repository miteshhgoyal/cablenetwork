import React, { useState, useEffect } from "react";
import api from "../services/api.js";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader,
  Users2,
  Filter,
  Eye,
  EyeOff,
  AlertCircle,
  Package as PackageIcon,
  Check,
  Mail,
  Phone,
  Users,
  Wallet,
  Calendar,
  Shield,
  User,
  Clock,
} from "lucide-react";

const Resellers = () => {
  const [resellers, setResellers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    status: "Active",
    balance: "",
    subscriberLimit: "",
    partnerCode: "",
    packages: [],
    validityDate: "", // NEW: Validity date field
  });
  const [balanceError, setBalanceError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const MIN_BALANCE = 1000;

  useEffect(() => {
    fetchResellers();
    fetchPackages();
  }, [statusFilter]);

  const fetchResellers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      const response = await api.get(`/resellers?${params.toString()}`);
      setResellers(response.data.data.resellers);
    } catch (error) {
      console.error("Failed to fetch resellers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await api.get("/resellers/packages");
      setPackages(response.data.data.packages);
    } catch (error) {
      console.error("Failed to fetch packages:", error);
    }
  };

  const handleOpenModal = (mode, reseller = null) => {
    setModalMode(mode);
    setBalanceError("");
    if (mode === "edit" && reseller) {
      setSelectedReseller(reseller);
      setFormData({
        name: reseller.name,
        email: reseller.email,
        password: "",
        phone: reseller.phone,
        status: reseller.status,
        balance: reseller.balance || "",
        subscriberLimit: reseller.subscriberLimit || "",
        partnerCode: reseller.partnerCode || "",
        packages: reseller.packages?.map((p) => p._id) || [],
        validityDate: reseller.validityDate
          ? new Date(reseller.validityDate).toISOString().slice(0, 16)
          : "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        status: "Active",
        balance: "",
        subscriberLimit: "",
        partnerCode: "",
        packages: [],
        validityDate: "",
      });
    }
    setShowModal(true);
  };

  const handleViewDetails = (reseller) => {
    setSelectedReseller(reseller);
    setShowViewModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReseller(null);
    setShowPassword(false);
    setBalanceError("");
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      status: "Active",
      balance: "",
      subscriberLimit: "",
      partnerCode: "",
      packages: [],
      validityDate: "",
    });
  };

  const validateBalance = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < MIN_BALANCE) {
      setBalanceError(
        `Balance amount cannot be less than ₹${MIN_BALANCE.toLocaleString(
          "en-IN"
        )}`
      );
      return false;
    }
    setBalanceError("");
    return true;
  };

  const handleBalanceChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, balance: value });
    if (value) {
      validateBalance(value);
    } else {
      setBalanceError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.balance || !validateBalance(formData.balance)) return;

    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        balance: parseFloat(formData.balance),
        subscriberLimit: parseInt(formData.subscriberLimit) || 0,
        validityDate: formData.validityDate || null,
      };

      if (modalMode === "edit" && !submitData.password) {
        delete submitData.password;
      }

      if (modalMode === "create") {
        await api.post("/resellers", submitData);
        alert("Reseller created successfully!");
      } else {
        await api.put(`/resellers/${selectedReseller._id}`, submitData);
        alert("Reseller updated successfully!");
      }

      fetchResellers();
      handleCloseModal();
    } catch (error) {
      console.error("Submit error:", error);
      alert(error.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await api.delete(`/resellers/${selectedReseller._id}`);
      alert("Reseller deleted successfully!");
      fetchResellers();
      setShowDeleteModal(false);
      setSelectedReseller(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.response?.data?.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredResellers = resellers.filter((reseller) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      reseller.name.toLowerCase().includes(searchLower) ||
      reseller.email.toLowerCase().includes(searchLower) ||
      reseller.phone.toLowerCase().includes(searchLower) ||
      reseller.partnerCode?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status) => {
    return status === "Active"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-red-50 text-red-700 border-red-200";
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatValidityDate = (date) => {
    if (!date)
      return <span className="text-xs text-gray-400 italic">No expiry</span>;
    const validityDate = new Date(date);
    const now = new Date();
    const isExpired = now > validityDate;
    return (
      <span
        className={`text-xs font-medium ${
          isExpired ? "text-red-600" : "text-orange-600"
        }`}
      >
        {validityDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
        {isExpired && <span className="ml-1">⚠️</span>}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-50 rounded-xl">
                <Users2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Resellers Management
                </h1>
                <p className="text-sm text-gray-600">
                  Manage reseller accounts, packages, balances, and validity
                  periods
                </p>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </button>
                <button
                  onClick={() => handleOpenModal("create")}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Reseller</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, phone, partner code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              {statusFilter && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setStatusFilter("")}
                    className="text-sm text-green-600 hover:text-green-700 font-medium"
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
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium mb-1">
                  Total Resellers
                </p>
                <p className="text-3xl font-bold text-green-900">
                  {filteredResellers.length}
                </p>
              </div>
              <Users2 className="w-10 h-10 text-green-600 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium mb-1">Active</p>
                <p className="text-3xl font-bold text-blue-900">
                  {
                    filteredResellers.filter((r) => r.status === "Active")
                      .length
                  }
                </p>
              </div>
              <Shield className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium mb-1">
                  Total Balance
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredResellers
                    .reduce((sum, r) => sum + (r.balance || 0), 0)
                    .toLocaleString("en-IN")}
                </p>
              </div>
              <Wallet className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-green-600 animate-spin" />
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
                      Reseller Info
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Partner Code
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Subscribers
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Packages
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Validity
                    </th>
                    <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredResellers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Users2 className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 font-medium">
                            No resellers found
                          </p>
                          <p className="text-sm text-gray-400">
                            Try adjusting your filters...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredResellers.map((reseller, index) => (
                      <tr
                        key={reseller._id}
                        className="hover:bg-green-50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-gray-600">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {reseller.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">
                                {reseller.name}
                              </p>
                              <div className="flex items-center space-x-1 mt-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-500">
                                  Joined {formatDate(reseller.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-2 border border-purple-200 inline-block">
                            <p className="text-sm font-mono font-bold text-purple-900">
                              {reseller.partnerCode || "N/A"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              <p className="text-xs text-gray-900">
                                {reseller.email}
                              </p>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              <p className="text-xs text-gray-600">
                                {reseller.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-2 border border-emerald-200 inline-block">
                            <div className="flex items-center space-x-1">
                              <Wallet className="w-3 h-3 text-emerald-600" />
                              <p className="text-sm font-bold text-emerald-900">
                                ₹
                                {reseller.balance?.toLocaleString("en-IN") || 0}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-2 border border-blue-200 inline-block">
                            <div className="flex items-center space-x-1">
                              <Users className="w-3 h-3 text-blue-600" />
                              <p className="text-sm font-bold text-blue-900">
                                {reseller.subscriberLimit || 0}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {reseller.packages && reseller.packages.length > 0 ? (
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-2 border border-indigo-200 inline-block">
                              <div className="flex items-center space-x-1">
                                <PackageIcon className="w-3 h-3 text-indigo-600" />
                                <p className="text-sm font-bold text-indigo-900">
                                  {reseller.packages.length} Packages
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              None
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                              reseller.status
                            )}`}
                          >
                            {reseller.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {formatValidityDate(reseller.validityDate)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleViewDetails(reseller)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenModal("edit", reseller)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReseller(reseller);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
        )}
      </div>

      {/* VIEW MODAL */}
      {showViewModal && selectedReseller && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-between px-6 py-4">
              <h2 className="text-xl font-bold text-white">
                Reseller Complete Details
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
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <p className="text-xs text-green-600 font-semibold mb-2">
                    Name
                  </p>
                  <p className="text-lg font-bold text-green-900">
                    {selectedReseller.name}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 font-semibold mb-2">
                    Email
                  </p>
                  <p className="text-base font-semibold text-blue-900">
                    {selectedReseller.email}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl p-4 border border-emerald-200">
                  <p className="text-xs text-emerald-600 font-semibold mb-2">
                    Phone
                  </p>
                  <p className="text-lg font-bold text-emerald-900">
                    {selectedReseller.phone}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <p className="text-xs text-purple-600 font-semibold mb-2">
                    Partner Code
                  </p>
                  <p className="text-lg font-mono font-bold text-purple-900">
                    {selectedReseller.partnerCode || "N/A"}
                  </p>
                </div>
              </div>

              {/* Financial & Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                  <p className="text-xs text-indigo-600 font-semibold mb-2">
                    Subscriber Limit
                  </p>
                  <p className="text-2xl font-bold text-indigo-900">
                    {selectedReseller.subscriberLimit || 0}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
                  <p className="text-xs text-cyan-600 font-semibold mb-2">
                    Current Balance
                  </p>
                  <p className="text-2xl font-bold text-cyan-900">
                    ₹{selectedReseller.balance?.toLocaleString("en-IN") || 0}
                  </p>
                </div>
              </div>

              {/* Status, Created, Validity */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                  <p className="text-xs text-pink-600 font-semibold mb-2">
                    Status
                  </p>
                  <span
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(
                      selectedReseller.status
                    )}`}
                  >
                    {selectedReseller.status}
                  </span>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200">
                  <p className="text-xs text-yellow-600 font-semibold mb-2">
                    Created Date
                  </p>
                  <p className="text-base font-bold text-yellow-900">
                    {formatDate(selectedReseller.createdAt)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <p className="text-xs text-orange-600 font-semibold mb-2">
                    Validity Date
                  </p>
                  {formatValidityDate(selectedReseller.validityDate)}
                </div>
              </div>

              {/* Created By */}
              {selectedReseller.createdBy && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Created By (Distributor)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-1">
                        Name
                      </p>
                      <p className="text-base font-bold text-gray-900">
                        {selectedReseller.createdBy.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold mb-1">
                        Email
                      </p>
                      <p className="text-sm text-gray-700">
                        {selectedReseller.createdBy.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Packages */}
              {selectedReseller.packages &&
                selectedReseller.packages.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center space-x-2">
                      <PackageIcon className="w-4 h-4" />
                      <span>
                        Assigned Packages ({selectedReseller.packages.length})
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {selectedReseller.packages.map((pkg, idx) => (
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 flex items-center justify-between px-6 py-4">
              <h2 className="text-xl font-bold text-white">
                {modalMode === "create" ? "Add New Reseller" : "Edit Reseller"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password{" "}
                    {modalMode === "create" ? "(Required)" : "(Optional)"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={
                        modalMode === "create"
                          ? "Enter password"
                          : "Leave blank to keep current"
                      }
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 pr-12"
                      required={modalMode === "create"}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      if (value.length <= 10)
                        setFormData({ ...formData, phone: value });
                    }}
                    maxLength={10}
                    placeholder="Enter 10-digit phone"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Balance Amount
                  </label>
                  <input
                    type="number"
                    value={formData.balance}
                    onChange={handleBalanceChange}
                    placeholder="Enter balance amount"
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 ${
                      balanceError
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-200 focus:ring-green-500"
                    }`}
                    required
                    min={1000}
                    step={100}
                  />
                  {balanceError && (
                    <div className="mt-2 flex items-center space-x-2 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {balanceError}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subscriber Limit
                  </label>
                  <input
                    type="number"
                    value={formData.subscriberLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subscriberLimit: e.target.value,
                      })
                    }
                    placeholder="Enter subscriber limit"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Partner Code
                  </label>
                  <input
                    type="text"
                    value={formData.partnerCode}
                    onChange={(e) =>
                      setFormData({ ...formData, partnerCode: e.target.value })
                    }
                    placeholder="Enter partner code"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Validity Date */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Validity Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.validityDate}
                  onChange={(e) =>
                    setFormData({ ...formData, validityDate: e.target.value })
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Leave empty for no expiration
                </p>
              </div>

              {/* Packages */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Packages (Optional)
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                  {packages.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No packages available
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {packages.map((pkg) => (
                        <label
                          key={pkg._id}
                          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white cursor-pointer transition-all border border-transparent hover:border-green-200"
                        >
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={formData.packages.includes(pkg._id)}
                              onChange={() => {
                                const newPackages = formData.packages.includes(
                                  pkg._id
                                )
                                  ? formData.packages.filter(
                                      (id) => id !== pkg._id
                                    )
                                  : [...formData.packages, pkg._id];
                                setFormData({
                                  ...formData,
                                  packages: newPackages,
                                });
                              }}
                              className="sr-only"
                            />
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                formData.packages.includes(pkg._id)
                                  ? "bg-green-600 border-green-600"
                                  : "border-gray-300 hover:border-green-400"
                              }`}
                            >
                              {formData.packages.includes(pkg._id) && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-gray-900">
                              {pkg.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ₹{pkg.cost} / {pkg.duration} days
                            </span>
                          </div>
                          {formData.packages.includes(pkg._id) && (
                            <div className="bg-green-100 text-green-600 text-xs font-bold px-2 py-1 rounded">
                              Selected
                            </div>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  {formData.packages.length > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      {formData.packages.length} packages selected
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || balanceError}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 font-semibold"
                >
                  {submitting
                    ? "Saving..."
                    : modalMode === "create"
                    ? "Create Reseller"
                    : "Update Reseller"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedReseller && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete Reseller
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete{" "}
                <span className="font-semibold">{selectedReseller?.name}</span>?
                This action cannot be undone.
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
                    setSelectedReseller(null);
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

export default Resellers;
