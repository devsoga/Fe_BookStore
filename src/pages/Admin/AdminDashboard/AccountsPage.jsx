// src/pages/admin/AccountsPage.jsx
import React, { useEffect, useState } from "react";
import AdminLayout from "~/components/Admin/AdminLayout";
import Table from "~/components/Admin/Table";
import Modal from "~/components/Admin/Modal";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import axiosClient from "~/apis/axiosClient";
import { FaPlus, FaUser, FaToggleOn, FaToggleOff } from "react-icons/fa";

const roleDefs = [
  { code: "ADMIN", label: "Admin" },
  { code: "MPOS", label: "POS" },
  { code: "KT", label: "Accountant" },
  { code: "USER", label: "Customer" }
];

const mapRoleCodeToLabel = (roleCode) => {
  const found = roleDefs.find((r) => r.code === roleCode);
  return found ? found.label : roleCode || "Unknown";
};

const mapLabelToRoleCode = (label) => {
  const found = roleDefs.find((r) => r.label === label);
  return found ? found.code : label || "USER";
};

const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { hour12: false });
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN");
};

const AccountsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // 🔍 Modal xem chi tiết
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingAccount, setViewingAccount] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "username",
    direction: "asc"
  });

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    status: "Active"
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const itemsPerPage = 10;

  // ====== dữ liệu gán account cho Employee / Customer ======
  const [employeeOptions, setEmployeeOptions] = useState([]); // { code, name }
  const [customerOptions, setCustomerOptions] = useState([]); // { code, name }
  const [ownerType, setOwnerType] = useState(""); // "EMPLOYEE" | "CUSTOMER" | ""
  const [ownerMode, setOwnerMode] = useState("select"); // "select" | "create"
  const [selectedOwnerCode, setSelectedOwnerCode] = useState("");

  // mini form tạo Customer mới
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    status: "ACTIVE" // Hoạt động / Ngưng hoạt động
  });

  // mini form tạo Employee mới
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    name: "",
    code: "",
    phone: "",
    position: "",
    department: "",
    status: "ACTIVE" // Đang làm việc / Nghỉ việc
  });

  // ====================== FETCH ACCOUNTS ======================
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ GỌI ĐÚNG ENDPOINT: GET /v1/api/account
      const res = await axiosClient.get("/account");
      const payload = res.data || {};

      // BaseRespone: { statusCode, message, data: [...] }
      const rawList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
        ? payload.data
        : [];

      const mapped = rawList.map((acc, idx) => {
        const roleCode = acc.roleCode || acc.role || "";
        const statusBool = true; // backend chưa trả status -> mặc định Active

        const ownerType = acc.customerCode
          ? "Customer"
          : acc.employeeCode
          ? "Employee"
          : "";
        const ownerName = acc.customerName || acc.employeeName || "";

        return {
          id: acc.id ?? idx + 1,
          accountCode: acc.accountCode || "",
          username: acc.username || "",
          email: acc.email || "",
          roleCode,
          role: mapRoleCodeToLabel(roleCode),
          status: statusBool ? "Active" : "Inactive",
          is_active: statusBool,
          phoneNumber: acc.phoneNumber || "",
          createdAt: acc.createdDate || null,
          lastLogin: null,
          ownerType,
          ownerName,
          _raw: acc
        };
      });

      setAccounts(mapped);
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError("Không thể tải danh sách tài khoản. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // ====================== FETCH EMPLOYEES / CUSTOMERS ======================
  const fetchEmployeeOptions = async () => {
    try {
      const res = await axiosClient.get("/employees");
      const payload = res.data || {};
      const list = Array.isArray(payload) ? payload : payload.data || [];

      const mapped = list.map((e) => ({
        code: e.employeeCode,
        name: e.employeeName
      }));
      setEmployeeOptions(mapped);
    } catch (err) {
      console.error("Error fetching employees for account:", err);
    }
  };

  const fetchCustomerOptions = async () => {
    try {
      const res = await axiosClient.get("/customers");
      const payload = res.data || {};
      const list = Array.isArray(payload) ? payload : payload.data || [];

      const mapped = list.map((c) => ({
        code: c.customerCode,
        name: c.customerName
      }));
      setCustomerOptions(mapped);
    } catch (err) {
      console.error("Error fetching customers for account:", err);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchEmployeeOptions();
    fetchCustomerOptions();
  }, []);

  // ====================== FILTER + SORT ======================
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      !searchTerm ||
      account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = !filterRole || account.role === filterRole;
    const matchesStatus = !filterStatus || account.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === "createdAt" || sortConfig.key === "lastLogin") {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAccounts = sortedAccounts.slice(
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
  const resetOwnerState = () => {
    setOwnerType("");
    setOwnerMode("select");
    setSelectedOwnerCode("");
    setNewCustomerForm({ name: "", phone: "", address: "", status: "ACTIVE" });
    setNewEmployeeForm({
      name: "",
      code: "",
      phone: "",
      position: "",
      department: "",
      status: "ACTIVE"
    });
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormData({
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "",
      status: "Active"
    });
    resetOwnerState();
    setIsModalOpen(true);
  };

  const openEditModal = (account) => {
    setEditingAccount(account);
    setFormData({
      username: account.username,
      email: account.email,
      password: "",
      confirmPassword: "",
      role: account.role,
      status: account.status
    });

    let initOwnerType = "";
    let initOwnerCode = "";

    if (account._raw?.customerCode) {
      initOwnerType = "CUSTOMER";
      initOwnerCode = account._raw.customerCode;
    } else if (account._raw?.employeeCode) {
      initOwnerType = "EMPLOYEE";
      initOwnerCode = account._raw.employeeCode;
    }

    setOwnerType(initOwnerType);
    setOwnerMode("select");
    setSelectedOwnerCode(initOwnerCode);
    setIsModalOpen(true);
  };

  // 🔍 mở modal xem chi tiết
  const openViewModal = (account) => {
    setViewingAccount(account);
    setIsViewModalOpen(true);
  };

  // ====================== SUBMIT (CREATE / EDIT) ======================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingAccount) {
      // Tạo mới bắt buộc phải có mật khẩu
      if (formData.password !== formData.confirmPassword) {
        alert("Mật khẩu xác nhận không khớp!");
        return;
      }

      // Nếu chọn tạo mới Customer/Employee thì validate mini-form
      if (ownerType === "CUSTOMER" && ownerMode === "create") {
        if (!newCustomerForm.name.trim()) {
          alert("Vui lòng nhập họ tên khách hàng.");
          return;
        }
      }
      if (ownerType === "EMPLOYEE" && ownerMode === "create") {
        if (!newEmployeeForm.name.trim()) {
          alert("Vui lòng nhập họ tên nhân viên.");
          return;
        }
      }
    }

    setSubmitLoading(true);

    try {
      if (editingAccount) {
        // Chưa có API update -> chỉ cập nhật trên UI
        // ❗ Không cho sửa username -> giữ nguyên username cũ
        setAccounts((prev) =>
          prev.map((acc) =>
            acc.id === editingAccount.id
              ? {
                  ...acc,
                  // username: giữ nguyên acc.username
                  email: formData.email,
                  role: formData.role,
                  roleCode: mapLabelToRoleCode(formData.role),
                  status: formData.status,
                  is_active: formData.status === "Active"
                }
              : acc
          )
        );

        alert(
          "Đã cập nhật tài khoản trên giao diện. Khi backend có API update, chỉ cần thêm axiosClient.put vào đây."
        );
      } else {
        // ====== TẠO ACCOUNT MỚI + (OPTIONAL) TẠO CUSTOMER/EMPLOYEE MỚI ======
        let customerCodeToUse = "";
        let employeeCodeToUse = "";

        // 1. Nếu chọn tạo mới Customer/Employee thì tạo trước để lấy code
        if (ownerType === "CUSTOMER" && ownerMode === "create") {
          const body = {
            // TODO: chỉnh payload đúng với CustomerEntity/DTO backend
            customerName: newCustomerForm.name,
            address: newCustomerForm.address,
            phoneNumber: newCustomerForm.phone
            // có thể thêm status nếu backend hỗ trợ
          };

          const resCus = await axiosClient.post("/customers", body);
          const createdCus = resCus.data?.data || resCus.data;
          customerCodeToUse = createdCus.customerCode;
        } else if (ownerType === "CUSTOMER" && ownerMode === "select") {
          customerCodeToUse = selectedOwnerCode || "";
        }

        if (ownerType === "EMPLOYEE" && ownerMode === "create") {
          const body = {
            // TODO: chỉnh payload đúng với EmployeeEntity/DTO backend
            employeeName: newEmployeeForm.name,
            employeeCode: newEmployeeForm.code || null,
            phoneNumber: newEmployeeForm.phone,
            position: newEmployeeForm.position
            // có thể thêm department/status nếu backend hỗ trợ
          };

          const resEmp = await axiosClient.post("/employees", body);
          const createdEmp = resEmp.data?.data || resEmp.data;
          employeeCodeToUse = createdEmp.employeeCode;
        } else if (ownerType === "EMPLOYEE" && ownerMode === "select") {
          employeeCodeToUse = selectedOwnerCode || "";
        }

        // 2. Tạo account
        const payload = {
          username: formData.username,
          password: formData.password,
          email: formData.email,
          phoneNumber: newCustomerForm.phone || newEmployeeForm.phone || "", // ưu tiên số điện thoại vừa nhập
          roleCode: mapLabelToRoleCode(formData.role)
        };

        if (customerCodeToUse) {
          payload.customerCode = customerCodeToUse;
        }
        if (employeeCodeToUse) {
          payload.employeeCode = employeeCodeToUse;
        }

        const res = await axiosClient.post("/account/register", payload);
        console.log("Create account response:", res.data);

        alert("Tạo tài khoản mới thành công!");
        await fetchAccounts();
        await fetchCustomerOptions();
        await fetchEmployeeOptions();
      }

      setIsModalOpen(false);
      setEditingAccount(null);
    } catch (err) {
      console.error("Error submitting account:", err);
      if (err.response) {
        alert(
          err.response.data?.message ||
            `Lỗi ${err.response.status}: Không thể lưu tài khoản.`
        );
      } else {
        alert("Có lỗi xảy ra khi lưu tài khoản. Vui lòng thử lại.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // ====================== DELETE + TOGGLE ======================
  const handleDelete = (account) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa tài khoản "${account.username}"?`
      )
    ) {
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      alert(
        "Đã xóa tài khoản trên giao diện. Khi backend có API DELETE, thêm axiosClient.delete vào đây."
      );
    }
  };

  const toggleAccountStatus = (account) => {
    const newStatus = account.status === "Active" ? "Inactive" : "Active";

    setAccounts((prev) =>
      prev.map((a) =>
        a.id === account.id
          ? { ...a, status: newStatus, is_active: newStatus === "Active" }
          : a
      )
    );
  };

  // ====================== TABLE CONFIG ======================
  const columns = [
    {
      key: "username",
      title: "Username",
      sortable: true,
      // Table đang truyền cả row vào đây
      render: (row) => (
        <div className="flex items-center">
          <FaUser className="text-blue-500 mr-2" />
          <span className="font-medium">{row.username}</span>
        </div>
      )
    },
    {
      key: "email",
      title: "Email",
      sortable: true,
      render: (row) => <span>{row.email}</span>
    },
    {
      key: "role",
      title: "Role",
      render: (row) => {
        const value = row.role;
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              value === "Admin"
                ? "bg-red-100 text-red-800"
                : value === "POS"
                ? "bg-yellow-100 text-yellow-800"
                : value === "Accountant"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {value}
          </span>
        );
      }
    },
    {
      key: "ownerName",
      title: "Gán cho",
      render: (row) => (
        <div className="text-sm">
          <div className="font-medium">{row.ownerName || "—"}</div>
          <div className="text-xs text-gray-500">
            {row.ownerType === "Customer"
              ? "Khách hàng"
              : row.ownerType === "Employee"
              ? "Nhân viên"
              : ""}
          </div>
        </div>
      )
    },
    {
      key: "status",
      title: "Status",
      render: (row) => {
        const value = row.status;
        return (
          <button
            type="button"
            onClick={() => toggleAccountStatus(row)}
            className="flex items-center space-x-1"
          >
            {value === "Active" ? (
              <FaToggleOn className="text-green-500 text-xl" />
            ) : (
              <FaToggleOff className="text-gray-400 text-xl" />
            )}
            <span
              className={`text-xs font-medium ${
                value === "Active" ? "text-green-600" : "text-gray-600"
              }`}
            >
              {value}
            </span>
          </button>
        );
      }
    },
    {
      key: "lastLogin",
      title: "Last Login",
      sortable: true,
      render: (row) => (
        <span>
          {row.lastLogin ? formatDateTime(row.lastLogin) : "Chưa đăng nhập"}
        </span>
      )
    },
    {
      key: "createdAt",
      title: "Created At",
      sortable: true,
      render: (row) => <span>{formatDate(row.createdAt)}</span>
    }
  ];

  // ✅ thêm action view, giữ nguyên edit & delete
  const actions = {
    view: openViewModal,
    edit: openEditModal,
    delete: handleDelete
  };

  // ====================== LOADING / ERROR ======================
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Đang tải danh sách tài khoản...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchAccounts}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ====================== UI ======================
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý tài khoản
            </h1>
            <p className="text-gray-600">
              Quản lý tài khoản hệ thống và phân quyền.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaPlus />
            <span>Thêm tài khoản</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm kiếm theo username hoặc email..."
              />
            </div>
            <div>
              <select
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả vai trò</option>
                {roleDefs.map((role) => (
                  <option key={role.code} value={role.label}>
                    {role.label}
                  </option>
                ))}
              </select>
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
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Table
            columns={columns}
            data={paginatedAccounts}
            actions={actions}
            sortConfig={sortConfig}
            onSort={handleSort}
          />

          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? "Chỉnh sửa tài khoản" : "Tạo tài khoản mới"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Thông tin account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username *
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, username: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập username"
              disabled={!!editingAccount} // 🔒 không cho sửa username khi edit
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
              placeholder="Nhập email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu {!editingAccount && "*"}
            </label>
            <input
              type="password"
              required={!editingAccount}
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder={
                editingAccount
                  ? "Để trống nếu không đổi mật khẩu"
                  : "Nhập mật khẩu"
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu {!editingAccount && "*"}
            </label>
            <input
              type="password"
              required={!editingAccount}
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập lại mật khẩu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vai trò *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Chọn vai trò</option>
              {roleDefs.map((role) => (
                <option key={role.code} value={role.label}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {/* Gán account cho Employee / Customer */}
          <div className="pt-2 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gán tài khoản cho
            </label>
            <div className="flex items-center gap-4 mt-1">
              <label className="inline-flex items-center text-sm">
                <input
                  type="radio"
                  className="mr-2"
                  value="CUSTOMER"
                  checked={ownerType === "CUSTOMER"}
                  onChange={(e) => {
                    setOwnerType(e.target.value);
                    setOwnerMode("select");
                    setSelectedOwnerCode("");
                  }}
                  disabled={!!editingAccount}
                />
                Khách hàng
              </label>
              <label className="inline-flex items-center text-sm">
                <input
                  type="radio"
                  className="mr-2"
                  value="EMPLOYEE"
                  checked={ownerType === "EMPLOYEE"}
                  onChange={(e) => {
                    setOwnerType(e.target.value);
                    setOwnerMode("select");
                    setSelectedOwnerCode("");
                  }}
                  disabled={!!editingAccount}
                />
                Nhân viên
              </label>
            </div>

            {ownerType && !editingAccount && (
              <div className="mt-3 inline-flex rounded-full bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => setOwnerMode("select")}
                  className={`px-3 py-1 text-xs rounded-full ${
                    ownerMode === "select"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-600"
                  }`}
                >
                  Chọn có sẵn
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerMode("create")}
                  className={`px-3 py-1 text-xs rounded-full ${
                    ownerMode === "create"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-600"
                  }`}
                >
                  Tạo mới
                </button>
              </div>
            )}

            {/* Chọn có sẵn */}
            {ownerType === "CUSTOMER" && ownerMode === "select" && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Chọn khách hàng
                </label>
                <select
                  value={selectedOwnerCode}
                  onChange={(e) => setSelectedOwnerCode(e.target.value)}
                  disabled={!!editingAccount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Chưa gán --</option>
                  {customerOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {ownerType === "EMPLOYEE" && ownerMode === "select" && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Chọn nhân viên
                </label>
                <select
                  value={selectedOwnerCode}
                  onChange={(e) => setSelectedOwnerCode(e.target.value)}
                  disabled={!!editingAccount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Chưa gán --</option>
                  {employeeOptions.map((e) => (
                    <option key={e.code} value={e.code}>
                      {e.code} - {e.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Form tạo mới CUSTOMER */}
            {ownerType === "CUSTOMER" &&
              ownerMode === "create" &&
              !editingAccount && (
                <div className="mt-3 space-y-3 bg-blue-50/60 border border-blue-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-700">
                    Thông tin khách hàng mới
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Họ tên khách hàng *
                    </label>
                    <input
                      type="text"
                      value={newCustomerForm.name}
                      onChange={(e) =>
                        setNewCustomerForm((prev) => ({
                          ...prev,
                          name: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nhập họ tên"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email (tự động lấy từ tài khoản)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={formData.email}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      value={newCustomerForm.phone}
                      onChange={(e) =>
                        setNewCustomerForm((prev) => ({
                          ...prev,
                          phone: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nhập số điện thoại"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Địa chỉ
                    </label>
                    <textarea
                      rows={2}
                      value={newCustomerForm.address}
                      onChange={(e) =>
                        setNewCustomerForm((prev) => ({
                          ...prev,
                          address: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nhập địa chỉ"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={newCustomerForm.status}
                      onChange={(e) =>
                        setNewCustomerForm((prev) => ({
                          ...prev,
                          status: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="INACTIVE">Ngưng hoạt động</option>
                    </select>
                  </div>
                </div>
              )}

            {/* Form tạo mới EMPLOYEE */}
            {ownerType === "EMPLOYEE" &&
              ownerMode === "create" &&
              !editingAccount && (
                <div className="mt-3 space-y-3 bg-emerald-50/70 border border-emerald-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-emerald-700">
                    Thông tin nhân viên mới
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Họ tên nhân viên *
                    </label>
                    <input
                      type="text"
                      value={newEmployeeForm.name}
                      onChange={(e) =>
                        setNewEmployeeForm((prev) => ({
                          ...prev,
                          name: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Nhập họ tên"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Mã nhân viên
                      </label>
                      <input
                        type="text"
                        value={newEmployeeForm.code}
                        onChange={(e) =>
                          setNewEmployeeForm((prev) => ({
                            ...prev,
                            code: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="VD: NV_ADMIN"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={newEmployeeForm.phone}
                        onChange={(e) =>
                          setNewEmployeeForm((prev) => ({
                            ...prev,
                            phone: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Nhập số điện thoại"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Email (tự động lấy từ tài khoản)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={formData.email}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Phòng ban *
                      </label>
                      <select
                        value={newEmployeeForm.department}
                        onChange={(e) =>
                          setNewEmployeeForm((prev) => ({
                            ...prev,
                            department: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Chọn phòng ban</option>
                        <option value="Quản lý">Quản lý</option>
                        <option value="Bán hàng">Bán hàng</option>
                        <option value="Kho">Kho</option>
                        <option value="Kế toán">Kế toán</option>
                        <option value="Hỗ trợ">Hỗ trợ</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Giao hàng">Giao hàng</option>
                        <option value="IT">IT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Chức vụ
                      </label>
                      <input
                        type="text"
                        value={newEmployeeForm.position}
                        onChange={(e) =>
                          setNewEmployeeForm((prev) => ({
                            ...prev,
                            position: e.target.value
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="VD: Nhân viên bán hàng"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={newEmployeeForm.status}
                      onChange={(e) =>
                        setNewEmployeeForm((prev) => ({
                          ...prev,
                          status: e.target.value
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="ACTIVE">Đang làm việc</option>
                      <option value="INACTIVE">Nghỉ việc</option>
                    </select>
                  </div>
                </div>
              )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {submitLoading
                ? "Đang lưu..."
                : editingAccount
                ? "Cập nhật"
                : "Tạo mới"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Chi tiết tài khoản"
        size="md"
      >
        {viewingAccount && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Username:</span>
              <span className="font-medium">{viewingAccount.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="font-medium break-all">
                {viewingAccount.email}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Role:</span>
              <span className="font-medium">{viewingAccount.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Trạng thái:</span>
              <span
                className={`font-medium ${
                  viewingAccount.status === "Active"
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                {viewingAccount.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gán cho:</span>
              <span className="font-medium">
                {viewingAccount.ownerName
                  ? `${viewingAccount.ownerName} (${
                      viewingAccount.ownerType === "Customer"
                        ? "Khách hàng"
                        : "Nhân viên"
                    })`
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ngày tạo:</span>
              <span className="font-medium">
                {formatDate(viewingAccount.createdAt) || "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Lần đăng nhập cuối:</span>
              <span className="font-medium">
                {viewingAccount.lastLogin
                  ? formatDateTime(viewingAccount.lastLogin)
                  : "Chưa đăng nhập"}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
};

export default AccountsPage;
