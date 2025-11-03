// frontend/src/pages/resellers/Resellers.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import api from "../services/api.js";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader,
  Users,
  Filter,
  Eye,
  EyeOff,
} from "lucide-react";

const Resellers = () => {
  const { user } = useAuth();
  const [resellers, setResellers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    subscriberLimit: "",
    partnerCode: "",
    packages: [],
    status: "Active",
  });
  const [submitting, setSubmitting] = useState(false);

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
    if (mode === "edit" && reseller) {
      setSelectedReseller(reseller);
      setFormData({
        name: reseller.name,
        email: reseller.email,
        password: "", // Don't show password
        phone: reseller.phone,
        subscriberLimit: reseller.subscriberLimit || "",
        partnerCode: reseller.partnerCode || "",
        packages: reseller.packages?.map((p) => p._id) || [],
        status: reseller.status,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        subscriberLimit: "",
        partnerCode: "",
        packages: [],
        status: "Active",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedReseller(null);
    setShowPassword(false);
    setFormData({
      name: "",
      email: "",
      password: "",
      phone: "",
      subscriberLimit: "",
      partnerCode: "",
      packages: [],
      status: "Active",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submitData = { ...formData };

      // Remove password if empty during edit
      if (modalMode === "edit" && !submitData.password) {
        delete submitData.password;
      }

      if (modalMode === "create") {
        await api.post("/resellers", submitData);
      } else {
        await api.put(`/resellers/${selectedReseller._id}`, submitData);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Resellers</h1>
                <p className="text-sm text-gray-600">
                  Manage reseller accounts and permissions
                </p>
              </div>
            </div>
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
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Reseller</span>
              </button>
            </div>
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
              placeholder="Search by name, email, phone, or partner code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
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
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredResellers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <p className="text-gray-500">No resellers found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredResellers.map((reseller, index) => (
                      <tr
                        key={reseller._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {reseller.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {reseller.email}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {reseller.phone}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-col space-y-1">
                            <span className="text-gray-900 font-medium">
                              {reseller.createdBy?.name || "N/A"}
                            </span>
                            <span className="text-gray-500 text-xs">
                              {reseller.createdBy?.email || ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              reseller.status === "Active"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {reseller.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenModal("edit", reseller)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReseller(reseller);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === "create" ? "Add Reseller" : "Edit Reseller"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password {modalMode === "create" ? "*" : "(Optional)"}
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
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                      required={modalMode === "create"}
                      minLength="6"
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

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Enter phone"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Subscriber Limit */}
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
                    placeholder="Enter limit"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                {/* Partner Code */}
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
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Status *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Packages */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Packages (Optional)
                  </label>
                  <select
                    multiple
                    value={formData.packages}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        packages: Array.from(
                          e.target.selectedOptions,
                          (option) => option.value
                        ),
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    size="5"
                  >
                    {packages.map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} - ₹{pkg.cost}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Hold Ctrl/Cmd to select multiple
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 font-medium"
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
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete Reseller
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete "
                <span className="font-semibold">{selectedReseller?.name}</span>
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
                    setSelectedReseller(null);
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

export default Resellers;
