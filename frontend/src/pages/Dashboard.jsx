// frontend/src/pages/dashboard/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
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
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          },
          {
            title: "Total Resellers",
            value: stats.totalResellers,
            icon: Store,
          },
          {
            title: "Total Subscribers",
            value: stats.totalSubscribers,
            icon: Users,
          },
          {
            title: "Total Categories",
            value: stats.totalCategories,
            icon: FolderTree,
          },
          {
            title: "Total Channels",
            value: stats.totalChannels,
            icon: Radio,
          },
          {
            title: "Total Packages",
            value: stats.totalPackages,
            icon: Package,
          },
          {
            title: "Total OTT",
            value: stats.totalOtt,
            icon: Film,
          },
          {
            title: "Active Subscribers",
            value: stats.activeSubscribers,
            icon: UserCheck,
          },
        ];

      case "distributor":
        return [
          {
            title: "Total Resellers",
            value: stats.totalResellers,
            icon: Store,
          },
          {
            title: "Total Subscribers",
            value: stats.totalSubscribers,
            icon: Users,
          },
          {
            title: "Total Categories",
            value: stats.totalCategories,
            icon: FolderTree,
          },
          {
            title: "Total Channels",
            value: stats.totalChannels,
            icon: Radio,
          },
          {
            title: "Total Packages",
            value: stats.totalPackages,
            icon: Package,
          },
          {
            title: "Total OTT",
            value: stats.totalOtt,
            icon: Film,
          },
          {
            title: "Active Subscribers",
            value: stats.activeSubscribers,
            icon: UserCheck,
          },
          {
            title: "Inactive Subscribers",
            value: stats.inactiveSubscribers,
            icon: UserX,
          },
        ];

      case "reseller":
        return [
          {
            title: "Total Subscriptions",
            value: stats.totalSubscribers,
            icon: Users,
          },
          {
            title: "Active Subscribers",
            value: stats.activeSubscribers,
            icon: UserCheck,
          },
          {
            title: "Inactive Subscribers",
            value: stats.inactiveSubscribers,
            icon: UserX,
          },
          {
            title: "Fresh Subscribers",
            value: stats.freshSubscribers,
            icon: UserPlus,
          },
          {
            title: "Total Packages",
            value: stats.totalPackages,
            icon: Package,
          },
          {
            title: "Subscriber Limit",
            value: stats.subscriberLimit,
            icon: Target,
          },
          {
            title: "Available Slots",
            value: stats.availableSlots,
            icon: BarChart3,
          },
        ];

      default:
        return [];
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
      {/* Header Section - Simple & Clean like Navbar */}
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

            {/* Right Side - Balance & Refresh */}
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
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Simple & Clean */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all"
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
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <IconComponent className="h-6 w-6 text-gray-600" />
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
