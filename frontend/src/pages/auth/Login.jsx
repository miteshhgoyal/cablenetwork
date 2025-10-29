import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.jsx";
import LoadingSpinner from "../../components/common/LoadingSpinner.jsx";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  AlertCircle,
  CheckCircle,
  Shield,
  ArrowLeft,
  Store,
  Package,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import api from "../../services/api.js";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState("");

  const roles = [
    {
      value: "admin",
      label: "Admin",
      desc: "System Administrator",
      color: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      icon: Shield,
    },
    {
      value: "distributor",
      label: "Distributor",
      desc: "Supply & Distribution",
      color: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      icon: Package,
    },
    {
      value: "reseller",
      label: "Reseller",
      desc: "Sales Representative",
      color: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-700",
      icon: Store,
    },
  ];

  const redirectPaths = {
    admin: "/admin/dashboard",
    distributor: "/distributor/dashboard",
    reseller: "/reseller/dashboard",
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await login(formData);
      if (result.success) {
        // FIXED: Use result.data.user.role instead of result.user.role
        const userRole = result.data.user.role;
        navigate(redirectPaths[userRole] || "/dashboard");
      }
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordLoading(true);
    setForgotPasswordError("");
    setForgotPasswordSuccess(false);

    try {
      const response = await api.post("/auth/forgot-password", {
        email: forgotPasswordEmail,
      });

      if (response.data.success) {
        setForgotPasswordSuccess(true);
        setForgotPasswordEmail("");
      }
    } catch (err) {
      setForgotPasswordError(
        err.response?.data?.message || "Failed to send reset email"
      );
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotPasswordEmail("");
    setForgotPasswordSuccess(false);
    setForgotPasswordError("");
  };

  const selectedRole = roles.find((role) => role.value === formData.role);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-5xl">
          {!showForgotPassword ? (
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left Side - Branding */}
              <div className="hidden lg:block space-y-8">
                <div>
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-blue-500/20">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-5xl font-bold text-gray-900 mb-4 leading-tight">
                    Welcome Back to
                    <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Digital Cable Network
                    </span>
                  </h1>
                  <p className="text-lg text-gray-600 leading-relaxed">
                    Manage your business operations, track performance, and grow
                    your success with our powerful platform.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      icon: Shield,
                      title: "Secure & Reliable",
                      desc: "Enterprise-grade security for your data",
                    },
                    {
                      icon: Package,
                      title: "Real-time Updates",
                      desc: "Stay informed with instant notifications",
                    },
                    {
                      icon: Store,
                      title: "Easy Management",
                      desc: "Intuitive dashboard for seamless control",
                    },
                  ].map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <IconComponent className="w-5 h-5 text-gray-700" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {feature.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side - Login Form */}
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-200/50 p-8 sm:p-10">
                <div className="lg:hidden text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
                    <Lock className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Sign In
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Access your business dashboard
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Role Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Select Your Role
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {roles.map((role) => {
                        const IconComponent = role.icon;
                        const isSelected = formData.role === role.value;

                        return (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() =>
                              handleChange({
                                target: { name: "role", value: role.value },
                              })
                            }
                            className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                              isSelected
                                ? `${role.borderColor} ${role.bgColor} shadow-lg scale-105`
                                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md"
                            }`}
                          >
                            <div className="flex flex-col items-center space-y-2">
                              <div
                                className={`p-2.5 rounded-lg transition-all ${
                                  isSelected
                                    ? `bg-gradient-to-br ${role.color}`
                                    : "bg-gray-100"
                                }`}
                              >
                                <IconComponent
                                  className={`w-5 h-5 ${
                                    isSelected ? "text-white" : "text-gray-600"
                                  }`}
                                />
                              </div>
                              <div className="text-center">
                                <p
                                  className={`text-xs font-semibold ${
                                    isSelected
                                      ? role.textColor
                                      : "text-gray-900"
                                  }`}
                                >
                                  {role.label}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-gray-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                      <div className="flex items-center text-red-700">
                        <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span className="text-sm font-medium">{error}</span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] flex items-center justify-center group"
                  >
                    {loading ? (
                      <>
                        <LoadingSpinner size="small" />
                        <span className="ml-3">Signing in...</span>
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  {/* Footer */}
                  {/* <div className="text-center pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{" "}
                      <Link
                        to="/register"
                        className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        Create one
                      </Link>
                    </p>
                  </div> */}
                </form>
              </div>
            </div>
          ) : (
            // Forgot Password Form
            <div className="max-w-md mx-auto">
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-200/50 p-8 sm:p-10">
                <div className="text-center mb-8">
                  <button
                    onClick={resetForgotPassword}
                    className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Sign In
                  </button>

                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Reset Password
                  </h2>
                  <p className="text-sm text-gray-600">
                    Enter your email to receive a reset link
                  </p>
                </div>

                {!forgotPasswordSuccess ? (
                  <form onSubmit={handleForgotPassword} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          required
                          value={forgotPasswordEmail}
                          onChange={(e) =>
                            setForgotPasswordEmail(e.target.value)
                          }
                          className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-gray-400"
                          placeholder="your@email.com"
                        />
                      </div>
                    </div>

                    {forgotPasswordError && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                        <div className="flex items-center text-red-700">
                          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                          <span className="text-sm font-medium">
                            {forgotPasswordError}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotPasswordLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02]"
                    >
                      {forgotPasswordLoading ? (
                        <div className="flex items-center justify-center">
                          <LoadingSpinner size="small" />
                          <span className="ml-3">Sending...</span>
                        </div>
                      ) : (
                        "Send Reset Link"
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        Email Sent!
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Check your inbox for password reset instructions.
                      </p>
                      <p className="text-xs text-gray-500">
                        Didn't receive it? Check spam or try again.
                      </p>
                    </div>
                    <button
                      onClick={resetForgotPassword}
                      className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 transition-all"
                    >
                      Back to Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Text */}
          <p className="text-center text-xs text-gray-500 mt-8">
            Secure business management platform • Protected by enterprise-grade
            security
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
