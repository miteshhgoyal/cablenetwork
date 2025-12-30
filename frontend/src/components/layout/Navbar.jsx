// frontend/src/components/Navbar.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Settings,
  Users,
  Package,
  Tv,
  FolderTree,
  Radio,
  UserCheck,
  LayoutDashboard,
  ShoppingCart,
  CircleDollarSign,
  User2,
  Building2, // ADD THIS IMPORT
} from "lucide-react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openMobileDropdown, setOpenMobileDropdown] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getRoleBasedLinks = () => {
    switch (user?.role) {
      case "distributor":
        return {
          singleStart: [
            {
              name: "Dashboard",
              href: "/distributor/dashboard",
              icon: LayoutDashboard,
            },
          ],
          grouped: [
            {
              name: "Management",
              icon: Settings,
              links: [
                {
                  name: "Categories",
                  href: "/distributor/categories",
                  icon: FolderTree,
                },
                {
                  name: "Channels",
                  href: "/distributor/channels",
                  icon: Radio,
                },
                {
                  name: "Packages",
                  href: "/distributor/packages",
                  icon: Package,
                },
                { name: "OTT", href: "/distributor/ott", icon: Tv },
              ],
            },
            {
              name: "Users",
              icon: Users,
              links: [
                {
                  name: "Subscribers",
                  href: "/distributor/subscribers",
                  icon: UserCheck,
                },
                {
                  name: "Resellers",
                  href: "/distributor/resellers",
                  icon: ShoppingCart,
                },
              ],
            },
          ],
          singleEnd: [
            {
              name: "Credit",
              href: "/distributor/credit",
              icon: CircleDollarSign,
            },
            {
              name: "Profile",
              href: "/distributor/profile",
              icon: User2,
            },
          ],
        };

      case "reseller":
        return {
          singleStart: [
            {
              name: "Dashboard",
              href: "/reseller/dashboard",
              icon: LayoutDashboard,
            },
          ],
          grouped: [
            {
              name: "Management",
              icon: Settings,
              links: [
                {
                  name: "Subscribers",
                  href: "/reseller/subscribers",
                  icon: UserCheck,
                },
                {
                  name: "Packages",
                  href: "/reseller/packages",
                  icon: Package,
                },
              ],
            },
          ],
          singleEnd: [
            {
              name: "Profile",
              href: "/reseller/profile",
              icon: User2,
            },
            {
              name: "Credit",
              href: "/reseller/credit",
              icon: CircleDollarSign,
            },
          ],
        };

      case "admin":
        return {
          singleStart: [
            {
              name: "Dashboard",
              href: "/admin/dashboard",
              icon: LayoutDashboard,
            },
          ],
          grouped: [
            {
              name: "Management",
              icon: Settings,
              links: [
                {
                  name: "Categories",
                  href: "/admin/categories",
                  icon: FolderTree,
                },
                {
                  name: "Channels",
                  href: "/admin/channels",
                  icon: Radio,
                },
                {
                  name: "Packages",
                  href: "/admin/packages",
                  icon: Package,
                },
                { name: "OTT", href: "/admin/ott", icon: Tv },
              ],
            },
            {
              name: "Users",
              icon: Users,
              links: [
                {
                  name: "Distributors", // ADD THIS
                  href: "/admin/distributors",
                  icon: Building2,
                },
                {
                  name: "Resellers",
                  href: "/admin/resellers",
                  icon: ShoppingCart,
                },
                {
                  name: "Subscribers",
                  href: "/admin/subscribers",
                  icon: UserCheck,
                },
              ],
            },
          ],
          singleEnd: [
            {
              name: "Credit",
              href: "/admin/credit",
              icon: CircleDollarSign,
            },
            {
              name: "Profile",
              href: "/admin/profile",
              icon: User2,
            },
          ],
        };

      default:
        return { singleStart: [], grouped: [], singleEnd: [] };
    }
  };

  const navigationLinks = getRoleBasedLinks();

  const isActivePath = (href) => {
    return location.pathname === href;
  };

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName);
  };

  const toggleMobileDropdown = (dropdownName) => {
    setOpenMobileDropdown(
      openMobileDropdown === dropdownName ? null : dropdownName
    );
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all group-hover:scale-105">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent hidden sm:block">
                Online IPTV Hub
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div
            className="hidden lg:flex items-center space-x-1"
            ref={dropdownRef}
          >
            {/* Single Links Start */}
            {navigationLinks.singleStart?.map((link) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActivePath(link.href)
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}

            {/* Grouped Links (Dropdowns) */}
            {navigationLinks.grouped?.map((group) => {
              const GroupIcon = group.icon;
              const isOpen = openDropdown === group.name;
              const hasActiveLink = group.links.some((link) =>
                isActivePath(link.href)
              );

              return (
                <div key={group.name} className="relative">
                  <button
                    onClick={() => toggleDropdown(group.name)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      hasActiveLink || isOpen
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <GroupIcon className="h-4 w-4" />
                    <span>{group.name}</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {group.links.map((link) => {
                        const LinkIcon = link.icon;
                        return (
                          <Link
                            key={link.name}
                            to={link.href}
                            onClick={() => setOpenDropdown(null)}
                            className={`flex items-center space-x-3 px-4 py-2.5 text-sm transition-all ${
                              isActivePath(link.href)
                                ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 font-medium"
                                : "text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <LinkIcon className="h-4 w-4" />
                            <span>{link.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Single Links End */}
            {navigationLinks.singleEnd?.map((link) => {
              const IconComponent = link.icon;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActivePath(link.href)
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu & Mobile Toggle */}
          <div className="flex items-center space-x-3">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-gray-900">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline">Logout</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation - COMPACT VERSION */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-3 max-h-[70vh] overflow-y-auto">
            {/* User Info Mobile - Compact */}
            <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg mb-3">
              <div className="flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-600 capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              {/* Single Links Start Mobile - Compact */}
              {navigationLinks.singleStart?.map((link) => {
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActivePath(link.href)
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}

              {/* Grouped Links Mobile - Collapsible */}
              {navigationLinks.grouped?.map((group) => {
                const GroupIcon = group.icon;
                const isOpen = openMobileDropdown === group.name;

                return (
                  <div key={group.name}>
                    <button
                      onClick={() => toggleMobileDropdown(group.name)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center space-x-2">
                        <GroupIcon className="h-4 w-4" />
                        <span>{group.name}</span>
                      </div>
                      <ChevronRight
                        className={`h-4 w-4 transition-transform ${
                          isOpen ? "rotate-90" : ""
                        }`}
                      />
                    </button>

                    {/* Dropdown Links - Compact */}
                    {isOpen && (
                      <div className="ml-6 mt-1 space-y-1">
                        {group.links.map((link) => {
                          const LinkIcon = link.icon;
                          return (
                            <Link
                              key={link.name}
                              to={link.href}
                              onClick={() => setIsMenuOpen(false)}
                              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                                isActivePath(link.href)
                                  ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 font-medium"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <LinkIcon className="h-3.5 w-3.5" />
                              <span>{link.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Single Links End Mobile - Compact */}
              {navigationLinks.singleEnd?.map((link) => {
                const IconComponent = link.icon;
                return (
                  <Link
                    key={link.name}
                    to={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActivePath(link.href)
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
