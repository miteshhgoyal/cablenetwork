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
  Package as PackageIcon,
  Eye,
  IndianRupee,
  Calendar,
  Check,
} from "lucide-react";

const Packages = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState([]);
  const [genres, setGenres] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    cost: "",
    genres: [],
    channels: [],
    duration: "",
    defaultChannelId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const canModify = user?.role === "admin";

  useEffect(() => {
    fetchPackages();
    if (canModify) {
      fetchOptions();
    }
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await api.get("/packages");
      setPackages(response.data.data.packages);
    } catch (error) {
      console.error("Failed to fetch packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const response = await api.get("/packages/options");
      setGenres(response.data.data.genres);
      setChannels(response.data.data.channels);
    } catch (error) {
      console.error("Failed to fetch options:", error);
    }
  };

  const handleOpenModal = (mode, pkg = null) => {
    setModalMode(mode);
    if (mode === "edit" && pkg) {
      setSelectedPackage(pkg);
      setFormData({
        name: pkg.name,
        cost: pkg.cost,
        genres: pkg.genres?.map((g) => g._id) || [],
        channels: pkg.channels?.map((c) => c._id) || [],
        duration: pkg.duration,
        defaultChannelId: pkg.defaultChannelId?._id || "",
      });
    } else {
      setFormData({
        name: "",
        cost: "",
        genres: [],
        channels: [],
        duration: "",
        defaultChannelId: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPackage(null);
    setFormData({
      name: "",
      cost: "",
      genres: [],
      channels: [],
      duration: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await api.post("/packages", formData);
      } else {
        await api.put(`/packages/${selectedPackage._id}`, formData);
      }
      fetchPackages();
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
      await api.delete(`/packages/${selectedPackage._id}`);
      fetchPackages();
      setShowDeleteModal(false);
      setSelectedPackage(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.response?.data?.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (pkg) => {
    setSelectedPackage(pkg);
    setShowViewModal(true);
  };

  const filteredPackages = packages.filter((pkg) =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDurationText = (days) => {
    if (days >= 365) {
      const years = Math.floor(days / 365);
      return `${years} Year${years > 1 ? "s" : ""}`;
    } else if (days >= 30) {
      const months = Math.floor(days / 30);
      return `${months} Month${months > 1 ? "s" : ""}`;
    }
    return `${days} Day${days > 1 ? "s" : ""}`;
  };

  // ✅ PERFECTED GENRE/CHANNEL AUTO-SELECTION LOGIC
  const toggleGenre = (genreId) => {
    if (formData.genres.includes(genreId)) {
      // Deselect genre and remove ALL channels of this genre
      setFormData({
        ...formData,
        genres: formData.genres.filter((id) => id !== genreId),
        channels: formData.channels.filter((channelId) => {
          const channel = channels.find((c) => c._id === channelId);
          return !channel?.genre?._id === genreId; // Keep channels NOT belonging to this genre
        }),
      });
    } else {
      // Select genre and ADD all channels of this genre (without duplicates)
      const matchingChannels = channels
        .filter((channel) => channel.genre?._id === genreId)
        .map((channel) => channel._id);

      setFormData({
        ...formData,
        genres: [...formData.genres, genreId],
        channels: [
          // Keep existing channels that don't belong to this genre
          ...formData.channels.filter((channelId) => {
            const channel = channels.find((c) => c._id === channelId);
            return !channel?.genre?._id === genreId;
          }),
          // Add all channels from this genre
          ...matchingChannels,
        ],
      });
    }
  };

  const toggleChannel = (channelId) => {
    if (formData.channels.includes(channelId)) {
      setFormData({
        ...formData,
        channels: formData.channels.filter((id) => id !== channelId),
      });
    } else {
      setFormData({
        ...formData,
        channels: [...formData.channels, channelId],
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <PackageIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Packages</h1>
                <p className="text-sm text-gray-600">
                  {canModify
                    ? "Manage subscription packages"
                    : "View available packages"}
                </p>
              </div>
            </div>
            {canModify && (
              <button
                onClick={() => handleOpenModal("create")}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Package</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search packages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
                      Package Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPackages.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center">
                        <p className="text-gray-500">No packages found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPackages.map((pkg, index) => (
                      <tr
                        key={pkg._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {pkg.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center">
                            <IndianRupee className="w-4 h-4 mr-1" />
                            {pkg.cost}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {getDurationText(pkg.duration)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleViewDetails(pkg)}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {canModify && (
                              <>
                                <button
                                  onClick={() => handleOpenModal("edit", pkg)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedPackage(pkg);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
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

      {/* Add/Edit Modal (Only for admin) */}
      {showModal && canModify && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === "create" ? "Add Package" : "Edit Package"}
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
                {/* Package Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Package Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter package name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Cost */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({ ...formData, cost: e.target.value })
                    }
                    placeholder="Enter cost"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    min="0"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({ ...formData, duration: e.target.value })
                    }
                    placeholder="Enter duration in days"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    min="1"
                  />
                </div>

                {/* 🎯 GENRES SECTION - Auto-selects channels */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Genres (Auto-selects all channels)
                  </label>
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 max-h-48 overflow-y-auto">
                    {genres.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No genres available
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {genres.map((genre) => {
                          const channelCount = channels.filter(
                            (c) => c.genre?._id === genre._id
                          ).length;
                          return (
                            <label
                              key={genre._id}
                              className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-md cursor-pointer transition-all border border-gray-100 hover:border-emerald-300"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="relative">
                                  <input
                                    type="checkbox"
                                    checked={formData.genres.includes(
                                      genre._id
                                    )}
                                    onChange={() => toggleGenre(genre._id)}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shadow-sm ${
                                      formData.genres.includes(genre._id)
                                        ? "bg-emerald-500 border-emerald-500"
                                        : "border-gray-300 hover:border-emerald-400 bg-white"
                                    }`}
                                  >
                                    {formData.genres.includes(genre._id) && (
                                      <Check className="w-4 h-4 text-white" />
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-gray-900">
                                    {genre.name}
                                  </div>
                                  <div className="text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                    {channelCount} channels
                                  </div>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Tick genre → All {formData.channels.length} channels
                    auto-selected
                  </p>
                </div>

                {/* Channels Section */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Channels ({formData.channels.length})
                  </label>
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 max-h-60 overflow-y-auto">
                    {channels.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No channels available
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {channels.map((channel) => (
                          <label
                            key={channel._id}
                            className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all border ${
                              formData.channels.includes(channel._id)
                                ? "bg-blue-200 border-blue-400"
                                : "bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50"
                            }`}
                          >
                            <div className="relative flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={formData.channels.includes(
                                  channel._id
                                )}
                                onChange={() => toggleChannel(channel._id)}
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                  formData.channels.includes(channel._id)
                                    ? "bg-blue-600 border-blue-600"
                                    : "border-gray-300 hover:border-blue-400"
                                }`}
                              >
                                {formData.channels.includes(channel._id) && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-xs bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                {channel.lcn}
                              </div>
                              <div className="text-xs font-medium text-gray-900 truncate">
                                {channel.name}
                              </div>
                              {channel.genre && (
                                <div className="text-xs text-gray-500">
                                  {channel.genre.name}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Default Channel Dropdown (Admin only) */}
                {user?.role === "admin" && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Default Channel (Required)
                    </label>
                    <select
                      value={formData.defaultChannelId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          defaultChannelId: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={formData.channels.length > 0}
                      disabled={formData.channels.length === 0}
                    >
                      <option value="">
                        {formData.channels.length === 0
                          ? "Select channels first"
                          : "Select default channel"}
                      </option>
                      {channels
                        .filter((c) => formData.channels.includes(c._id))
                        .map((channel) => (
                          <option key={channel._id} value={channel._id}>
                            {channel.lcn} - {channel.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
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
                    ? "Create Package"
                    : "Update Package"}
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

      {/* View Details Modal (For all roles) */}
      {showViewModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Package Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Package Name
                  </label>
                  <p className="text-base text-gray-900">
                    {selectedPackage.name}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Cost
                  </label>
                  <p className="text-base text-gray-900 flex items-center">
                    <IndianRupee className="w-4 h-4 mr-1" />
                    {selectedPackage.cost}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1">
                    Duration
                  </label>
                  <p className="text-base text-gray-900">
                    {getDurationText(selectedPackage.duration)}
                  </p>
                </div>
              </div>

              {/* Genres */}
              {selectedPackage.genres && selectedPackage.genres.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Genres ({selectedPackage.genres.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedPackage.genres.map((genre) => (
                      <span
                        key={genre._id}
                        className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium border border-purple-200"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Channels */}
              {selectedPackage.channels &&
                selectedPackage.channels.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-2">
                      Channels ({selectedPackage.channels.length})
                    </label>
                    <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {selectedPackage.channels.map((channel) => (
                          <div
                            key={channel._id}
                            className="flex items-center space-x-2 text-sm text-gray-900"
                          >
                            <span className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200">
                              {channel.lcn}
                            </span>
                            <span>{channel.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>

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

      {/* Delete Modal (Only for admin) */}
      {showDeleteModal && canModify && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete Package
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete "
                <span className="font-semibold">{selectedPackage?.name}</span>
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
                    setSelectedPackage(null);
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

export default Packages;
