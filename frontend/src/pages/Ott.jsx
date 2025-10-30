import React, { useState, useEffect } from "react";
import api from "../services/api.js";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader,
  Film,
  Filter,
  Tv,
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const Ott = () => {
  const [ottContent, setOttContent] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedOtt, setSelectedOtt] = useState(null);
  const [formData, setFormData] = useState({
    type: "Movie",
    title: "",
    genre: "",
    language: "",
    mediaUrl: "",
    horizontalUrl: "",
    verticalUrl: "",
    seasonsCount: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importError, setImportError] = useState("");
  const [importPreview, setImportPreview] = useState([]);
  const [importSuccess, setImportSuccess] = useState("");

  useEffect(() => {
    fetchOttContent();
    fetchCategories();
  }, [typeFilter]);

  const fetchOttContent = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.append("type", typeFilter);

      const response = await api.get(`/ott?${params.toString()}`);
      setOttContent(response.data.data.ottContent);
    } catch (error) {
      console.error("Failed to fetch OTT content:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/ott/categories");
      setLanguages(response.data.data.languages);
      setGenres(response.data.data.genres);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleOpenModal = (mode, ott = null) => {
    setModalMode(mode);
    if (mode === "edit" && ott) {
      setSelectedOtt(ott);
      setFormData({
        type: ott.type,
        title: ott.title,
        genre: ott.genre?._id || "",
        language: ott.language?._id || "",
        mediaUrl: ott.mediaUrl,
        horizontalUrl: ott.horizontalUrl,
        verticalUrl: ott.verticalUrl,
        seasonsCount: ott.seasonsCount || "",
      });
    } else {
      setFormData({
        type: "Movie",
        title: "",
        genre: "",
        language: "",
        mediaUrl: "",
        horizontalUrl: "",
        verticalUrl: "",
        seasonsCount: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedOtt(null);
    setFormData({
      type: "Movie",
      title: "",
      genre: "",
      language: "",
      mediaUrl: "",
      horizontalUrl: "",
      verticalUrl: "",
      seasonsCount: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modalMode === "create") {
        await api.post("/ott", formData);
      } else {
        await api.put(`/ott/${selectedOtt._id}`, formData);
      }
      fetchOttContent();
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
      await api.delete(`/ott/${selectedOtt._id}`);
      fetchOttContent();
      setShowDeleteModal(false);
      setSelectedOtt(null);
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.response?.data?.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Import Modal Functions
  const handleOpenImportModal = () => {
    setShowImportModal(true);
    setImportFile(null);
    setImportError("");
    setImportPreview([]);
    setImportSuccess("");
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportError("");
    setImportPreview([]);
    setImportSuccess("");
  };

  const parseCSV = (csvText) => {
    try {
      const lines = csvText.trim().split("\n");
      if (lines.length < 2) {
        setImportError("CSV file is empty or has no data rows");
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

      // Validate required headers
      const requiredHeaders = [
        "type",
        "title",
        "genre",
        "language",
        "mediaurl",
        "horizontalurl",
        "verticalurl",
      ];

      const missingHeaders = requiredHeaders.filter(
        (h) => !headers.includes(h)
      );

      if (missingHeaders.length > 0) {
        setImportError(
          `Missing required columns: ${missingHeaders.join(", ")}`
        );
        return;
      }

      // Parse data rows
      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(",").map((v) => v.trim());
        const row = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        // Validate row data
        if (!row.type || !row.title || !row.genre || !row.language) {
          setImportError(`Row ${i}: Missing required fields`);
          return;
        }

        // Find genre and language IDs
        const genreMatch = genres.find(
          (g) => g.name.toLowerCase() === row.genre.toLowerCase()
        );
        const languageMatch = languages.find(
          (l) => l.name.toLowerCase() === row.language.toLowerCase()
        );

        if (!genreMatch) {
          setImportError(`Row ${i}: Genre "${row.genre}" not found`);
          return;
        }

        if (!languageMatch) {
          setImportError(`Row ${i}: Language "${row.language}" not found`);
          return;
        }

        parsedData.push({
          type: row.type,
          title: row.title,
          genre: genreMatch._id,
          language: languageMatch._id,
          mediaUrl: row.mediaurl,
          horizontalUrl: row.horizontalurl,
          verticalUrl: row.verticalurl,
          seasonsCount: row.seasonscount || "",
        });
      }

      setImportPreview(parsedData);
      setImportError("");
      setImportSuccess(`Successfully parsed ${parsedData.length} rows`);
    } catch (error) {
      setImportError(`Error parsing CSV: ${error.message}`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    const fileType = file.name.split(".").pop().toLowerCase();
    if (!["csv"].includes(fileType)) {
      setImportError("Please upload a CSV file");
      return;
    }

    setImportFile(file);
    setImportError("");
    setImportSuccess("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target.result;
      parseCSV(csvData);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    if (importPreview.length === 0) {
      setImportError("No data to import");
      return;
    }

    setSubmitting(true);
    try {
      // Import each row
      for (const item of importPreview) {
        await api.post("/ott", item);
      }

      setImportSuccess(`Successfully imported ${importPreview.length} items!`);
      fetchOttContent();

      setTimeout(() => {
        handleCloseImportModal();
      }, 2000);
    } catch (error) {
      setImportError(error.response?.data?.message || "Failed to import data");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      "type,title,genre,language,mediaUrl,horizontalUrl,verticalUrl,seasonsCount",
      "Movie,Sample Movie,Action,English,https://example.com/movie.mp4,https://example.com/h.jpg,https://example.com/v.jpg,",
      "Web Series,Sample Series,Drama,Hindi,https://example.com/series.mp4,https://example.com/h2.jpg,https://example.com/v2.jpg,2",
    ].join("\n");

    const blob = new Blob([sampleData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ott_import_sample.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredOttContent = ottContent.filter((ott) =>
    ott.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <Film className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  OTT Content
                </h1>
                <p className="text-sm text-gray-600">
                  Manage movies and web series
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
                onClick={handleOpenImportModal}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Import CSV</span>
              </button>
              <button
                onClick={() => handleOpenModal("create")}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Content</span>
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
              placeholder="Search by title..."
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
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="Movie">Movie</option>
                    <option value="Web Series">Web Series</option>
                  </select>
                </div>
              </div>

              {typeFilter && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setTypeFilter("")}
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
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Genre
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Language
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Seasons
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOttContent.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <p className="text-gray-500">No OTT content found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredOttContent.map((ott, index) => (
                      <tr
                        key={ott._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              ott.type === "Movie"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {ott.type === "Movie" ? (
                              <Film className="w-3 h-3 mr-1" />
                            ) : (
                              <Tv className="w-3 h-3 mr-1" />
                            )}
                            {ott.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {ott.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {ott.genre?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {ott.language?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {ott.type === "Web Series"
                            ? ott.seasonsCount || 0
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleOpenModal("edit", ott)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedOtt(ott);
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
                {modalMode === "create"
                  ? "Add OTT Content"
                  : "Edit OTT Content"}
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
                {/* Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="Movie">Movie</option>
                    <option value="Web Series">Web Series</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Enter title"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Genre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Genre *
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

                {/* Language */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Language *
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

                {/* Seasons Count (only for Web Series) */}
                {formData.type === "Web Series" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Seasons Count *
                    </label>
                    <input
                      type="number"
                      value={formData.seasonsCount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seasonsCount: e.target.value,
                        })
                      }
                      placeholder="Enter number of seasons"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required={formData.type === "Web Series"}
                      min="1"
                    />
                  </div>
                )}

                {/* Media URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Media URL *
                  </label>
                  <input
                    type="url"
                    value={formData.mediaUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, mediaUrl: e.target.value })
                    }
                    placeholder="https://example.com/media"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Horizontal URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Horizontal Poster URL *
                  </label>
                  <input
                    type="url"
                    value={formData.horizontalUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        horizontalUrl: e.target.value,
                      })
                    }
                    placeholder="https://example.com/horizontal-poster.jpg"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Vertical URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vertical Poster URL *
                  </label>
                  <input
                    type="url"
                    value={formData.verticalUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, verticalUrl: e.target.value })
                    }
                    placeholder="https://example.com/vertical-poster.jpg"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
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
                    ? "Create Content"
                    : "Update Content"}
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Import OTT Content from CSV
              </h2>
              <button
                onClick={handleCloseImportModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* CSV Format Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      CSV File Format
                    </h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Your CSV file must include the following columns in this
                      exact order:
                    </p>
                    <div className="bg-white rounded-lg p-3 font-mono text-xs text-gray-700 overflow-x-auto">
                      type,title,genre,language,mediaUrl,horizontalUrl,verticalUrl,seasonsCount
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-blue-800">
                      <p>
                        <strong>• type:</strong> Must be "Movie" or "Web Series"
                      </p>
                      <p>
                        <strong>• genre:</strong> Must match existing genre
                        names exactly
                      </p>
                      <p>
                        <strong>• language:</strong> Must match existing
                        language names exactly
                      </p>
                      <p>
                        <strong>• seasonsCount:</strong> Required for Web
                        Series, leave empty for Movies
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Sample */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Download className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      Download Sample CSV
                    </p>
                    <p className="text-sm text-gray-600">
                      Get a template file with the correct format
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadSampleCSV}
                  className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-medium"
                >
                  Download
                </button>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Upload CSV File
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-900 border border-gray-200 rounded-xl cursor-pointer bg-gray-50 focus:outline-none file:mr-4 file:py-3 file:px-4 file:rounded-l-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              {/* Error Message */}
              {importError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 mb-1">
                        Import Error
                      </h4>
                      <p className="text-sm text-red-800">{importError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {importSuccess && !importError && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-900 mb-1">
                        File Parsed Successfully
                      </h4>
                      <p className="text-sm text-green-800">{importSuccess}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    Preview ({importPreview.length} items)
                  </h3>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                            Type
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                            Title
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                            Genre
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                            Language
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                            Seasons
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {importPreview.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-900">
                              {item.type}
                            </td>
                            <td className="px-4 py-2 text-gray-900">
                              {item.title}
                            </td>
                            <td className="px-4 py-2 text-gray-900">
                              {genres.find((g) => g._id === item.genre)?.name}
                            </td>
                            <td className="px-4 py-2 text-gray-900">
                              {
                                languages.find((l) => l._id === item.language)
                                  ?.name
                              }
                            </td>
                            <td className="px-4 py-2 text-gray-900">
                              {item.seasonsCount || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleImportSubmit}
                  disabled={submitting || importPreview.length === 0}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>
                        Import {importPreview.length} Item
                        {importPreview.length !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseImportModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
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
                Delete OTT Content
              </h2>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete "
                <span className="font-semibold">{selectedOtt?.title}</span>"?
                This action cannot be undone.
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
                    setSelectedOtt(null);
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

export default Ott;
