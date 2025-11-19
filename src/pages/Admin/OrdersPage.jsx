import React, { useState, useEffect } from "react";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaEye,
  FaShoppingCart,
  FaUser,
  FaTruck,
  FaCheck,
  FaTimes,
  FaSpinner,
  FaExclamationTriangle,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaDollarSign,
  FaBox,
  FaFileInvoiceDollar,
  FaCreditCard,
  FaSyncAlt,
  FaTag,
  FaGift,
  FaUsers,
  FaReceipt
} from "react-icons/fa";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import Table from "~/components/Admin/Table";
import { useLanguage } from "~/i18n/AdminLanguageProvider";
import { orderService } from "~/apis/orderService";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import { buildImageUrl } from "~/lib/utils";

const OrdersPage = () => {
  // State management
  const [orders, setOrders] = useState([]);
  console.log(orders);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [orderDetails, setOrderDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "orderDate",
    direction: "desc"
  });

  // Filter states
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [filterOrderType, setFilterOrderType] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalOrder, setStatusModalOrder] = useState(null);
  const [statusModalValue, setStatusModalValue] = useState("");
  const [showStatusResultModal, setShowStatusResultModal] = useState(false);
  const [statusResultMessage, setStatusResultMessage] = useState("");
  const [statusResultSuccess, setStatusResultSuccess] = useState(true);

  // Legacy states for existing template compatibility
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
    orderStatus: "pending",
    paymentStatus: "pending",
    paymentMethod: "cash",
    totalAmount: 0,
    notes: ""
  });

  const { t } = useLanguage();
  const { formatVND } = useStransferToVND();

  // Order status configurations
  const orderStatuses = [
    {
      value: "pending",
      label: t("admin.orders.status.pending"),
      color: "bg-yellow-100 text-yellow-600",
      icon: FaShoppingCart
    },
    {
      value: "confirmed",
      label: t("admin.orders.status.confirmed"),
      color: "bg-blue-100 text-blue-600",
      icon: FaCheck
    },
    {
      value: "preparing",
      label: t("admin.orders.status.preparing"),
      color: "bg-purple-100 text-purple-600",
      icon: FaUser
    },
    {
      value: "shipping",
      label: t("admin.orders.status.shipping"),
      color: "bg-orange-100 text-orange-600",
      icon: FaTruck
    },
    {
      value: "delivered",
      label: t("admin.orders.status.delivered"),
      color: "bg-green-100 text-green-600",
      icon: FaCheck
    },
    {
      value: "cancelled",
      label: t("admin.orders.status.cancelled"),
      color: "bg-red-100 text-red-600",
      icon: FaTimes
    },
    {
      value: "returned",
      label: t("admin.orders.status.returned"),
      color: "bg-gray-100 text-gray-600",
      icon: FaTimes
    }
  ];

  const paymentStatuses = [
    {
      value: "pending",
      label: t("admin.orders.paymentStatus.pending"),
      color: "bg-yellow-100 text-yellow-600"
    },
    {
      value: "paid",
      label: t("admin.orders.paymentStatus.paid"),
      color: "bg-green-100 text-green-600"
    },
    {
      value: "failed",
      label: t("admin.orders.paymentStatus.failed"),
      color: "bg-red-100 text-red-600"
    },
    {
      value: "refunded",
      label: t("admin.orders.paymentStatus.refunded"),
      color: "bg-blue-100 text-blue-600"
    }
  ];

  const orderTypes = [
    {
      value: "Online",
      label: "Online",
      color: "bg-blue-100 text-blue-600",
      icon: FaShoppingCart
    },
    {
      value: "Offline",
      label: "Offline",
      color: "bg-green-100 text-green-600",
      icon: FaUser
    }
  ];

  const paymentMethods = [
    {
      value: "Cash",
      label: "Tiền mặt",
      color: "bg-green-100 text-green-600",
      icon: FaDollarSign
    },
    {
      value: "Card",
      label: "Thẻ",
      color: "bg-blue-100 text-blue-600",
      icon: FaCreditCard
    },
    {
      value: "QR",
      label: "QR Code",
      color: "bg-purple-100 text-purple-600",
      icon: FaBox
    }
  ];

  // API Functions
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderService.getAllOrders();

      // Handle different API response structures
      const ordersData = response.data?.data || response.data || [];
      console.log("Orders API Response:", response.data);

      if (Array.isArray(ordersData)) {
        // Normalize `customerEmail` so UI consistently reads `order.customerEmail`
        const normalized = ordersData.map((o) => ({
          ...o,
          customerEmail: o.customerEmail ?? o.customer?.email ?? ""
        }));
        setOrders(normalized);
        setFilteredOrders(normalized);
      } else {
        console.warn("Orders data is not an array:", ordersData);
        setOrders([]);
        setFilteredOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError(
        t("admin.orders.messages.loadError") ||
          "Không thể tải danh sách đơn hàng"
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async (orderCode) => {
    try {
      const response = await orderService.getOrderDetails(orderCode);
      const details = response.data?.data || response.data || [];
      setOrderDetails(Array.isArray(details) ? details : []);
      return details;
    } catch (err) {
      console.error("Error fetching order details:", err);
      setOrderDetails([]);
      return [];
    }
  };

  const handleUpdateOrderStatus = async (orderCode, newStatus) => {
    try {
      setSubmitLoading(true);
      await orderService.updateOrder(orderCode, { orderStatus: newStatus });

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.orderCode === orderCode || order.id === orderCode
            ? { ...order, orderStatus: newStatus, status: newStatus }
            : order
        )
      );

      // Show success modal instead of alert
      setStatusResultMessage(
        t("admin.orders.messages.statusUpdateSuccess") ||
          "Cập nhật trạng thái thành công!"
      );
      setStatusResultSuccess(true);
      setShowStatusResultModal(true);
    } catch (err) {
      console.error("Error updating order status:", err);
      setStatusResultMessage(
        t("admin.orders.messages.statusUpdateError") ||
          "Có lỗi xảy ra khi cập nhật trạng thái"
      );
      setStatusResultSuccess(false);
      setShowStatusResultModal(true);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;

    try {
      setSubmitLoading(true);
      await orderService.deleteOrder(
        selectedOrder.orderCode || selectedOrder.id
      );

      // Remove from local state
      setOrders((prevOrders) =>
        prevOrders.filter(
          (order) =>
            order.orderCode !== selectedOrder.orderCode &&
            order.id !== selectedOrder.id
        )
      );

      setShowDeleteModal(false);
      setSelectedOrder(null);
      alert(
        t("admin.orders.messages.deleteSuccess") || "Xóa đơn hàng thành công!"
      );
    } catch (err) {
      console.error("Error deleting order:", err);
      alert(
        t("admin.orders.messages.deleteError") ||
          "Có lỗi xảy ra khi xóa đơn hàng"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      setSubmitLoading(true);
      await orderService.updateOrder(
        selectedOrder.orderCode || selectedOrder.id,
        formData
      );

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.orderCode === selectedOrder.orderCode ||
          order.id === selectedOrder.id
            ? { ...order, ...formData }
            : order
        )
      );

      setShowEditModal(false);
      setSelectedOrder(null);
      alert(
        t("admin.orders.messages.updateSuccess") ||
          "Cập nhật đơn hàng thành công!"
      );
    } catch (err) {
      console.error("Error updating order:", err);
      alert(
        t("admin.orders.messages.updateError") ||
          "Có lỗi xảy ra khi cập nhật đơn hàng"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // Modal handlers
  const openViewModal = async (order) => {
    setSelectedOrder(order);
    const details = await fetchOrderDetails(order.orderCode || order.id);
    setShowViewModal(true);
  };

  const openEditModal = (order) => {
    setSelectedOrder(order);
    setFormData({
      customerName: order.customerName || order.customer?.name || "",
      customerEmail: order.customerEmail || order.customer?.email || "",
      customerPhone: order.customerPhone || order.customer?.phone || "",
      shippingAddress: order.shippingAddress || order.address || "",
      orderStatus: order.orderStatus || order.status || "pending",
      paymentStatus: order.paymentStatus || "pending",
      paymentMethod: order.paymentMethod || "cash",
      totalAmount: order.totalAmount || order.total || 0,
      notes: order.notes || ""
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (order) => {
    setSelectedOrder(order);
    setShowDeleteModal(true);
  };

  // Helper functions
  const getStatusConfig = (status) => {
    return orderStatuses.find((s) => s.value === status) || orderStatuses[0];
  };

  const getPaymentStatusConfig = (status) => {
    return (
      paymentStatuses.find((s) => s.value === status) || paymentStatuses[0]
    );
  };

  const getOrderTypeConfig = (type) => {
    return orderTypes.find((t) => t.value === type) || orderTypes[0];
  };

  const getPaymentMethodConfig = (method) => {
    return paymentMethods.find((m) => m.value === method) || paymentMethods[0];
  };

  // Safely coerce values to number (remove non-numeric chars) and return 0 on failure
  const toSafeNumber = (v) => {
    if (v == null) return 0;
    if (typeof v === "number" && Number.isFinite(v)) return v;
    const cleaned = String(v).replace(/[^0-9.-]+/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("vi-VN");
    } catch {
      return dateString;
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Load orders on component mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter and search logic
  useEffect(() => {
    let result = orders.filter((order) => {
      const matchesSearch =
        !searchTerm ||
        (order.orderCode &&
          order.orderCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.customerName &&
          order.customerName
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (order.customerEmail &&
          order.customerEmail
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (order.customerPhone && order.customerPhone.includes(searchTerm)) ||
        (order.customer?.name &&
          order.customer.name
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (order.customer?.email &&
          order.customer.email
            .toLowerCase()
            .includes(searchTerm.toLowerCase()));

      const matchesStatus =
        !filterStatus ||
        order.orderStatus === filterStatus ||
        order.status === filterStatus;
      const matchesPaymentStatus =
        !filterPaymentStatus ||
        order.paymentStatus === filterPaymentStatus ||
        (filterPaymentStatus === "paid" && order.isPaid === true) ||
        (filterPaymentStatus === "pending" && order.isPaid === false);
      const matchesOrderType =
        !filterOrderType || order.orderType === filterOrderType;
      const matchesPaymentMethod =
        !filterPaymentMethod || order.paymentMethod === filterPaymentMethod;

      const orderDate = new Date(order.orderDate);
      const matchesDateRange =
        (!dateRange.start || orderDate >= new Date(dateRange.start)) &&
        (!dateRange.end || orderDate <= new Date(dateRange.end));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPaymentStatus &&
        matchesOrderType &&
        matchesPaymentMethod &&
        matchesDateRange
      );
    });

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "orderDate") {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        } else if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredOrders(result);
    setCurrentPage(1);
  }, [
    orders,
    searchTerm,
    sortConfig,
    filterStatus,
    filterPaymentStatus,
    filterOrderType,
    filterPaymentMethod,
    dateRange
  ]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleViewOrder = async (order) => {
    setViewingOrder(order);
    await fetchOrderDetails(order.orderCode || order.id);
    setIsModalOpen(true);
  };

  const handleUpdatePaymentStatus = async (orderCode, newPaymentStatus) => {
    try {
      setSubmitLoading(true);
      await orderService.updateOrder(orderCode, {
        paymentStatus: newPaymentStatus
      });

      // Update local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.orderCode === orderCode || order.id === orderCode
            ? { ...order, paymentStatus: newPaymentStatus }
            : order
        )
      );

      // Update viewingOrder if it's the same order
      if (
        viewingOrder &&
        (viewingOrder.orderCode === orderCode || viewingOrder.id === orderCode)
      ) {
        setViewingOrder((prev) => ({
          ...prev,
          paymentStatus: newPaymentStatus
        }));
      }

      alert(
        t("admin.orders.messages.paymentStatusUpdateSuccess") ||
          "Cập nhật trạng thái thanh toán thành công!"
      );
    } catch (err) {
      console.error("Error updating payment status:", err);
      alert(
        t("admin.orders.messages.paymentStatusUpdateError") ||
          "Có lỗi xảy ra khi cập nhật trạng thái thanh toán"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  // Status modal helpers
  const openStatusModal = (order) => {
    setStatusModalOrder(order);
    setStatusModalValue(order?.orderStatus ?? order?.status ?? "");
    setShowStatusModal(true);
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setStatusModalOrder(null);
    setStatusModalValue("");
  };

  const confirmStatusUpdate = async () => {
    if (!statusModalOrder) return;
    await handleUpdateOrderStatus(
      statusModalOrder.orderCode || statusModalOrder.id,
      statusModalValue
    );
    closeStatusModal();
  };

  const columns = [
    { key: "orderCode", label: "Mã đơn hàng", sortable: true },
    {
      key: "customerName",
      label: "Khách hàng",
      sortable: true,
      render: (_value, row) => (
        <div className="flex flex-col">
          <span className="font-medium">
            {row?.customerName ?? row?.customerCode ?? "-"}
          </span>
        </div>
      )
    },
    {
      key: "orderDate",
      label: "Ngày đặt",
      sortable: true,
      // Read date from API fields (orderDate or order_date) and fall back to value
      render: (_value, row) => {
        const rawDate = row?.orderDate ?? row?.order_date ?? _value;
        return (
          <div className="flex flex-col">
            <span>{formatDate(rawDate)}</span>
            <span className="text-xs text-gray-500">
              {rawDate
                ? new Date(rawDate).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                : ""}
            </span>
          </div>
        );
      }
    },
    {
      key: "orderType",
      label: "Loại đơn",
      sortable: true,
      // Use the full row to ensure we read the API field (orderType or order_type)
      render: (_value, row) => {
        const rawType = row?.orderType ?? row?.order_type ?? _value;
        const typeConfig = getOrderTypeConfig(rawType);
        const TypeIcon = typeConfig.icon;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${typeConfig.color}`}
          >
            <TypeIcon className="text-xs" />
            {typeConfig.label}
          </span>
        );
      }
    },
    {
      key: "paymentMethod",
      label: "Phương thức TT",
      sortable: true,
      render: (value) => {
        const methodConfig = getPaymentMethodConfig(value);
        const MethodIcon = methodConfig.icon;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${methodConfig.color}`}
          >
            <MethodIcon className="text-xs" />
            {methodConfig.label}
          </span>
        );
      }
    },
    {
      key: "finalAmount",
      label: "Tổng tiền",
      sortable: true,
      render: (value, row) => (
        <div className="flex flex-col items-end">
          <span className="font-medium text-green-600">
            {toSafeNumber(row?.finalAmount).toLocaleString()}đ
          </span>
          {row?.totalAmount !== row?.finalAmount && (
            <span className="text-xs text-gray-400 line-through">
              {toSafeNumber(row?.totalAmount ?? 0).toLocaleString()}đ
            </span>
          )}
        </div>
      )
    },
    {
      key: "orderStatus",
      label: "Tình Trạng Đơn Hàng",
      sortable: true,
      render: (value, row) => {
        // Prefer `orderStatus` from API; fall back to older `status` or boolean flag
        let statusValue = row?.orderStatus ?? row?.status ?? value;
        if (typeof statusValue === "boolean") {
          statusValue = statusValue ? "confirmed" : "pending";
        }
        const statusConfig = getStatusConfig(statusValue);
        const StatusIcon = statusConfig.icon;
        return (
          <span
            onClick={() => openStatusModal(row)}
            title="Cập nhật trạng thái"
            className={`cursor-pointer px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${statusConfig.color}`}
          >
            <StatusIcon className="text-xs" />
            {statusConfig.label}
          </span>
        );
      }
    },
    {
      key: "paymentStatus",
      label: "TT Thanh toán",
      sortable: true,
      render: (value, row) => {
        let paymentValue =
          value ?? row?.paymentStatus ?? (row?.isPaid ? "paid" : "pending");
        const paymentConfig = getPaymentStatusConfig(paymentValue);
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs ${paymentConfig.color}`}
          >
            {paymentConfig.label}
          </span>
        );
      }
    },
    {
      key: "actions",
      label: "Thao tác",
      render: (_value, order) => (
        <div className="flex gap-2 items-center">
          <button
            onClick={() => handleViewOrder(order)}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Xem chi tiết"
          >
            <FaEye />
          </button>

          <button
            onClick={() => openStatusModal(order)}
            className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded flex items-center gap-2 text-sm"
            title="Cập nhật trạng thái"
          >
            <FaEdit />
            <span>Cập nhật</span>
          </button>
        </div>
      )
    }
  ];

  const paginatedData = filteredOrders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Quản lý đơn hàng</h1>
          <div className="flex gap-2">
            <span className="text-gray-600">
              Tổng: {filteredOrders.length} đơn hàng
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <SearchBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                placeholder="Tìm kiếm theo mã đơn hàng, tên khách hàng, email, SĐT..."
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <select
                value={filterOrderType}
                onChange={(e) => setFilterOrderType(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 min-w-[120px]"
              >
                <option value="">Tất cả loại đơn</option>
                {orderTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 min-w-[120px]"
              >
                <option value="">Tất cả PT thanh toán</option>
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 min-w-[140px]"
              >
                <option value="">Tất cả trạng thái đơn</option>
                {orderStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <select
                value={filterPaymentStatus}
                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 min-w-[140px]"
              >
                <option value="">Tất cả TT thanh toán</option>
                {paymentStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateRange({ start: "", end: "" });
                  setFilterStatus("");
                  setFilterPaymentStatus("");
                  setFilterOrderType("");
                  setFilterPaymentMethod("");
                }}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
              >
                <FaSyncAlt className="text-xs" />
                Xóa bộ lọc
              </button>
            </div>
          </div>

          <Table
            columns={columns}
            data={paginatedData}
            onSort={handleSort}
            sortConfig={sortConfig}
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setViewingOrder(null);
          }}
          title={`Chi tiết đơn hàng ${viewingOrder?.orderCode}`}
          size="xl"
        >
          {viewingOrder && (
            <div className="space-y-6">
              {/* Order Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">
                    Thông tin đơn hàng
                  </h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Mã đơn hàng:</span>{" "}
                      {viewingOrder.orderCode}
                    </p>
                    <p>
                      <span className="font-medium">Ngày đặt:</span>{" "}
                      {formatDate(
                        viewingOrder.orderDate ?? viewingOrder.order_date
                      )}
                    </p>
                    <p>
                      <span className="font-medium">Trạng thái:</span>
                      <select
                        value={viewingOrder.status}
                        onChange={(e) => {
                          handleUpdateOrderStatus(
                            viewingOrder.orderCode || viewingOrder.id,
                            e.target.value
                          );
                          setViewingOrder((prev) => ({
                            ...prev,
                            status: e.target.value
                          }));
                        }}
                        className="ml-2 border border-gray-300 rounded px-2 py-1"
                      >
                        {orderStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </p>
                    <p>
                      <span className="font-medium">Thanh toán:</span>
                      <select
                        value={viewingOrder.paymentStatus}
                        onChange={(e) => {
                          handleUpdatePaymentStatus(
                            viewingOrder.orderCode || viewingOrder.id,
                            e.target.value
                          );
                          setViewingOrder((prev) => ({
                            ...prev,
                            paymentStatus: e.target.value
                          }));
                        }}
                        className="ml-2 border border-gray-300 rounded px-2 py-1"
                      >
                        {paymentStatuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </p>
                    <p>
                      <span className="font-medium">Phương thức TT:</span>{" "}
                      {viewingOrder.paymentMethod}
                    </p>
                    {viewingOrder.trackingNumber && (
                      <p>
                        <span className="font-medium">Mã vận đơn:</span>{" "}
                        {viewingOrder.trackingNumber}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800">
                    Thông tin{" "}
                    {(viewingOrder?.orderType ?? viewingOrder?.order_type ?? "")
                      .toString()
                      .toLowerCase() === "online"
                      ? "khách hàng / giao hàng"
                      : "nhân viên / cửa hàng"}
                  </h3>
                  <div className="space-y-2">
                    {(() => {
                      const rawType = (
                        viewingOrder?.orderType ??
                        viewingOrder?.order_type ??
                        ""
                      )
                        .toString()
                        .toLowerCase();
                      if (rawType === "online") {
                        return (
                          <>
                            <p>
                              <span className="font-medium">
                                Mã khách hàng:
                              </span>{" "}
                              {viewingOrder.customerCode ??
                                viewingOrder.customerName ??
                                "-"}
                            </p>
                            <p>
                              <span className="font-medium">Email:</span>{" "}
                              {viewingOrder.customerEmail ?? "-"}
                            </p>
                            <p>
                              <span className="font-medium">SĐT:</span>{" "}
                              {viewingOrder.phoneNumber ??
                                viewingOrder.customerPhone ??
                                "-"}
                            </p>
                            <p>
                              <span className="font-medium">
                                Địa chỉ giao hàng:
                              </span>{" "}
                              {viewingOrder.address ??
                                viewingOrder.shippingAddress ??
                                "-"}
                            </p>
                            {viewingOrder.trackingNumber && (
                              <p>
                                <span className="font-medium">Mã vận đơn:</span>{" "}
                                {viewingOrder.trackingNumber}
                              </p>
                            )}
                            {viewingOrder.note && (
                              <p>
                                <span className="font-medium">Ghi chú:</span>{" "}
                                {viewingOrder.note}
                              </p>
                            )}
                          </>
                        );
                      }

                      // fallback / offline
                      return (
                        <>
                          <p>
                            <span className="font-medium">Mã nhân viên:</span>{" "}
                            {viewingOrder.employeeCode ??
                              viewingOrder.employeeName ??
                              "-"}
                          </p>
                          <p>
                            <span className="font-medium">Tên nhân viên:</span>{" "}
                            {viewingOrder.employeeName ?? "-"}
                          </p>
                          <p>
                            <span className="font-medium">
                              Cửa hàng / Ghi chú:
                            </span>{" "}
                            {viewingOrder.storeName ?? viewingOrder.note ?? "-"}
                          </p>
                          <p>
                            <span className="font-medium">SĐT liên hệ:</span>{" "}
                            {viewingOrder.phoneNumber ??
                              viewingOrder.customerPhone ??
                              "-"}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Sản phẩm đặt hàng
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Sản phẩm</th>
                        <th className="px-4 py-2 text-center">Số lượng</th>
                        <th className="px-4 py-2 text-right">Đơn giá</th>
                        <th className="px-4 py-2 text-right">Giảm giá</th>
                        <th className="px-4 py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        viewingOrder.items ??
                        viewingOrder.details ??
                        orderDetails ??
                        []
                      ).map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-3">
                              {item?.image && (
                                <img
                                  src={buildImageUrl(item.image)}
                                  alt={item?.productName || "Sản phẩm"}
                                  className="w-12 h-12 object-cover rounded border"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                              )}
                              <div>
                                <div className="font-medium">
                                  {item?.productName ?? item?.name ?? "-"}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {item?.productCode ?? item?.orderDetailCode}
                                </div>
                                {item?.promotionCode && (
                                  <div className="text-xs text-blue-600 flex items-center gap-1">
                                    <FaTag className="text-xs" />
                                    {item.promotionCode}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center font-medium">
                            {item?.quantity ?? item?.qty ?? 0}
                          </td>
                          <td className="px-4 py-2 text-right">
                            {toSafeNumber(
                              item?.unitPrice ?? item?.price ?? 0
                            ).toLocaleString()}
                            đ
                          </td>
                          <td className="px-4 py-2 text-right">
                            {(() => {
                              const rawDiscount = toSafeNumber(
                                item?.discountValue ?? item?.discount ?? 0
                              );
                              if (!rawDiscount) return "-";
                              if (rawDiscount < 1) {
                                // treat as percentage (e.g., 0.1 -> 10%)
                                return (
                                  <span className="text-red-600">
                                    -{(rawDiscount * 100).toLocaleString()}%
                                  </span>
                                );
                              }
                              // treat as fixed amount
                              return (
                                <span className="text-red-600">
                                  -{rawDiscount.toLocaleString()}đ
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-green-600">
                            {toSafeNumber(
                              item?.finalPrice ??
                                item?.totalAmount ??
                                (item?.unitPrice ?? item?.price ?? 0) *
                                  (item?.quantity ?? item?.qty ?? 0)
                            ).toLocaleString()}
                            đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <FaReceipt className="text-blue-600" />
                  Tổng kết đơn hàng
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Tổng:</span>
                    <span className="font-medium">
                      {toSafeNumber(
                        viewingOrder?.totalAmount ?? 0
                      ).toLocaleString()}
                      đ
                    </span>
                  </div>

                  {viewingOrder?.promotionCustomerValue > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span className="flex items-center gap-1">
                        <FaUsers className="text-xs" />
                        Khuyến mãi thành viên (
                        {toSafeNumber(
                          viewingOrder.promotionCustomerValue * 100
                        )}
                        %):
                      </span>
                      <span>
                        -
                        {toSafeNumber(
                          viewingOrder.finalAmount *
                            viewingOrder.promotionCustomerValue
                        ).toLocaleString()}
                        đ
                      </span>
                    </div>
                  )}

                  {viewingOrder?.couponDiscountValue > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <FaGift className="text-xs" />
                        Giảm giá coupon:
                      </span>
                      <span>
                        -
                        {toSafeNumber(
                          viewingOrder.couponDiscountValue
                        ).toLocaleString()}
                        đ
                      </span>
                    </div>
                  )}

                  {toSafeNumber(viewingOrder?.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span className="flex items-center gap-1">
                        <FaTag className="text-xs" />
                        Giảm giá khác:
                      </span>
                      <span>
                        -{toSafeNumber(viewingOrder.discount).toLocaleString()}đ
                      </span>
                    </div>
                  )}

                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Tổng thanh toán:</span>
                      <span className="text-green-600">
                        {toSafeNumber(
                          viewingOrder?.finalAmount ?? 0
                        ).toLocaleString()}
                        đ
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-white rounded border">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        {viewingOrder?.paymentMethod === "Cash" ? (
                          <FaDollarSign className="text-green-600" />
                        ) : viewingOrder?.paymentMethod === "Card" ? (
                          <FaCreditCard className="text-blue-600" />
                        ) : (
                          <FaBox className="text-purple-600" />
                        )}
                        Phương thức thanh toán:
                      </span>
                      <span className="font-medium">
                        {
                          getPaymentMethodConfig(viewingOrder?.paymentMethod)
                            .label
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span>Trạng thái thanh toán:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          viewingOrder?.isPaid
                            ? "bg-green-100 text-green-600"
                            : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        {viewingOrder?.isPaid
                          ? "Đã thanh toán"
                          : "Chưa thanh toán"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setViewingOrder(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </Modal>
        {/* Status Update Modal */}
        <Modal
          isOpen={showStatusModal}
          onClose={closeStatusModal}
          title={`Cập nhật trạng thái ${statusModalOrder?.orderCode ?? ""}`}
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Chọn trạng thái mới cho đơn hàng:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {orderStatuses.map((s) => (
                <label
                  key={s.value}
                  className="flex items-center gap-3 p-2 border rounded cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="statusModal"
                    value={s.value}
                    checked={statusModalValue === s.value}
                    onChange={(e) => setStatusModalValue(e.target.value)}
                  />
                  <span className={`px-2 py-1 rounded text-xs ${s.color}`}>
                    {s.label}
                  </span>
                  <div className="ml-auto text-xs text-gray-500">{s.value}</div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeStatusModal}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Hủy
              </button>
              <button
                onClick={confirmStatusUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
              >
                {submitLoading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaCheck />
                )}
                Cập nhật
              </button>
            </div>
          </div>
        </Modal>
        {/* Status Update Result Modal */}
        <Modal
          isOpen={showStatusResultModal}
          onClose={() => setShowStatusResultModal(false)}
          title={statusResultSuccess ? "Thành công" : "Lỗi"}
          size="sm"
        >
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-3xl">
              {statusResultSuccess ? (
                <FaCheck className="text-green-600" />
              ) : (
                <FaTimes className="text-red-600" />
              )}
            </div>
            <div className="text-center text-sm text-gray-700 px-4">
              {statusResultMessage}
            </div>
            <div className="w-full flex justify-center pt-2">
              <button
                onClick={() => setShowStatusResultModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                <option value="">Tất cả trạng thái</option>
                {orderStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </button>
              <select
                value={filterPaymentStatus}
                onChange={(e) => setFilterPaymentStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Tất cả thanh toán</option>
                {paymentStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setDateRange({ start: "", end: "" })}
                className="px-3 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default OrdersPage;
