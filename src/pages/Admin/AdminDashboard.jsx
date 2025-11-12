import React, { useState, useEffect } from "react";
import AdminLayout from "~/components/Admin/AdminLayout";
import { useLanguage } from "~/i18n/AdminLanguageProvider";
import { productService } from "~/apis/productService";
import { orderService } from "~/apis/orderService";
import { categoryService } from "~/apis/categoryService";
import { authService } from "~/apis/authService";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import {
  FaUsers,
  FaBoxes,
  FaShoppingCart,
  FaDollarSign,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaSpinner,
  FaExclamationTriangle,
  FaEye,
  FaCalendarAlt
} from "react-icons/fa";

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalCategories: 0,
    lowStockProducts: [],
    recentOrders: [],
    productsByCategory: {}
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { formatVND } = useStransferToVND();
  const { t } = useLanguage();

  // Load dashboard data from APIs
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch data from multiple APIs
        const [productsRes, ordersRes, categoriesRes] = await Promise.all([
          productService.getAllProduct().catch(() => ({ data: { data: [] } })),
          orderService.getAllOrders().catch(() => ({ data: { data: [] } })),
          categoryService.getAllCategory().catch(() => ({ data: { data: [] } }))
        ]);

        // Normalize API responses
        const products = productsRes?.data?.data || productsRes?.data || [];
        const orders = ordersRes?.data?.data || ordersRes?.data || [];
        const categories =
          categoriesRes?.data?.data || categoriesRes?.data || [];

        console.log("Dashboard API Data:", { products, orders, categories });

        // Calculate metrics
        const totalProducts = Array.isArray(products) ? products.length : 0;
        const totalOrders = Array.isArray(orders) ? orders.length : 0;
        const totalCategories = Array.isArray(categories)
          ? categories.length
          : 0;

        // Calculate total revenue from orders
        const totalRevenue = Array.isArray(orders)
          ? orders.reduce((sum, order) => {
              const amount =
                order.finalAmount || order.totalAmount || order.total || 0;
              return sum + (typeof amount === "number" ? amount : 0);
            }, 0)
          : 0;

        // Find low stock products (stock < 10)
        const lowStockProducts = Array.isArray(products)
          ? products
              .filter((p) => {
                const stock = p.stockQuantity || p.stock || 0;
                return stock > 0 && stock < 10;
              })
              .slice(0, 5)
          : [];

        // Get recent orders (last 5)
        const recentOrders = Array.isArray(orders)
          ? orders
              .sort(
                (a, b) =>
                  new Date(b.orderDate || b.createdAt || 0) -
                  new Date(a.orderDate || a.createdAt || 0)
              )
              .slice(0, 5)
          : [];

        // Group products by category
        const productsByCategory = {};
        if (Array.isArray(products)) {
          products.forEach((product) => {
            const categoryName =
              product.categoryName || product.category || "Khác";
            productsByCategory[categoryName] =
              (productsByCategory[categoryName] || 0) + 1;
          });
        }

        setDashboardData({
          totalProducts,
          totalOrders,
          totalRevenue,
          totalCategories,
          lowStockProducts,
          recentOrders,
          productsByCategory
        });
      } catch (err) {
        console.error("Dashboard data loading error:", err);
        setError("Không thể tải dữ liệu dashboard. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  // Calculate stats with real data
  const stats = [
    {
      title: t("admin.dashboard.stats.totalOrders"),
      value: dashboardData.totalOrders.toLocaleString(),
      change: "+12%",
      changeType: "positive",
      icon: FaShoppingCart,
      color: "bg-blue-500"
    },
    {
      title: t("admin.dashboard.stats.totalProducts"),
      value: dashboardData.totalProducts.toLocaleString(),
      change: "+8%",
      changeType: "positive",
      icon: FaBoxes,
      color: "bg-purple-500"
    },
    {
      title: t("admin.dashboard.stats.totalCategories"),
      value: dashboardData.totalCategories.toLocaleString(),
      change: "+3%",
      changeType: "positive",
      icon: FaUsers,
      color: "bg-green-500"
    },
    {
      title: t("admin.dashboard.stats.totalRevenue"),
      value: formatVND(dashboardData.totalRevenue),
      change: "+5%",
      changeType: "positive",
      icon: FaDollarSign,
      color: "bg-yellow-500"
    }
  ];

  const getStatusColor = (order) => {
    // Handle different status formats from API
    if (order.status === true && order.isPaid) {
      return "bg-green-100 text-green-800";
    } else if (order.status === true && !order.isPaid) {
      return "bg-blue-100 text-blue-800";
    } else if (order.status === false) {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-gray-100 text-gray-800";
  };

  const getStatusText = (order) => {
    if (order.status === true && order.isPaid) {
      return "Hoàn thành";
    } else if (order.status === true && !order.isPaid) {
      return "Đã xác nhận";
    } else if (order.status === false) {
      return "Chờ xử lý";
    }
    return "Không xác định";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("vi-VN");
    } catch (e) {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-blue-600 mb-4 mx-auto" />
            <p className="text-gray-600">Đang tải dữ liệu dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="text-center">
            <FaExclamationTriangle className="text-4xl text-red-600 mb-4 mx-auto" />
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Chào mừng quay trở lại!</h1>
          <p className="text-blue-100">
            Tổng quan hoạt động cửa hàng sách hôm nay.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <FaCalendarAlt className="text-blue-200" />
            <span className="text-blue-100 text-sm">
              Cập nhật lần cuối: {new Date().toLocaleString("vi-VN")}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <div className="flex items-center mt-2">
                    {stat.changeType === "positive" ? (
                      <FaArrowUp className="text-green-500 text-xs mr-1" />
                    ) : (
                      <FaArrowDown className="text-red-500 text-xs mr-1" />
                    )}
                    <span
                      className={`text-xs font-medium ${
                        stat.changeType === "positive"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {stat.change}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">
                      from last month
                    </span>
                  </div>
                </div>
                <div
                  className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white`}
                >
                  <stat.icon className="text-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart Placeholder */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Revenue Overview
              </h3>
              <FaChartLine className="text-gray-400" />
            </div>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <FaChartLine className="text-4xl text-gray-300 mb-2 mx-auto" />
                <p className="text-gray-500">Chart will be implemented here</p>
                <p className="text-sm text-gray-400">
                  Integration with Chart.js or similar
                </p>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Đơn hàng gần đây
            </h3>
            <div className="space-y-3">
              {dashboardData.recentOrders.length > 0 ? (
                dashboardData.recentOrders.map((order, index) => (
                  <div
                    key={order.orderCode || order._id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        #{order.orderCode || order._id || `ORD${index + 1}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {order.customerName || order.customer || "Khách hàng"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(order.orderDate || order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatVND(order.finalAmount || order.totalAmount || 0)}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          order
                        )}`}
                      >
                        {getStatusText(order)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FaShoppingCart className="text-3xl text-gray-300 mb-2 mx-auto" />
                  <p className="text-gray-500">Chưa có đơn hàng nào</p>
                </div>
              )}
            </div>
            <button className="w-full mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium">
              Xem tất cả đơn hàng →
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Thao tác nhanh
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                Thêm sản phẩm mới
              </button>
              <button className="w-full text-left px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                Tạo khuyến mãi
              </button>
              <button className="w-full text-left px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                Xem báo cáo
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cảnh báo tồn kho thấp
            </h3>
            <div className="space-y-2">
              {dashboardData.lowStockProducts.length > 0 ? (
                dashboardData.lowStockProducts.map((product, index) => {
                  const stock = product.stockQuantity || product.stock || 0;
                  const colorClass =
                    stock <= 3
                      ? "bg-red-50"
                      : stock <= 6
                      ? "bg-orange-50"
                      : "bg-yellow-50";
                  const textColorClass =
                    stock <= 3
                      ? "text-red-800"
                      : stock <= 6
                      ? "text-orange-800"
                      : "text-yellow-800";
                  const stockColorClass =
                    stock <= 3
                      ? "text-red-600"
                      : stock <= 6
                      ? "text-orange-600"
                      : "text-yellow-600";

                  return (
                    <div
                      key={product.productCode || index}
                      className={`flex justify-between items-center p-2 rounded ${colorClass}`}
                    >
                      <span className={`text-sm ${textColorClass} truncate`}>
                        {product.productName || `Sản phẩm ${index + 1}`}
                      </span>
                      <span className={`text-xs ${stockColorClass}`}>
                        {stock} còn lại
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <FaBoxes className="text-2xl text-gray-300 mb-2 mx-auto" />
                  <p className="text-gray-500 text-sm">
                    Không có sản phẩm sắp hết hàng
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Danh mục sản phẩm
            </h3>
            <div className="space-y-3">
              {Object.entries(dashboardData.productsByCategory).length > 0 ? (
                Object.entries(dashboardData.productsByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([category, count]) => {
                    const isObject = category && typeof category === "object";
                    const key = isObject
                      ? category.categoryCode ||
                        category.categoryName ||
                        JSON.stringify(category)
                      : category;
                    const label = isObject
                      ? category.categoryName ||
                        category.categoryCode ||
                        JSON.stringify(category)
                      : category;

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-600 truncate">
                          {label}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {count} sản phẩm
                        </span>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-4">
                  <FaUsers className="text-2xl text-gray-300 mb-2 mx-auto" />
                  <p className="text-gray-500 text-sm">Chưa có danh mục nào</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
