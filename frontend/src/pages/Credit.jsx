import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import api from "../services/api.js";
import {
  Search,
  Plus,
  Loader,
  CreditCard,
  Filter,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  X,
  AlertCircle,
  Wallet,
} from "lucide-react";

const Credit = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSelfCreditModal, setShowSelfCreditModal] = useState(false);
  const [formData, setFormData] = useState({
    type: "Credit",
    amount: "",
    user: "",
  });
  const [selfCreditAmount, setSelfCreditAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  // ✅ FIX: Store current user's fresh balance from API
  const [currentUserData, setCurrentUserData] = useState(null);

  const canAccess = !!user;

  useEffect(() => {
    if (canAccess) {
      fetchCurrentUserData();
      fetchCredits();
      fetchUsers();
    }
  }, [typeFilter, canAccess]);

  const fetchCurrentUserData = async () => {
    try {
      const response = await api.get("/auth/me");
      setCurrentUserData(response.data.data.user);
    } catch (error) {
      console.error("Failed to fetch current user:", error);
      // Fallback to context user if API fails
      setCurrentUserData(user);
    }
  };

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.append("type", typeFilter);

      const response = await api.get(`/credit?${params.toString()}`);
      setCredits(response.data.data.credits);
    } catch (error) {
      console.error("Failed to fetch credits:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/credit/users");
      setUsers(response.data.data.users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleOpenModal = () => {
    // ✅ Refresh balance before opening modal
    fetchCurrentUserData();
    setFormData({
      type: "Credit",
      amount: "",
      user: "",
    });
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      type: "Credit",
      amount: "",
      user: "",
    });
    setSelectedUser(null);
  };

  const handleOpenSelfCreditModal = () => {
    // ✅ Refresh balance before opening modal
    fetchCurrentUserData();
    setSelfCreditAmount("");
    setShowSelfCreditModal(true);
  };

  const handleCloseSelfCreditModal = () => {
    setShowSelfCreditModal(false);
    setSelfCreditAmount("");
  };

  const handleUserChange = (e) => {
    const userId = e.target.value;
    setFormData({ ...formData, user: userId });

    if (userId) {
      const selected = users.find((u) => u._id === userId);
      setSelectedUser(selected);
    } else {
      setSelectedUser(null);
    }
  };

  const getCappingAmount = (role) => {
    if (role === "distributor") return 10000;
    if (role === "reseller") return 1000;
    return 0;
  };

  const canPerformTransaction = () => {
    if (!formData.amount || !formData.user || !selectedUser) return false;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return false;

    // ✅ Use fresh balance from API
    if (!currentUserData || currentUserData.balance === undefined) return false;

    const senderCapping = getCappingAmount(currentUserData.role);
    const targetCapping = getCappingAmount(selectedUser.role);

    if (formData.type === "Credit") {
      // Credit: Sender gives money to target
      const senderBalanceAfter = currentUserData.balance - amount;
      return senderBalanceAfter >= senderCapping;
    } else if (formData.type === "Debit") {
      // Debit: Sender takes money from target
      const targetBalanceAfter = selectedUser.balance - amount;
      return (
        selectedUser.balance >= amount && targetBalanceAfter >= targetCapping
      );
    } else if (formData.type === "Reverse Credit") {
      // Reverse Credit: Sender takes back money from target
      const targetBalanceAfter = selectedUser.balance - amount;
      return (
        selectedUser.balance >= amount && targetBalanceAfter >= targetCapping
      );
    }

    return false;
  };

  const getBalanceWarning = () => {
    if (!formData.amount || !formData.user || !selectedUser) return null;

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return null;

    // ✅ Use fresh balance from API
    if (!currentUserData) return null;

    const senderCapping = getCappingAmount(currentUserData.role);
    const targetCapping = getCappingAmount(selectedUser.role);

    if (formData.type === "Credit") {
      const senderBalanceAfter = currentUserData.balance - amount;
      if (senderBalanceAfter < senderCapping) {
        return `⚠️ Your balance (₹${currentUserData.balance.toLocaleString(
          "en-IN"
        )}) minus ₹${amount.toLocaleString(
          "en-IN"
        )} will be ₹${senderBalanceAfter.toLocaleString(
          "en-IN"
        )}, which is below your capping limit of ₹${senderCapping.toLocaleString(
          "en-IN"
        )}. Cannot perform Credit.`;
      }
    } else if (
      formData.type === "Debit" ||
      formData.type === "Reverse Credit"
    ) {
      if (selectedUser.balance < amount) {
        return `⚠️ ${
          selectedUser.name
        }'s balance (₹${selectedUser.balance?.toLocaleString(
          "en-IN"
        )}) is insufficient`;
      }
      const targetBalanceAfter = selectedUser.balance - amount;
      if (targetBalanceAfter < targetCapping) {
        return `⚠️ ${
          selectedUser.name
        }'s balance will go below capping limit of ₹${targetCapping.toLocaleString(
          "en-IN"
        )}. Cannot perform ${formData.type}.`;
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await api.post("/credit", formData);

      const { senderBalance, targetBalance, senderName, targetName } =
        response.data.data;
      alert(
        `✅ ${formData.type} successful!\n` +
          `💰 ${senderName}: ₹${senderBalance?.toLocaleString("en-IN")}\n` +
          `🎯 ${targetName}: ₹${targetBalance?.toLocaleString("en-IN")}`
      );

      // ✅ Refresh everything after transaction
      await fetchCurrentUserData();
      await fetchCredits();
      await fetchUsers();
      handleCloseModal();
    } catch (error) {
      console.error("Submit error:", error);
      alert(error.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelfCreditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const amount = parseFloat(selfCreditAmount);
      if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid amount");
        setSubmitting(false);
        return;
      }

      const response = await api.post("/credit/self-credit", { amount });

      alert(
        `✅ Self Credit successful!\n💰 New Balance: ₹${response.data.data.newBalance?.toLocaleString(
          "en-IN"
        )}`
      );

      // ✅ Refresh everything after transaction
      await fetchCurrentUserData();
      await fetchCredits();
      handleCloseSelfCreditModal();
    } catch (error) {
      console.error("Self credit error:", error);
      alert(error.response?.data?.message || "Self credit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCredits = credits.filter((credit) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      credit.targetUser?.name?.toLowerCase().includes(searchLower) ||
      credit.targetUser?.email?.toLowerCase().includes(searchLower) ||
      credit.senderUser?.name?.toLowerCase().includes(searchLower) ||
      credit.senderUser?.email?.toLowerCase().includes(searchLower) ||
      credit.amount?.toString().includes(searchLower)
    );
  });

  const formatDate = (date) => {
    return new Date(date).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-xl">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Credit Management ({user?.role?.toUpperCase()})
                </h1>
                <p className="text-sm text-gray-600">
                  Your balance: <IndianRupee className="w-4 h-4 inline" />₹
                  {/* ✅ Use fresh balance from API */}
                  {currentUserData?.balance?.toLocaleString("en-IN") || 0}
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
              {user?.role === "admin" && (
                <button
                  onClick={handleOpenSelfCreditModal}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Self Credit</span>
                </button>
              )}
              <button
                onClick={handleOpenModal}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Transaction</span>
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
              placeholder="Search by username, email, or amount..."
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
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="Credit">Credit</option>
                    <option value="Debit">Debit</option>
                    <option value="Reverse Credit">Reverse Credit</option>
                    <option value="Self Credit">Self Credit</option>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Credits</p>
                <p className="text-2xl font-bold text-blue-600">
                  {credits.filter((c) => c.type === "Credit").length}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Debits</p>
                <p className="text-2xl font-bold text-green-600">
                  {credits.filter((c) => c.type === "Debit").length}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Total Reverse Credits
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {credits.filter((c) => c.type === "Reverse Credit").length}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
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
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      To
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Sender Balance
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Target Balance
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCredits.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <p className="text-gray-500">
                          No credit transactions found
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredCredits.map((credit, index) => (
                      <tr
                        key={credit._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              credit.type === "Credit"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : credit.type === "Debit"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : credit.type === "Self Credit"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {credit.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {credit.senderUser?.name || "System"}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {credit.targetUser?.name || "Self"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center font-semibold text-gray-900">
                            <IndianRupee className="w-4 h-4 mr-1" />
                            {credit.amount}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center">
                            <IndianRupee className="w-4 h-4 mr-1" />
                            {credit.senderBalanceAfter?.toLocaleString(
                              "en-IN"
                            ) || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center">
                            <IndianRupee className="w-4 h-4 mr-1" />
                            {credit.targetBalanceAfter?.toLocaleString(
                              "en-IN"
                            ) || 0}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(credit.createdAt)}
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

      {/* Add Credit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Credit Transaction
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type *
                </label>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      value="Credit"
                      checked={formData.type === "Credit"}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm font-medium text-blue-700">
                      Credit (Give money to user)
                    </span>
                  </label>
                  <label className="flex items-center p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      value="Debit"
                      checked={formData.type === "Debit"}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm font-medium text-green-700">
                      Debit (Take money from user)
                    </span>
                  </label>
                  <label className="flex items-center p-2 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      value="Reverse Credit"
                      checked={formData.type === "Reverse Credit"}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-sm font-medium text-red-700">
                      Reverse Credit (Take back money from user)
                    </span>
                  </label>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount *
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  placeholder="Enter Amount"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min="1"
                  step="0.01"
                />
              </div>

              {/* User */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Target User *
                </label>
                <select
                  value={formData.user}
                  onChange={handleUserChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select User</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} - ₹{u.balance?.toLocaleString("en-IN")} ({u.role}
                      )
                    </option>
                  ))}
                </select>
              </div>

              {/* Balance Warning */}
              {getBalanceWarning() && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    {getBalanceWarning()}
                  </p>
                </div>
              )}

              {/* Balance Preview - ✅ Use fresh balance */}
              {formData.amount &&
                formData.user &&
                selectedUser &&
                currentUserData && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">
                        Your Balance After
                      </p>
                      <p className="font-bold text-sm text-emerald-900">
                        <IndianRupee className="w-4 h-4 inline mr-1" />₹
                        {(formData.type === "Credit"
                          ? currentUserData.balance -
                            parseFloat(formData.amount)
                          : currentUserData.balance +
                            parseFloat(formData.amount)
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">
                        {selectedUser.name}'s Balance
                      </p>
                      <p className="font-bold text-sm text-emerald-900">
                        <IndianRupee className="w-4 h-4 inline mr-1" />₹
                        {(formData.type === "Credit"
                          ? selectedUser.balance + parseFloat(formData.amount)
                          : selectedUser.balance - parseFloat(formData.amount)
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                )}

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !canPerformTransaction()}
                  className={`flex-1 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                    canPerformTransaction() && !submitting
                      ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
                      : "bg-gray-400 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin inline" />
                      Processing...
                    </>
                  ) : (
                    `Confirm ${formData.type}`
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Self Credit Modal (Admin Only) */}
      {showSelfCreditModal && user?.role === "admin" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Admin Self Credit
              </h2>
              <button
                onClick={handleCloseSelfCreditModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSelfCreditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Amount to Add *
                </label>
                <input
                  type="number"
                  value={selfCreditAmount}
                  onChange={(e) => setSelfCreditAmount(e.target.value)}
                  placeholder="Enter Amount"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min="1"
                  step="0.01"
                />
              </div>

              {/* ✅ Use fresh balance */}
              {selfCreditAmount && currentUserData && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <p className="text-xs text-purple-700 font-medium mb-1">
                    New Balance After Credit
                  </p>
                  <p className="font-bold text-lg text-purple-900">
                    <IndianRupee className="w-4 h-4 inline mr-1" />₹
                    {(
                      currentUserData.balance + parseFloat(selfCreditAmount)
                    ).toLocaleString("en-IN")}
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting || !selfCreditAmount}
                  className={`flex-1 px-4 py-3 rounded-xl transition-all font-semibold text-sm ${
                    selfCreditAmount && !submitting
                      ? "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg"
                      : "bg-gray-400 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin inline" />
                      Processing...
                    </>
                  ) : (
                    "Add Credit"
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseSelfCreditModal}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-medium"
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Credit;
