// frontend/src/pages/profile/Profile.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import api from "../services/api.js";
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Package,
  Edit2,
  Save,
  X,
  Eye,
  EyeOff,
  Loader,
  CheckCircle,
  AlertCircle,
  IndianRupee,
  Clock,
  UserCheck,
} from "lucide-react";

const Profile = () => {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    currentPassword: "",
    newPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get("/profile");
      setProfile(response.data.data.user);
      setFormData({
        name: response.data.data.user.name,
        phone: response.data.data.user.phone,
        currentPassword: "",
        newPassword: "",
      });
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setMessage({ type: "", text: "" });
  };

  const handleCancel = () => {
    setEditing(false);
    setShowPasswordFields(false);
    setFormData({
      name: profile.name,
      phone: profile.phone,
      currentPassword: "",
      newPassword: "",
    });
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const updateData = {
        name: formData.name,
        phone: formData.phone,
      };

      // Only include password fields if user wants to change password
      if (showPasswordFields && formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await api.put("/profile", updateData);
      setProfile(response.data.data.user);
      setEditing(false);
      setShowPasswordFields(false);
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
      });
      setMessage({ type: "success", text: "Profile updated successfully!" });

      // Clear success message after 3 seconds
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (error) {
      console.error("Update error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to update profile",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">{profile?.name}</h1>
              <p className="text-blue-100 flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span className="uppercase text-sm font-medium">
                  {profile?.role}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl border-2 flex items-center space-x-3 ${
              message.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="space-y-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="flex items-center space-x-2 mb-2">
                <IndianRupee className="w-5 h-5" />
                <p className="text-blue-100 text-sm">Credit</p>
              </div>
              <p className="text-4xl font-bold">
                {(profile?.balance || 0).toLocaleString("en-IN")}
              </p>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Account Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      profile?.status === "Active"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {profile?.status}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Member Since</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(profile?.createdAt)}
                  </span>
                </div>
                {profile?.subscriberLimit && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">
                      Subscriber Limit
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {profile.subscriberLimit}
                    </span>
                  </div>
                )}
                {profile?.partnerCode && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-600">Partner Code</span>
                    <span className="text-sm font-mono font-medium text-gray-900">
                      {profile.partnerCode}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Packages (if any) */}
            {profile?.packages && profile.packages.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-600" />
                  Assigned Packages
                </h3>
                <div className="space-y-2">
                  {profile.packages.map((pkg) => (
                    <div
                      key={pkg._id}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200"
                    >
                      <p className="font-semibold text-gray-900 text-sm">
                        {pkg.name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-600">
                          ₹{pkg.cost}
                        </span>
                        <span className="text-xs text-gray-600">
                          {pkg.duration} days
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Profile Details
                </h2>
                {!editing && (
                  <button
                    onClick={handleEdit}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      disabled={!editing}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                      required
                    />
                  </div>
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={profile?.email}
                      disabled
                      className="w-full pl-12 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      disabled={!editing}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                      required
                    />
                  </div>
                </div>

                {/* Change Password Section */}
                {editing && (
                  <div className="pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {showPasswordFields
                        ? "Cancel Password Change"
                        : "Change Password"}
                    </button>

                    {showPasswordFields && (
                      <div className="mt-4 space-y-4">
                        {/* Current Password */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              value={formData.currentPassword}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  currentPassword: e.target.value,
                                })
                              }
                              placeholder="Enter current password"
                              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowCurrentPassword(!showCurrentPassword)
                              }
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* New Password */}
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={formData.newPassword}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  newPassword: e.target.value,
                                })
                              }
                              placeholder="Enter new password (min 6 characters)"
                              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              minLength="6"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowNewPassword(!showNewPassword)
                              }
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showNewPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {editing && (
                  <div className="flex items-center space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 font-medium"
                    >
                      {submitting ? (
                        <>
                          <Loader className="w-5 h-5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                    >
                      <X className="w-5 h-5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
