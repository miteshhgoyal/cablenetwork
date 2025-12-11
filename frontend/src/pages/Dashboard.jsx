import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";
import {
  Users,
  Package,
  Tv,
  FolderTree,
  Radio,
  UserCheck,
  ShoppingCart,
  IndianRupee,
  RefreshCw,
  UserX,
  UserPlus,
  Building2,
  Store,
  Film,
  Target,
  BarChart3,
  Download, // NEW: Import Download icon
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false); // NEW: Backup loading state

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await api.get("/dashboard/overview");
      setDashboardData(response.data.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // NEW: Handle database backup export
  const handleBackupExport = async () => {
    try {
      setBackupLoading(true);
      const response = await api.get("/dashboard/backup", {
        responseType: "blob", // Important for file download
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      // Filename is set in backend Content-Disposition header
      // But fallback to generic name if not available
      const contentDisposition = response.headers["content-disposition"];
      let filename = "iptv_backup.json";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch?.[1]) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      // Show success feedback
      alert(`✅ Backup exported successfully!\n📁 File: ${filename}`);
    } catch (error) {
      console.error("Backup export failed:", error);
      alert("❌ Failed to export backup. Admin access required.");
    } finally {
      setBackupLoading(false);
    }
  };

  const getStatsConfig = () => {
    if (!dashboardData) return [];

    const { role } = user;
    const stats = dashboardData.stats;

    switch (role) {
      case "admin":
        return [
          {
            title: "Total Distributors",
            value: stats.totalDistributors,
            icon: Building2,
            link: "/admin/distributors",
          },
          {
            title: "Total Resellers",
            value: stats.totalResellers,
            icon: Store,
            link: "/admin/resellers",
          },
          {
            title: "Total Subscribers",
            value: stats.totalSubscribers,
            icon: Users,
            link: "/admin/subscribers",
          },
          {
            title: "Total Categories",
            value: stats.totalCategories,
            icon: FolderTree,
            link: "/admin/categories",
          },
          {
            title: "Total Channels",
            value: stats.totalChannels,
            icon: Radio,
            link: "/admin/channels",
          },
          {
            title: "Total Packages",
            value: stats.totalPackages,
            icon: Package,
            link: "/admin/packages",
          },
          {
            title: "Total OTT",
            value: stats.totalOtt,
            icon: Film,
            link: "/admin/ott",
          },
          {
            title: "Active Subscribers",
            value: stats.activeSubscribers,
            icon: UserCheck,
            link: "/admin/subscribers",
          },
        ];

      case "distributor":
        return [
          {
            title: "Total Resellers",
            value: stats.totalResellers,
            icon: Store,
            link: "/distributor/resellers",
          },
          {
            title: "Total Subscribers",
            value: stats.totalSubscribers,
            icon: Users,
            link: "/distributor/subscribers",
          },
          {
            title: "Total Categories",
            value: stats.totalCategories,
            icon: FolderTree,
            link: "/distributor/categories",
          },
          {
            title: "Total Channels",
            value: stats.totalChannels,
            icon: Radio,
            link: "/distributor/channels",
          },
          {
            title: "Total Packages",
            value: stats.totalPackages,
            icon: Package,
            link: "/distributor/packages",
          },
          {
            title: "Total OTT",
            value: stats.totalOtt,
            icon: Film,
            link: "/distributor/ott",
          },
          {
            title: "Active Subscribers",
            value: stats.activeSubscribers,
            icon: UserCheck,
            link: "/distributor/subscribers",
          },
          {
            title: "Inactive Subscribers",
            value: stats.inactiveSubscribers,
            icon: UserX,
            link: "/distributor/subscribers",
          },
        ];

      case "reseller":
        return [
          {
            title: "Total Subscriptions",
            value: stats.totalSubscribers,
            icon: Users,
            link: "/reseller/subscribers",
          },
          {
            title: "Active Subscribers",
            value: stats.activeSubscribers,
            icon: UserCheck,
            link: "/reseller/subscribers",
          },
          {
            title: "Inactive Subscribers",
            value: stats.inactiveSubscribers,
            icon: UserX,
            link: "/reseller/subscribers",
          },
          {
            title: "Fresh Subscribers",
            value: stats.freshSubscribers,
            icon: UserPlus,
            link: "/reseller/subscribers",
          },
          {
            title: "Total Packages",
            value: stats.totalPackages,
            icon: Package,
            link: "/reseller/packages",
          },
          {
            title: "Subscriber Limit",
            value: stats.subscriberLimit,
            icon: Target,
            link: null,
          },
          {
            title: "Available Slots",
            value: stats.availableSlots,
            icon: BarChart3,
            link: null,
          },
        ];

      default:
        return [];
    }
  };

  const handleTileClick = (link) => {
    if (link) {
      navigate(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const stats = getStatsConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-800 via-blue-900 to-blue-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            {/* Left Side - Welcome Message */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">
                Welcome back, {dashboardData?.user?.name?.toUpperCase()}
              </h1>
              <p className="text-blue-200 text-lg">Dashboard Overview</p>
            </div>

            {/* Right Side - Balance, Refresh & Backup (Admin Only) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="text-right">
                <p className="text-blue-200 text-sm mb-1">Available amount</p>
                <div className="flex items-center space-x-2">
                  <IndianRupee className="w-8 h-8" />
                  <span className="text-4xl sm:text-5xl font-bold">
                    {(dashboardData?.user?.balance || 0).toLocaleString(
                      "en-IN"
                    )}
                  </span>
                </div>
              </div>

              {/* Existing Refresh Button */}
              <button
                onClick={fetchDashboardData}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all disabled:opacity-50 border border-white/20"
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="text-sm">Refresh</span>
              </button>

              {/* NEW: Backup Export Button - Admin Only */}
              {user.role === "admin" && (
                <button
                  onClick={handleBackupExport}
                  disabled={backupLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50 border border-green-400/50 rounded-xl transition-all text-green-100 hover:text-green-50"
                  title="Export complete database backup (JSON)"
                >
                  <Download
                    className={`w-4 h-4 ${backupLoading ? "animate-spin" : ""}`}
                  />
                  <span className="text-sm font-medium">Backup</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            const isClickable = stat.link !== null;

            return (
              <div
                key={index}
                onClick={() => handleTileClick(stat.link)}
                className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-200 transition-all ${
                  isClickable
                    ? "cursor-pointer hover:shadow-lg hover:scale-105 hover:border-blue-300"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-gray-600 text-sm font-medium mb-2">
                      {stat.title}
                    </h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${
                      isClickable
                        ? "bg-blue-50 group-hover:bg-blue-100"
                        : "bg-gray-50"
                    }`}
                  >
                    <IconComponent
                      className={`h-6 w-6 ${
                        isClickable ? "text-blue-600" : "text-gray-600"
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
