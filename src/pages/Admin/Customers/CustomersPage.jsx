// src/pages/admin/CustomersPage.jsx
import React, { useState, useEffect } from "react";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import { useLanguage } from "~/i18n/AdminLanguageProvider";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaUsers,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaUserCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaUser,
  FaTrophy,
  FaGift,
  FaShieldAlt,
  FaCheckCircle,
  FaTimesCircle
} from "react-icons/fa";
import axiosClient from "~/apis/axiosClient";

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [customerStats, setCustomerStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    vip: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState(""); // "", "active", "inactive", "vip"
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "created_at",
    direction: "desc"
  });

  const [formData, setFormData] = useState({
    ho_ten: "",
    email: "",
    phone: "",
    dia_chi: "",
    is_active: true
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // 🔔 Notify modal state
  const [notifyModal, setNotifyModal] = useState({
    open: false,
    type: "success", // "success" | "error"
    title: "",
    message: ""
  });

  const itemsPerPage = 10;
  const { formatVND } = useStransferToVND();
  const { t } = useLanguage();

  // ===== helpers cho notify =====
  const showNotify = (type, title, message) => {
    setNotifyModal({
      open: true,
      type,
      title,
      message
    });
  };

  const closeNotify = () => {
    setNotifyModal((prev) => ({ ...prev, open: false }));
  };

  // ====================== CALL API BACKEND ======================
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axiosClient.get("/customers");
      const data = res.data;
      const rawList = Array.isArray(data) ? data : [];

      const mapped = rawList
        .map((c) => {
          const account = c.accountEntity || {};
          const role = account.roleEntity || {};
          const customerType = c.customerTypeEntity || {};

          return {
            id: c.id,
            customerCode: c.customerCode,
            ho_ten: c.customerName || "",
            email: account.email || "",
            phone: account.phoneNumber || "",
            dia_chi: c.address || "",
            created_at: c.createdDate || null,
            is_active:
              typeof account.status === "boolean" ? account.status : true,
            roleCode: role.roleCode || "",
            roleName: role.roleName || "",
            customerTypeCode: customerType.customerTypeCode || "",
            customerTypeName: customerType.customerTypeName || "",
            points: c.points ?? 0,
            _raw: c
          };
        })
        // chỉ lấy khách hàng (role USER / CUS)
        .filter(
          (c) => !c.roleCode || c.roleCode === "USER" || c.roleCode === "CUS"
        );

      setCustomers(mapped);

      const isVipFn = (c) =>
        ["CUS_SILVER", "CUS_GOLD", "CUS_DIAMOND"].includes(
          c.customerTypeCode
        ) || c.points > 200;

      const stats = {
        total: mapped.length,
        active: mapped.filter((c) => c.is_active).length,
        inactive: mapped.filter((c) => !c.is_active).length,
        vip: mapped.filter(isVipFn).length
      };
      setCustomerStats(stats);
    } catch (err) {
      console.error("Error fetching customers:", err);
      setError(
        t("admin.customers.messages.loadError") ||
          "Không thể tải dữ liệu khách hàng. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerOrders = async (customerId) => {
    try {
      // TODO: thêm API thật khi có
      return [];
    } catch (error) {
      console.error("Error fetching customer orders:", error);
      return [];
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // ====================== FILTER + SORT ======================
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      !searchTerm ||
      customer.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase());

    const isVip =
      ["CUS_SILVER", "CUS_GOLD", "CUS_DIAMOND"].includes(
        customer.customerTypeCode
      ) || customer.points > 200;

    const matchesStatus =
      !filterStatus ||
      (filterStatus === "active" && customer.is_active) ||
      (filterStatus === "inactive" && !customer.is_active) ||
      (filterStatus === "vip" && isVip);

    return matchesSearch && matchesStatus;
  });

  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === "created_at") {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCustomers = sortedCustomers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = (key) => {
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig?.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc"
    }));
  };

  // ====================== MODALS ======================
  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      ho_ten: "",
      email: "",
      phone: "",
      dia_chi: "",
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      ho_ten: customer.ho_ten || "",
      email: customer.email || "",
      phone: customer.phone || "",
      dia_chi: customer.dia_chi || "",
      is_active: customer.is_active !== false
    });
    setIsModalOpen(true);
  };

  const openViewModal = async (customer) => {
    // mở modal ngay, tạm cho orders = []
    setViewingCustomer({
      ...customer,
      orders: []
    });
    setIsViewModalOpen(true);

    // gọi API lấy đơn hàng (sau này)
    const orders = await fetchCustomerOrders(customer.id);
    setViewingCustomer((prev) => ({
      ...prev,
      orders
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      if (editingCustomer) {
        // ===== UPDATE CUSTOMER =====
        const original = editingCustomer._raw || {};
        const originalAccount = original.accountEntity || {};

        // bỏ authorities để tránh lỗi GrantedAuthority
        const { authorities, ...accountWithoutAuthorities } = originalAccount;

        const payload = {
          ...original,
          customerName: formData.ho_ten,
          address: formData.dia_chi,
          customerCode: original.customerCode,
          accountEntity: {
            ...accountWithoutAuthorities,
            phoneNumber: formData.phone,
            email: formData.email,
            status: formData.is_active
          }
        };

        const res = await axiosClient.put(
          `/customers/${editingCustomer.id}`,
          payload
        );
        console.log("Update customer success:", res.data);

        showNotify(
          "success",
          "Cập nhật thành công",
          "Thông tin khách hàng đã được cập nhật."
        );
      } else {
        // hiện chưa có luồng create rõ ràng
        showNotify(
          "error",
          "Chưa hỗ trợ tạo mới",
          "Tính năng tạo khách hàng sẽ được cập nhật trong phiên bản sau."
        );
      }

      setIsModalOpen(false);
      setEditingCustomer(null);
      await fetchCustomers();
    } catch (error) {
      console.error("Error submitting customer:", error);
      if (error.response) {
        showNotify(
          "error",
          "Lỗi cập nhật",
          error.response.data?.message ||
            `Lỗi ${error.response.status}: yêu cầu không hợp lệ.`
        );
      } else {
        showNotify(
          "error",
          "Lỗi hệ thống",
          "Có lỗi xảy ra khi lưu khách hàng. Vui lòng thử lại."
        );
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (customer) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa khách hàng "${customer.ho_ten}"?`
      )
    ) {
      try {
        console.log("Delete customer:", customer.id);
        showNotify(
          "error",
          "Tính năng đang phát triển",
          "Xóa khách hàng sẽ được hỗ trợ trong phiên bản sau."
        );
        await fetchCustomers();
      } catch (error) {
        console.error("Error deleting customer:", error);
        showNotify(
          "error",
          "Lỗi xóa khách hàng",
          "Có lỗi xảy ra khi xóa khách hàng."
        );
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getCustomerLevel = (customer, orders = []) => {
    const totalSpent = orders.reduce(
      (sum, order) => sum + (order.total_amount || 0),
      0
    );

    if (totalSpent > 10000000)
      return {
        level: "VIP",
        color: "bg-purple-100 text-purple-800",
        icon: FaTrophy
      };
    if (totalSpent > 5000000)
      return {
        level: "Gold",
        color: "bg-yellow-100 text-yellow-800",
        icon: FaGift
      };
    if (totalSpent > 2000000)
      return {
        level: "Silver",
        color: "bg-gray-100 text-gray-800",
        icon: FaShieldAlt
      };
    return {
      level: "Regular",
      color: "bg-blue-100 text-blue-800",
      icon: FaUser
    };
  };

  // ====================== LOADING / ERROR ======================
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Đang tải dữ liệu khách hàng...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchCustomers}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // StatCard có onClick + active để lọc
  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    change,
    onClick,
    active
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left bg-white p-6 rounded-lg border transition
        ${
          active
            ? "border-blue-500 shadow-md ring-2 ring-blue-100"
            : "border-gray-200 shadow-sm hover:shadow-md"
        }`}
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color} mr-4`}>
          <Icon className="text-xl text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </button>
  );

  // ====================== UI ======================
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý khách hàng
            </h1>
            <p className="text-gray-600">
              Quản lý thông tin và hoạt động của khách hàng
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaPlus />
            <span>Thêm khách hàng</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Tổng khách hàng"
            value={customerStats.total}
            icon={FaUsers}
            color="bg-blue-500"
            change={5}
            onClick={() => {
              setFilterStatus("");
              setCurrentPage(1);
            }}
            active={filterStatus === ""}
          />
          <StatCard
            title="Đang hoạt động"
            value={customerStats.active}
            icon={FaUser}
            color="bg-green-500"
            change={2}
            onClick={() => {
              setFilterStatus("active");
              setCurrentPage(1);
            }}
            active={filterStatus === "active"}
          />
          <StatCard
            title="Ngưng hoạt động"
            value={customerStats.inactive}
            icon={FaUserCircle}
            color="bg-red-500"
            change={-1}
            onClick={() => {
              setFilterStatus("inactive");
              setCurrentPage(1);
            }}
            active={filterStatus === "inactive"}
          />
          <StatCard
            title="Khách hàng VIP"
            value={customerStats.vip}
            icon={FaTrophy}
            color="bg-purple-500"
            change={8}
            onClick={() => {
              setFilterStatus("vip");
              setCurrentPage(1);
            }}
            active={filterStatus === "vip"}
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm kiếm theo tên, email, số điện thoại..."
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngưng hoạt động</option>
                <option value="vip">Khách hàng VIP</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("ho_ten")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Khách hàng</span>
                      {sortConfig?.key === "ho_ten" && (
                        <span className="text-blue-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Liên hệ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Địa chỉ
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("created_at")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Ngày tham gia</span>
                      {sortConfig?.key === "created_at" && (
                        <span className="text-blue-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedCustomers.map((customer) => {
                  const customerLevel = getCustomerLevel(customer);
                  const LevelIcon = customerLevel.icon;

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {customer.ho_ten?.charAt(0)?.toUpperCase() ||
                                  "U"}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium text-gray-900">
                                {customer.ho_ten || "N/A"}
                              </div>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${customerLevel.color}`}
                              >
                                <LevelIcon className="mr-1 text-xs" />
                                {customerLevel.level}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Mã KH: {customer.customerCode || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <FaEnvelope className="mr-2 text-gray-400" />
                            {customer.email || "N/A"}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <FaPhone className="mr-2 text-gray-400" />
                            {customer.phone || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {customer.dia_chi || "Chưa cập nhật"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <FaCalendarAlt className="mr-2 text-gray-400" />
                          {formatDate(customer.created_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            customer.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {customer.is_active ? "Hoạt động" : "Ngưng hoạt động"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {/* NÚT XEM CHI TIẾT */}
                          <button
                            onClick={() => openViewModal(customer)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
                          {/* CHỈNH SỬA */}
                          <button
                            onClick={() => openEditModal(customer)}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </button>
                          {/* XÓA */}
                          <button
                            onClick={() => handleDelete(customer)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Xóa"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}

          {paginatedCustomers.length === 0 && (
            <div className="text-center py-12">
              <FaUsers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Không có khách hàng
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterStatus
                  ? "Không tìm thấy khách hàng phù hợp với bộ lọc."
                  : "Chưa có khách hàng nào trong hệ thống."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomer ? "Chỉnh sửa khách hàng" : "Thêm khách hàng mới"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Họ tên *
            </label>
            <input
              type="text"
              required
              value={formData.ho_ten}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, ho_ten: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập họ tên khách hàng"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập địa chỉ email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập số điện thoại"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ
            </label>
            <textarea
              value={formData.dia_chi}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dia_chi: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập địa chỉ"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={formData.is_active}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  is_active: e.target.value === "true"
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={true}>Hoạt động</option>
              <option value={false}>Ngưng hoạt động</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={submitLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {submitLoading && <FaSpinner className="animate-spin" />}
              <span>{editingCustomer ? "Cập nhật" : "Tạo mới"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View Customer Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Chi tiết khách hàng"
        size="lg"
      >
        {viewingCustomer && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 h-16 w-16">
                <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {viewingCustomer.ho_ten?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {viewingCustomer.ho_ten}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-sm font-medium">
                      {viewingCustomer.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="text-sm font-medium">
                      {viewingCustomer.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Địa chỉ</p>
                    <p className="text-sm font-medium">
                      {viewingCustomer.dia_chi || "Chưa cập nhật"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ngày tham gia</p>
                    <p className="text-sm font-medium">
                      {formatDate(viewingCustomer.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Lịch sử đơn hàng
              </h4>
              {viewingCustomer.orders && viewingCustomer.orders.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {viewingCustomer.orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium">
                            Đơn hàng #{order.id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            {formatVND(order.total_amount)}
                          </p>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              order.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : order.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  Chưa có đơn hàng nào
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* 🔔 Notify Modal */}
      <Modal isOpen={notifyModal.open} onClose={closeNotify} title="" size="sm">
        <div className="modal-pop max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 px-6 py-5">
            <div className="flex items-start gap-4">
              <div
                className={`h-11 w-11 flex items-center justify-center rounded-full shadow-md
                ${
                  notifyModal.type === "success"
                    ? "bg-gradient-to-br from-emerald-400 to-emerald-500 shadow-emerald-100"
                    : "bg-gradient-to-br from-rose-400 to-rose-500 shadow-rose-100"
                }`}
              >
                {notifyModal.type === "success" ? (
                  <FaCheckCircle className="text-white text-xl" />
                ) : (
                  <FaTimesCircle className="text-white text-xl" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  {notifyModal.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {notifyModal.message}
                </p>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={closeNotify}
                    className="px-4 py-1.5 rounded-full text-sm font-medium
                    border border-emerald-400/70 text-emerald-700
                    bg-emerald-50 hover:bg-emerald-100
                    transition-colors duration-200"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
};

export default CustomersPage;
