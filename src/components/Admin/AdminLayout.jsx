import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Modal from "~/components/Admin/Modal";
import { useLanguage } from "~/i18n/AdminLanguageProvider";
import LanguageSwitcher from "~/components/Admin/LanguageSwitcher";
import {
  FaTachometerAlt,
  FaUsers,
  FaUserTie,
  FaBoxes,
  FaShoppingCart,
  FaTags,
  FaFileInvoice,
  FaWarehouse,
  FaComments,
  FaExchangeAlt,
  FaBars,
  FaTimes,
  FaUserShield,
  FaIdCard,
  FaUserFriends,
  FaTruck,
  FaPercent,
  FaLayerGroup,
  FaStar,
  FaShoppingBag,
  FaClipboardList,
  FaChartLine,
  FaHistory,
  FaCashRegister
} from "react-icons/fa";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { t } = useLanguage();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Coming-soon modal state
  const [comingModalOpen, setComingModalOpen] = useState(false);
  const [comingModalTitle, setComingModalTitle] = useState("");

  const menuSections = [
    {
      title: t("admin.sidebar.sections.dashboard"),
      items: [
        {
          title: t("admin.sidebar.menu.dashboard"),
          icon: FaTachometerAlt,
          path: "/admin",
          exact: true
        }
      ]
    },
    {
      title: t("admin.sidebar.sections.sales"),
      items: [
        {
          title: t("admin.sidebar.menu.pos"),
          icon: FaCashRegister,
          path: "/admin/pos"
        }
      ]
    },
    {
      title: t("admin.sidebar.sections.accountManagement"),
      items: [
        {
          title: t("admin.sidebar.menu.roles"),
          path: "/admin/roles",
          icon: FaIdCard,
          comingSoon: true
        },
        {
          title: t("admin.sidebar.menu.accounts"),
          path: "/admin/accounts",
          icon: FaUsers,
          comingSoon: true
        }
      ]
    },
    {
      title: t("admin.sidebar.sections.customersEmployees"),
      items: [
        {
          title: t("admin.sidebar.menu.customerTypes"),
          path: "/admin/customer-types",
          icon: FaTags
        },
        {
          title: t("admin.sidebar.menu.customers"),
          path: "/admin/customers",
          icon: FaUsers
        },
        {
          title: t("admin.sidebar.menu.employees"),
          path: "/admin/employees",
          icon: FaUserTie
        },
        {
          title: t("admin.sidebar.menu.suppliers"),
          path: "/admin/suppliers",
          icon: FaTruck
        }
      ]
    },
    {
      title: t("admin.sidebar.sections.productsPromotions"),
      items: [
        {
          title: t("admin.sidebar.menu.categories"),
          path: "/admin/product-categories",
          icon: FaLayerGroup
        },
        {
          title: t("admin.sidebar.menu.products"),
          path: "/admin/products",
          icon: FaBoxes
        },
        {
          title: t("admin.sidebar.menu.promotionTypes"),
          path: "/admin/promotion-types",
          icon: FaTags
        },
        {
          title: t("admin.sidebar.menu.promotions"),
          path: "/admin/promotions",
          icon: FaPercent
        }
      ]
    },
    {
      title: t("admin.sidebar.sections.ordersWarehouse"),
      items: [
        {
          title: t("admin.sidebar.menu.orders"),
          path: "/admin/orders",
          icon: FaShoppingCart
        },

        {
          title: t("admin.sidebar.menu.importInvoices"),
          path: "/admin/import-invoices",
          icon: FaFileInvoice
        },
        {
          title: t("admin.sidebar.menu.importDetails"),
          path: "/admin/import-details",
          icon: FaClipboardList
        },
        {
          title: t("admin.sidebar.menu.inventory"),
          path: "/admin/inventory",
          icon: FaWarehouse
        },
        {
          title: t("admin.sidebar.menu.priceHistory"),
          path: "/admin/price-history",
          icon: FaHistory
        }
      ]
    },
    {
      title: t("admin.sidebar.sections.other"),
      items: [
        {
          title: t("admin.sidebar.menu.comments"),
          path: "/admin/comments",
          icon: FaComments,
          comingSoon: true
        },
        {
          title: t("admin.sidebar.menu.returns"),
          path: "/admin/returns",
          icon: FaExchangeAlt,
          comingSoon: true
        }
      ]
    }
  ];

  const isActiveLink = (path, exact = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative">
      {/* Floating toggle when sidebar is collapsed so user can re-open it */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          aria-label="Mở sidebar"
          className="fixed top-4 left-2 z-50 p-2 bg-blue-600 text-white rounded-lg shadow-xl hover:bg-blue-700 transition-transform transform hover:scale-105"
        >
          <FaBars />
        </button>
      )}

      {/* Sidebar (fixed on the left) */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-all duration-500 ease-in-out transform ${
          sidebarOpen ? "w-72" : "w-16"
        } overflow-y-auto shadow-2xl border-r border-slate-700/50`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div
              className={`transition-all duration-300 ${
                sidebarOpen ? "opacity-100" : "opacity-0"
              }`}
            >
              <h1 className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {t("admin.sidebar.title")}
              </h1>
              <p className="text-slate-400 text-xs mt-1">
                {t("admin.sidebar.subtitle")}
              </p>
            </div>
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
            >
              {sidebarOpen ? (
                <FaTimes className="text-lg" />
              ) : (
                <FaBars className="text-lg" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
          {menuSections.map((section, sectionIndex) => (
            <div key={section.title} className="mb-8">
              {/* Section Title */}
              {sidebarOpen && (
                <div className="px-6 mb-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="mt-1 h-px bg-gradient-to-r from-slate-600 to-transparent"></div>
                </div>
              )}

              {/* Section Items */}
              <div className="space-y-1 px-3">
                {section.items.map((item, itemIndex) => {
                  const baseClass = `group flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    isActiveLink(item.path, item.exact)
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                      : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  } ${!sidebarOpen ? "justify-center" : ""}`;

                  // If item is marked comingSoon, render a button that shows a message instead of navigating
                  if (item.comingSoon) {
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          setComingModalTitle(item.title);
                          setComingModalOpen(true);
                        }}
                        className={baseClass}
                        style={{
                          animationDelay: `${
                            sectionIndex * 100 + itemIndex * 50
                          }ms`
                        }}
                        aria-label={`${item.title} - sắp có`}
                      >
                        <div
                          className={`flex items-center ${
                            isActiveLink(item.path, item.exact)
                              ? "text-white"
                              : "text-slate-400 group-hover:text-blue-400"
                          } transition-colors duration-300`}
                        >
                          <item.icon
                            className={`${
                              sidebarOpen ? "text-lg" : "text-xl"
                            } transition-all duration-300`}
                          />
                          {sidebarOpen && (
                            <span className="ml-3 transition-all duration-300 group-hover:translate-x-1">
                              {item.title}
                              <span className="ml-2 text-xs text-yellow-200">
                                (sắp có)
                              </span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={baseClass}
                      style={{
                        animationDelay: `${
                          sectionIndex * 100 + itemIndex * 50
                        }ms`
                      }}
                    >
                      <div
                        className={`flex items-center ${
                          isActiveLink(item.path, item.exact)
                            ? "text-white"
                            : "text-slate-400 group-hover:text-blue-400"
                        } transition-colors duration-300`}
                      >
                        <item.icon
                          className={`${
                            sidebarOpen ? "text-lg" : "text-xl"
                          } transition-all duration-300`}
                        />
                        {sidebarOpen && (
                          <span className="ml-3 transition-all duration-300 group-hover:translate-x-1">
                            {item.title}
                          </span>
                        )}
                      </div>
                      {/* Active indicator */}
                      {isActiveLink(item.path, item.exact) && (
                        <div className="ml-auto">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
          <div
            className={`flex items-center ${
              !sidebarOpen ? "justify-center" : ""
            }`}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
            {sidebarOpen && (
              <div className="ml-3">
                <p className="text-sm font-medium text-white">Admin</p>
                <p className="text-xs text-slate-400">Quản trị viên</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Coming Soon Modal */}
      <Modal
        isOpen={comingModalOpen}
        onClose={() => setComingModalOpen(false)}
        title={comingModalTitle || "Tính năng sắp có"}
        size="sm"
      >
        <div className="py-4">
          <p className="text-sm text-gray-700">
            {t("admin.modal.featureInDevelopment", { title: comingModalTitle })}
          </p>
          <div className="mt-4 text-right">
            <button
              onClick={() => setComingModalOpen(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t("admin.common.close")}
            </button>
          </div>
        </div>
      </Modal>
      {/* Main Content (right side) */}
      <div
        className="flex-1 flex flex-col min-h-0 transition-all duration-500"
        style={{ marginLeft: sidebarOpen ? "18rem" : "4rem" }}
      >
        {/* Top Navbar */}
        <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200/50">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  {location.pathname === "/admin"
                    ? t("admin.dashboard.title")
                    : location.pathname
                        .split("/")
                        .pop()
                        .replace("-", " ")
                        .toUpperCase()}
                </h2>
                <p className="text-gray-500 mt-1">
                  {location.pathname === "/admin"
                    ? t("admin.dashboard.subtitle")
                    : t("admin.common.info")}
                </p>
              </div>
              <div className="flex items-center space-x-6">
                <LanguageSwitcher />
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {t("admin.common.welcome")},
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {t("admin.common.admin")}
                  </span>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                  A
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area (scrolls) */}
        <main className="flex-1 p-8 overflow-auto bg-gradient-to-br from-gray-50/50 to-white/50">
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
