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
  Clock,
  CalendarClock,
  UserCog,
  Shield,
  ChevronRight,
  Settings,
  Sliders,
} from "lucide-react";

import CappingSettingsModal from "../components/CappingSettingsModal.jsx";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  // Capping Settings State
  const [showCappingModal, setShowCappingModal] = useState(false);

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

  const handleCappingUpdate = (settings) => {
    fetchDashboardData(); // Refresh dashboard data after capping update
  };

  const getStatsConfig = () => {
    if (!dashboardData) return { categories: [] };

    const { role } = user;
    const stats = dashboardData.stats;

    const statsConfigByRole = {
      admin: {
        categories: [
          {
            title: "Users Management",
            stats: [
              {
                title: "Total Distributors",
                value: stats.totalDistributors,
                icon: Building2,
                link: "/admin/distributors",
                color: "blue",
              },
              {
                title: "Active Distributors",
                value: stats.activeDistributors,
                icon: Shield,
                link: "/admin/distributors",
                color: "cyan",
              },
              {
                title: "Total Resellers",
                value: stats.totalResellers,
                icon: Store,
                link: "/admin/resellers",
                color: "purple",
              },
              {
                title: "Active Resellers",
                value: stats.activeResellers,
                icon: UserCog,
                link: "/admin/resellers",
                color: "violet",
              },
            ],
          },
          {
            title: "Subscribers Overview",
            stats: [
              {
                title: "Total Subscribers",
                value: stats.totalSubscribers,
                icon: Users,
                link: "/admin/subscribers",
                color: "green",
              },
              {
                title: "Active Subscribers",
                value: stats.activeSubscribers,
                icon: UserCheck,
                link: "/admin/subscribers",
                color: "emerald",
              },
              {
                title: "Inactive Subscribers",
                value: stats.inactiveSubscribers,
                icon: UserX,
                link: "/admin/subscribers",
                color: "red",
              },
              {
                title: "Fresh Subscribers",
                value: stats.freshSubscribers,
                icon: UserPlus,
                link: "/admin/subscribers",
                color: "pink",
              },
              {
                title: "Expiring Soon (7 Days)",
                value: stats.expiringSoon,
                icon: CalendarClock,
                link: "/admin/subscribers",
                color: "amber",
              },
            ],
          },
          {
            title: "Content & Services",
            stats: [
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
                color: "fuchsia",
              },
            ],
          },
        ],
      },

      distributor: {
        categories: [
          {
            title: "Resellers Management",
            stats: [
              {
                title: "Total Resellers",
                value: stats.totalResellers,
                icon: Store,
                link: "/distributor/resellers",
                color: "purple",
              },
              {
                title: "Active Resellers",
                value: stats.activeResellers,
                icon: UserCog,
                link: "/distributor/resellers",
                color: "violet",
              },
            ],
          },
          {
            title: "Subscribers Overview",
            stats: [
              {
                title: "Total Subscribers",
                value: stats.totalSubscribers,
                icon: Users,
                link: "/distributor/subscribers",
                color: "green",
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
              {
                title: "Fresh Subscribers",
                value: stats.freshSubscribers,
                icon: UserPlus,
                link: "/distributor/subscribers",
                color: "pink",
              },
              {
                title: "Expiring Soon (7 Days)",
                value: stats.expiringSoon,
                icon: CalendarClock,
                link: "/distributor/subscribers",
                color: "amber",
              },
            ],
          },
          {
            title: "Content & Services",
            stats: [
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
                color: "fuchsia",
              },
            ],
          },
        ],
      },

      reseller: {
        categories: [
          {
            title: "Subscriptions",
            stats: [
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
            ],
          },
          {
            title: "Activity & Alerts",
            stats: [
              {
                title: "Recently Added (7 Days)",
                value: stats.recentlyAdded,
                icon: Clock,
                link: "/reseller/subscribers",
                color: "pink",
              },
              {
                title: "Expiring in 7 Days",
                value: stats.expiringSoon,
                icon: CalendarClock,
                link: "/reseller/subscribers",
                color: "amber",
              },
            ],
          },
          {
            title: "Resources",
            stats: [
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
            ],
          },
        ],
      },
    };

    return statsConfigByRole[role] || { categories: [] };
  };

  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: "bg-blue-100 text-blue-600",
      text: "text-blue-900",
    },
    cyan: {
      bg: "bg-cyan-50",
      border: "border-cyan-200",
      icon: "bg-cyan-100 text-cyan-600",
      text: "text-cyan-900",
    },
    purple: {
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: "bg-purple-100 text-purple-600",
      text: "text-purple-900",
    },
    violet: {
      bg: "bg-violet-50",
      border: "border-violet-200",
      icon: "bg-violet-100 text-violet-600",
      text: "text-violet-900",
    },
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "bg-green-100 text-green-600",
      text: "text-green-900",
    },
    emerald: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      icon: "bg-emerald-100 text-emerald-600",
      text: "text-emerald-900",
    },
    orange: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      icon: "bg-orange-100 text-orange-600",
      text: "text-orange-900",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: "bg-amber-100 text-amber-600",
      text: "text-amber-900",
    },
    indigo: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      icon: "bg-indigo-100 text-indigo-600",
      text: "text-indigo-900",
    },
    teal: {
      bg: "bg-teal-50",
      border: "border-teal-200",
      icon: "bg-teal-100 text-teal-600",
      text: "text-teal-900",
    },
    pink: {
      bg: "bg-pink-50",
      border: "border-pink-200",
      icon: "bg-pink-100 text-pink-600",
      text: "text-pink-900",
    },
    fuchsia: {
      bg: "bg-fuchsia-50",
      border: "border-fuchsia-200",
      icon: "bg-fuchsia-100 text-fuchsia-600",
      text: "text-fuchsia-900",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "bg-red-100 text-red-600",
      text: "text-red-900",
    },
  };

  const getColorClasses = (color) => colorClasses[color] || colorClasses.blue;

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

  const statsConfig = getStatsConfig();
  const creditStats = dashboardData?.creditStats;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1">
              <p className="text-blue-200 text-xs font-semibold mb-1 uppercase tracking-wider">
                {user.role} Dashboard
              </p>
              <h1 className="text-3xl font-bold">
                Welcome back, {dashboardData?.user?.name}
              </h1>
            </div>

            <div className="w-full lg:w-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="flex-1">
                    <p className="text-blue-200 text-xs mb-2 flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      <span className="font-medium">Available Credit</span>
                    </p>
                    <div className="flex items-baseline gap-1">
                      <IndianRupee className="w-8 h-8" />
                      <span className="text-4xl font-bold">
                        {(dashboardData?.user?.balance || 0).toLocaleString(
                          "en-IN"
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={fetchDashboardData}
                      disabled={refreshing}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 border border-white/30"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          refreshing ? "animate-spin" : ""
                        }`}
                      />
                      <span className="text-sm font-medium">Refresh</span>
                    </button>

                    {user.role === "admin" && (
                      <>
                        <button
                          onClick={handleBackupExport}
                          disabled={backupLoading}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500/30 hover:bg-green-500/40 disabled:opacity-50 border border-green-400/50 rounded-lg transition-colors"
                          title="Export complete database backup (ZIP)"
                        >
                          <Download
                            className={`w-4 h-4 ${
                              backupLoading ? "animate-spin" : ""
                            }`}
                          />
                          <span className="text-sm font-medium">Backup</span>
                        </button>

                        <button
                          onClick={() => setShowCappingModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/50 rounded-lg transition-colors"
                          title="Configure capping settings"
                        >
                          <Sliders className="w-4 h-4" />
                          <span className="text-sm font-medium">Capping</span>
                        </button>
                      </>
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
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Credit Analytics
                  </h2>
                  <p className="text-sm text-gray-600">
                    Transaction summary and balance overview
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/${user.role}/credit`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Credit Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-5 border border-green-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ArrowUpCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <p className="text-sm text-green-700 font-medium mb-1">
                  Total Credits Given
                </p>
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-5 h-5 text-green-800" />
                  <p className="text-2xl font-bold text-green-900">
                    {(creditStats.totalCreditsGiven || 0).toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ArrowDownCircle className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-sm text-blue-700 font-medium mb-1">
                  Total Debits Taken
                </p>
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-5 h-5 text-blue-800" />
                  <p className="text-2xl font-bold text-blue-900">
                    {(creditStats.totalDebitsTaken || 0).toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-5 border border-red-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <p className="text-sm text-red-700 font-medium mb-1">
                  Total Reverse Credits
                </p>
                <div className="flex items-center gap-1">
                  <IndianRupee className="w-5 h-5 text-red-800" />
                  <p className="text-2xl font-bold text-red-900">
                    {(creditStats.totalReverseCredits || 0).toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-purple-700 font-medium mb-1">
                  Net Balance Flow
                </p>
                <div className="flex items-center gap-1">
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
          </div>
        )}

        {/* Categorized Stats Sections */}
        {statsConfig.categories.map((category, catIndex) => (
          <div key={catIndex} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-1 w-1 bg-blue-600 rounded-full"></div>
              <h2 className="text-lg font-bold text-gray-900">
                {category.title}
              </h2>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {category.stats.map((stat, index) => {
                const IconComponent = stat.icon;
                const isClickable = stat.link !== null;
                const colors = getColorClasses(stat.color);

                return (
                  <div
                    key={index}
                    onClick={() => handleTileClick(stat.link)}
                    className={`${colors.bg} rounded-lg p-5 border ${
                      colors.border
                    } transition-colors ${
                      isClickable
                        ? "cursor-pointer hover:border-opacity-80"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-gray-700 text-sm font-semibold mb-2">
                          {stat.title}
                        </h3>
                        <p className={`text-3xl font-bold ${colors.text}`}>
                          {stat.value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${colors.icon}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Recent Transactions Section */}
        {creditStats?.recentTransactions &&
          creditStats.recentTransactions.length > 0 && (
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Activity className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Recent Transactions
                  </h2>
                  <p className="text-sm text-gray-600">
                    Latest credit activity
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {creditStats.recentTransactions.map((txn, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
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
                          <ArrowUpCircle className="w-5 h-5 text-green-600" />
                        ) : txn.type === "Debit" ? (
                          <ArrowDownCircle className="w-5 h-5 text-blue-600" />
                        ) : txn.type === "Self Credit" ? (
                          <Wallet className="w-5 h-5 text-purple-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {txn.type === "Self Credit"
                            ? "Self Credit"
                            : `${txn.type} ${
                                txn.type === "Credit" ? "to" : "from"
                              } ${txn.targetUser?.name || "Unknown"}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(txn.createdAt).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
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
                        {(txn.senderBalanceAfter || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => navigate(`/${user.role}/credit`)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium border border-gray-200"
                >
                  <span>View All Transactions</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Capping Settings Modal */}
      {user.role === "admin" && (
        <CappingSettingsModal
          isOpen={showCappingModal}
          onClose={() => setShowCappingModal(false)}
          onUpdate={handleCappingUpdate}
        />
      )}
    </div>
  );
};

export default Dashboard;
