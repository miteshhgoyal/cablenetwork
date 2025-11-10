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

      const parsedData = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = line.split(",").map((v) => v.trim());
        const row = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });

        if (!row.type || !row.title || !row.genre || !row.language) {
          setImportError(`Row ${i}: Missing required fields`);
          return;
        }

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

  // Group OTT content by language
  const groupContentByLanguage = (contentList) => {
    const grouped = contentList.reduce((acc, content) => {
      const languageName = content.language?.name || "Unknown Language";
      if (!acc[languageName]) {
        acc[languageName] = [];
      }
      acc[languageName].push(content);
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

  const filteredOttContent = ottContent.filter((ott) =>
    ott.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedContent = groupContentByLanguage(filteredOttContent);

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

        {/* Grouped Content by Language */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : Object.keys(groupedContent).length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <p className="text-center text-gray-500">No OTT content found</p>
          </div>
        ) : (
          Object.entries(groupedContent).map(([language, languageContent]) => (
            <div key={language} className="mb-8">
              {/* Language Heading */}
              <h3 className="text-xl font-bold text-gray-900 mb-4 px-2 flex items-center">
                <span className="inline-block w-1 h-6 bg-blue-600 mr-3 rounded"></span>
                {language}
                <span className="ml-3 text-sm font-normal text-gray-500">
                  ({languageContent.length}{" "}
                  {languageContent.length === 1 ? "item" : "items"})
                </span>
              </h3>

              {/* Content Table for this Language */}
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
                          Seasons
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {languageContent.map((ott, index) => (
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal - Keep existing modal code */}
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

      {/* Keep existing Import Modal and Delete Modal code unchanged */}
      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* Keep existing import modal code */}
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
