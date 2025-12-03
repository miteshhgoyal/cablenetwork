// frontend/src/pages/channels/Channels.jsx
import React, { useState, useEffect } from "react";
import api from "../services/api.js";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader,
  Radio,
  ExternalLink,
  Lock,
  Unlock,
  AlertCircle,
} from "lucide-react";

const Channels = () => {
  const [channels, setChannels] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [userRole, setUserRole] = useState("user");
  const [canAccessUrls, setCanAccessUrls] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [urlAccessToggling, setUrlAccessToggling] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    lcn: "",
    language: "",
    genre: "",
    url: "",
    imageUrl: "",
  });

  useEffect(() => {
    fetchChannels();
    fetchCategories();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const response = await api.get("/channels");
      setChannels(response.data.data.channels);
      setUserRole(response.data.data.userRole || "user");
      setCanAccessUrls(response.data.data.canAccessUrls || false);
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/channels/categories");
      setLanguages(response.data.data.languages);
      setGenres(response.data.data.genres);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleOpenModal = (mode, channel = null) => {
    setModalMode(mode);
    if (mode === "edit" && channel) {
      setSelectedChannel(channel);
      setFormData({
        name: channel.name,
        lcn: channel.lcn,
        language: channel.language?._id || "",
        genre: channel.genre?._id || "",
        url: channel.url || "",
        imageUrl: channel.imageUrl || "",
      });
    } else {
      setSelectedChannel(null);
      setFormData({
        name: "",
        lcn: "",
        language: "",
        genre: "",
        url: "",
        imageUrl: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedChannel(null);
    setFormData({
      name: "",
      lcn: "",
      language: "",
      genre: "",
      url: "",
      imageUrl: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await api.post("/channels", formData);
      } else {
        await api.put(`/channels/${selectedChannel._id}`, formData);
      }
      fetchChannels();
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
      await api.delete(`/channels/${selectedChannel._id}`);
      fetchChannels();
      setShowDeleteModal(false);
      setSelectedChannel(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.response?.data?.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUrlAccess = async (channel) => {
    if (userRole !== "admin") return;

    setUrlAccessToggling(channel._id);
    try {
      await api.patch(`/channels/${channel._id}/toggle-urls-access`);
      fetchChannels();
    } catch (error) {
      console.error("Toggle URL access error:", error);
      alert(error.response?.data?.message || "Failed to toggle URL access");
    } finally {
      setUrlAccessToggling(null);
    }
  };

  const canEditUrlFields = () => {
    if (userRole === "admin") return true;
    if (userRole === "distributor" && selectedChannel) {
      return selectedChannel.urlsAccessible;
    }
    return false;
  };

  const shouldShowUrlFields = () => {
    if (userRole === "admin") return true;
    if (userRole === "distributor") return true;
    return canAccessUrls;
  };

  // Only admin can edit LCN
  const canEditLcn = () => {
    return userRole === "admin";
  };

  // Group channels by language
  const groupChannelsByLanguage = (channelsList) => {
    const grouped = channelsList.reduce((acc, channel) => {
      const languageName = channel.language?.name || "Unknown Language";
      if (!acc[languageName]) {
        acc[languageName] = [];
      }
      acc[languageName].push(channel);
      return acc;
    }, {});

    // Sort languages alphabetically
    return Object.keys(grouped)
      .sort()
      .reduce((acc, key) => {
        acc[key] = grouped[key];
        return acc;
      }, {});
  };

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedChannels = groupChannelsByLanguage(filteredChannels);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Radio className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
                <p className="text-sm text-gray-600">
                  Manage TV channels and streams
                </p>
              </div>
            </div>
            {userRole === "admin" && (
              <button
                onClick={() => handleOpenModal("create")}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Channel</span>
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
              placeholder="Search channels..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Access Alert for Non-Admins */}
        {userRole !== "admin" && !canAccessUrls && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">Limited Access</h3>
              <p className="text-sm text-amber-700">
                You don't have permission to view or edit stream URLs and images
                for these channels. Contact your administrator for access.
              </p>
            </div>
          </div>
        )}

        {/* Grouped Channels by Language */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : Object.keys(groupedChannels).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <p className="text-center text-gray-500">No channels found</p>
          </div>
        ) : (
          Object.entries(groupedChannels).map(
            ([language, languageChannels]) => (
              <div key={language} className="mb-8">
                {/* Language Heading */}
                <h3 className="text-xl font-bold text-gray-900 mb-4 px-2 flex items-center">
                  <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded"></span>
                  {language}
                  <span className="ml-3 text-sm font-normal text-gray-500">
                    ({languageChannels.length}{" "}
                    {languageChannels.length === 1 ? "channel" : "channels"})
                  </span>
                </h3>

                {/* Channels Table for this Language */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            S.No
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Channel Name
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            LCN
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Genre
                          </th>
                          {userRole === "admin" && (
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              URL Access
                            </th>
                          )}
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {languageChannels.map((channel, index) => (
                          <tr
                            key={channel._id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {channel.name}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {channel.lcn}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              {channel.genre?.name || "N/A"}
                            </td>
                            {userRole === "admin" && (
                              <td className="px-6 py-4 text-sm">
                                <button
                                  onClick={() => handleToggleUrlAccess(channel)}
                                  disabled={urlAccessToggling === channel._id}
                                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                                    channel.urlsAccessible
                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                      : "bg-red-100 text-red-700 hover:bg-red-200"
                                  } disabled:opacity-50`}
                                >
                                  {urlAccessToggling === channel._id ? (
                                    <Loader className="w-4 h-4 animate-spin" />
                                  ) : channel.urlsAccessible ? (
                                    <Unlock className="w-4 h-4" />
                                  ) : (
                                    <Lock className="w-4 h-4" />
                                  )}
                                  <span className="text-xs font-semibold">
                                    {channel.urlsAccessible
                                      ? "Enabled"
                                      : "Disabled"}
                                  </span>
                                </button>
                              </td>
                            )}
                            <td className="px-6 py-4 text-sm text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {(userRole === "admin" ||
                                  userRole === "distributor") && (
                                  <button
                                    onClick={() =>
                                      handleOpenModal("edit", channel)
                                    }
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center justify-center"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                {userRole === "admin" && (
                                  <button
                                    onClick={() => {
                                      setSelectedChannel(channel);
                                      setShowDeleteModal(true);
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all inline-flex items-center justify-center"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          )
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === "create" ? "Add Channel" : "Edit Channel"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Channel Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Channel Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter channel name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* LCN Number */}
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      LCN Number
                    </label>
                    {userRole !== "admin" && (
                      <Lock className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <input
                    type="number"
                    value={formData.lcn}
                    onChange={(e) =>
                      setFormData({ ...formData, lcn: e.target.value })
                    }
                    placeholder="Enter LCN"
                    disabled={!canEditLcn()}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      !canEditLcn()
                        ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-gray-50 border-gray-200"
                    }`}
                    required
                  />
                  {userRole !== "admin" && (
                    <p className="text-xs text-gray-500 mt-1">
                      Only administrators can modify LCN numbers.
                    </p>
                  )}
                </div>

                {/* Language Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) =>
                      setFormData({ ...formData, language: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Language</option>
                    {languages.map((lang) => (
                      <option key={lang._id} value={lang._id}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Genre Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Genre
                  </label>
                  <select
                    value={formData.genre}
                    onChange={(e) =>
                      setFormData({ ...formData, genre: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Genre</option>
                    {genres.map((genre) => (
                      <option key={genre._id} value={genre._id}>
                        {genre.name}
                      </option>
                    ))}
                  </select>
                </div>

                {shouldShowUrlFields() &&
                  (userRole === "admin" ||
                  (userRole === "distributor" &&
                    selectedChannel &&
                    selectedChannel.urlsAccessible) ? (
                    <>
                      <div className="md:col-span-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Stream URL
                          </label>
                          {userRole === "distributor" &&
                            !canEditUrlFields() && (
                              <Lock className="w-4 h-4 text-red-500" />
                            )}
                        </div>
                        <input
                          type="url"
                          value={formData.url}
                          onChange={(e) =>
                            setFormData({ ...formData, url: e.target.value })
                          }
                          placeholder="https://example.com/stream"
                          disabled={!canEditUrlFields()}
                          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            !canEditUrlFields()
                              ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-gray-50 border-gray-200"
                          }`}
                          required
                        />
                      </div>

                      {/* Image URL */}
                      <div className="md:col-span-2">
                        <div className="flex items-center space-x-2 mb-2">
                          <label className="block text-sm font-semibold text-gray-700">
                            Image URL
                          </label>
                          {userRole === "distributor" &&
                            !canEditUrlFields() && (
                              <Lock className="w-4 h-4 text-red-500" />
                            )}
                        </div>
                        <input
                          type="url"
                          value={formData.imageUrl}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              imageUrl: e.target.value,
                            })
                          }
                          placeholder="https://example.com/image.jpg"
                          disabled={!canEditUrlFields()}
                          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            !canEditUrlFields()
                              ? "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed"
                              : "bg-gray-50 border-gray-200"
                          }`}
                          required
                        />
                      </div>
                    </>
                  ) : userRole === "distributor" &&
                    selectedChannel &&
                    !selectedChannel.urlsAccessible ? (
                    <div className="md:col-span-2 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3">
                      <Lock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-red-900">
                          URL Access Restricted
                        </h3>
                        <p className="text-sm text-red-700">
                          You don't have permission to view or edit stream URLs
                          and images for this channel. Contact your
                          administrator to enable access.
                        </p>
                      </div>
                    </div>
                  ) : null)}
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
                    ? "Create Channel"
                    : "Update Channel"}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                Delete Channel
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete "
                <span className="font-semibold">{selectedChannel?.name}</span>
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
                    setSelectedChannel(null);
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

export default Channels;
