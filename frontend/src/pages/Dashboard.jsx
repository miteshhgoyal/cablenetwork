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
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

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

  const handleBackupExport = async () => {
    try {
      setBackupLoading(true);
      const response = await api.get("/dashboard/backup", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      const contentDisposition = response.headers["content-disposition"];
      let filename = "iptv_backup.zip";
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

      alert(`Backup exported successfully!\nFile: ${filename}`);
    } catch (error) {
      console.error("Backup export failed:", error);
      alert("Failed to export backup. Admin access required.");
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
            color: "blue",
          },
          {
            title: "Total Resellers",
            value: stats.totalResellers,
            icon: Store,
            link: "/admin/resellers",
            color: "purple",
          },
          {
            title: "Total Subscribers",
            value: stats.totalSubscribers,
            icon: Users,
            link: "/admin/subscribers",
            color: "green",
          },
          {
            title: "Total Categories",
            value: stats.totalCategories,
            icon: FolderTree,
            link: "/admin/categories",
            color: "orange",
          },
          {
            title: "Total Channels",
            value: stats.totalChannels,
            icon: Radio,
            link: "/admin/channels",
            color: "indigo",
          },
          {
            title: "Total Packages",
            value: stats.totalPackages,
            icon: Package,
            link: "/admin/packages",
            color: "teal",
          },
          {
            title: "Total OTT",
            value: stats.totalOtt,
            icon: Film,
            link: "/admin/ott",
            color: "pink",
          },
          {
            title: "Active Subscribers",
            value: stats.activeSubscribers,
            icon: UserCheck,
            link: "/admin/subscribers",
            color: "emerald",
          },
        ];

      case "distributor":
        return [
          {
            title: "Total Resellers",
            value: stats.totalResellers,
            icon: Store,
            link: "/distributor/resellers",
            color: "purple",
          },
          {
            title: "Total Subscribers",
            value: stats.totalSubscribers,
            icon: Users,
            link: "/distributor/subscribers",
            color: "green",
          },
          {
            title: "Total Categories",
            value: stats.totalCategories,
            icon: FolderTree,
            link: "/distributor/categories",
            color: "orange",
          },
          {
            title: "Total Channels",
            value: stats.totalChannels,
            icon: Radio,
            link: "/distributor/channels",
            color: "indigo",
          },
          {
            title: "Total Packages",
            value: stats.totalPackages,
            icon: Package,
            link: "/distributor/packages",
            color: "teal",
          },
          {
            title: "Total OTT",
            value: stats.totalOtt,
            icon: Film,
            link: "/distributor/ott",
            color: "pink",
          },
          {
            title: "Active Subscribers",
            value: stats.activeSubscribers,
            icon: UserCheck,
            link: "/distributor/subscribers",
            color: "emerald",
          },
          {
            title: "Inactive Subscribers",
            value: stats.inactiveSubscribers,
            icon: UserX,
            link: "/distributor/subscribers",
            color: "red",
          },
        ];

      case "reseller":
        return [
          {
            title: "Total Subscriptions",
            value: stats.totalSubscribers,
            icon: Users,
            link: "/reseller/subscribers",
            color: "blue",
          },
          {
            title: "Active Subscribers",
            value: stats.activeSubscribers,
            icon: UserCheck,
            link: "/reseller/subscribers",
            color: "green",
          },
          {
            title: "Inactive Subscribers",
            value: stats.inactiveSubscribers,
            icon: UserX,
            link: "/reseller/subscribers",
            color: "red",
          },
          {
            title: "Fresh Subscribers",
            value: stats.freshSubscribers,
            icon: UserPlus,
            link: "/reseller/subscribers",
            color: "purple",
          },
          {
            title: "Total Packages",
            value: stats.totalPackages,
            icon: Package,
            link: "/reseller/packages",
            color: "indigo",
          },
          {
            title: "Subscriber Limit",
            value: stats.subscriberLimit,
            icon: Target,
            link: null,
            color: "orange",
          },
          {
            title: "Available Slots",
            value: stats.availableSlots,
            icon: BarChart3,
            link: null,
            color: "teal",
          },
        ];

      default:
        return [];
    }
  };

  const getColorClasses = (color) => {
    const colors = {
      blue: "from-blue-50 to-blue-100 border-blue-200",
      purple: "from-purple-50 to-purple-100 border-purple-200",
      green: "from-green-50 to-green-100 border-green-200",
      orange: "from-orange-50 to-orange-100 border-orange-200",
      indigo: "from-indigo-50 to-indigo-100 border-indigo-200",
      teal: "from-teal-50 to-teal-100 border-teal-200",
      pink: "from-pink-50 to-pink-100 border-pink-200",
      emerald: "from-emerald-50 to-emerald-100 border-emerald-200",
      red: "from-red-50 to-red-100 border-red-200",
    };
    return colors[color] || colors.blue;
  };

  const getIconColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-100 text-blue-600",
      purple: "bg-purple-100 text-purple-600",
      green: "bg-green-100 text-green-600",
      orange: "bg-orange-100 text-orange-600",
      indigo: "bg-indigo-100 text-indigo-600",
      teal: "bg-teal-100 text-teal-600",
      pink: "bg-pink-100 text-pink-600",
      emerald: "bg-emerald-100 text-emerald-600",
      red: "bg-red-100 text-red-600",
    };
    return colors[color] || colors.blue;
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
  const creditStats = dashboardData?.creditStats;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section - Improved */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            {/* Left Side - Welcome Message */}
            <div className="flex-1">
              <p className="text-blue-200 text-sm font-medium mb-2 uppercase tracking-wider">
                {user.role} Dashboard
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold mb-3">
                Welcome back, {dashboardData?.user?.name}
              </h1>
            </div>

            {/* Right Side - Balance & Actions */}
            <div className="w-full lg:w-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* Balance Display */}
                  <div className="flex-1">
                    <p className="text-blue-200 text-sm mb-2 flex items-center space-x-2">
                      <Wallet className="w-4 h-4" />
                      <span>Available Credit</span>
                    </p>
                    <div className="flex items-baseline space-x-2">
                      <IndianRupee className="w-10 h-10" />
                      <span className="text-5xl font-bold">
                        {(dashboardData?.user?.balance || 0).toLocaleString(
                          "en-IN"
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={fetchDashboardData}
                      disabled={refreshing}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-all disabled:opacity-50 border border-white/30"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          refreshing ? "animate-spin" : ""
                        }`}
                      />
                      <span className="text-sm font-medium">Refresh</span>
                    </button>

                    {user.role === "admin" && (
                      <button
                        onClick={handleBackupExport}
                        disabled={backupLoading}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-green-500/30 hover:bg-green-500/40 disabled:opacity-50 border border-green-400/50 rounded-xl transition-all"
                        title="Export complete database backup (ZIP)"
                      >
                        <Download
                          className={`w-4 h-4 ${
                            backupLoading ? "animate-spin" : ""
                          }`}
                        />
                        <span className="text-sm font-medium">Backup</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Credit Analytics Section */}
        {creditStats && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Credit Analytics
                  </h2>
                  <p className="text-sm text-gray-600">
                    Transaction summary and balance overview
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/${user.role}/credit`)}
                className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all text-sm font-medium"
              >
                View All Transactions →
              </button>
            </div>

            {/* Credit Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Credits Given */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-green-200 rounded-lg">
                    <ArrowUpCircle className="w-5 h-5 text-green-700" />
                  </div>
                  <span className="text-xs font-semibold text-green-700 bg-green-200 px-2 py-1 rounded-full">
                    +{creditStats.totalCreditsCount || 0}
                  </span>
                </div>
                <p className="text-sm text-green-700 font-medium mb-1">
                  Total Credits Given
                </p>
                <div className="flex items-center space-x-1">
                  <IndianRupee className="w-5 h-5 text-green-800" />
                  <p className="text-2xl font-bold text-green-900">
                    {(creditStats.totalCreditsGiven || 0).toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>
              </div>

              {/* Total Debits Taken */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-200 rounded-lg">
                    <ArrowDownCircle className="w-5 h-5 text-blue-700" />
                  </div>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                    +{creditStats.totalDebitsCount || 0}
                  </span>
                </div>
                <p className="text-sm text-blue-700 font-medium mb-1">
                  Total Debits Taken
                </p>
                <div className="flex items-center space-x-1">
                  <IndianRupee className="w-5 h-5 text-blue-800" />
                  <p className="text-2xl font-bold text-blue-900">
                    {(creditStats.totalDebitsTaken || 0).toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>
              </div>

              {/* Total Reverse Credits */}
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-red-200 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-700" />
                  </div>
                  <span className="text-xs font-semibold text-red-700 bg-red-200 px-2 py-1 rounded-full">
                    +{creditStats.totalReverseCreditsCount || 0}
                  </span>
                </div>
                <p className="text-sm text-red-700 font-medium mb-1">
                  Total Reverse Credits
                </p>
                <div className="flex items-center space-x-1">
                  <IndianRupee className="w-5 h-5 text-red-800" />
                  <p className="text-2xl font-bold text-red-900">
                    {(creditStats.totalReverseCredits || 0).toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>
              </div>

              {/* Net Balance Flow */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-purple-200 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-700" />
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      (creditStats.netBalanceFlow || 0) >= 0
                        ? "bg-green-200 text-green-700"
                        : "bg-red-200 text-red-700"
                    }`}
                  >
                    {(creditStats.netBalanceFlow || 0) >= 0 ? "+" : ""}
                    {((creditStats.netBalanceFlow || 0) / 1000).toFixed(1)}K
                  </span>
                </div>
                <p className="text-sm text-purple-700 font-medium mb-1">
                  Net Balance Flow
                </p>
                <div className="flex items-center space-x-1">
                  <IndianRupee className="w-5 h-5 text-purple-800" />
                  <p className="text-2xl font-bold text-purple-900">
                    {(creditStats.netBalanceFlow || 0) >= 0 ? "+" : ""}
                    {Math.abs(creditStats.netBalanceFlow || 0).toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  Credits - (Debits + Reverse)
                </p>
              </div>
            </div>

            {/* Recent Transactions Preview */}
            {creditStats.recentTransactions &&
              creditStats.recentTransactions.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    Recent Transactions
                  </h3>
                  <div className="space-y-2">
                    {creditStats.recentTransactions.map((txn, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`p-2 rounded-lg ${
                              txn.type === "Credit"
                                ? "bg-green-100"
                                : txn.type === "Debit"
                                ? "bg-blue-100"
                                : txn.type === "Self Credit"
                                ? "bg-purple-100"
                                : "bg-red-100"
                            }`}
                          >
                            {txn.type === "Credit" ? (
                              <ArrowUpCircle className="w-4 h-4 text-green-600" />
                            ) : txn.type === "Debit" ? (
                              <ArrowDownCircle className="w-4 h-4 text-blue-600" />
                            ) : txn.type === "Self Credit" ? (
                              <Wallet className="w-4 h-4 text-purple-600" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {txn.type === "Self Credit"
                                ? "Self Credit"
                                : `${txn.type} ${
                                    txn.type === "Credit" ? "to" : "from"
                                  } ${txn.targetUser?.name || "Unknown"}`}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(txn.createdAt).toLocaleDateString(
                                "en-IN",
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-bold ${
                              txn.type === "Credit"
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {txn.type === "Credit" ? "-" : "+"}₹
                            {txn.amount.toLocaleString("en-IN")}
                          </p>
                          <p className="text-xs text-gray-500">
                            Balance: ₹
                            {(txn.senderBalanceAfter || 0).toLocaleString(
                              "en-IN"
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Stats Cards - Improved with colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            const isClickable = stat.link !== null;

            return (
              <div
                key={index}
                onClick={() => handleTileClick(stat.link)}
                className={`bg-gradient-to-br ${getColorClasses(
                  stat.color
                )} rounded-2xl p-6 border transition-all ${
                  isClickable
                    ? "cursor-pointer hover:scale-105 hover:border-opacity-60"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-gray-700 text-sm font-semibold mb-2">
                      {stat.title}
                    </h3>
                    <p className="text-4xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-xl ${getIconColorClasses(
                      stat.color
                    )}`}
                  >
                    <IconComponent className="h-7 w-7" />
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
