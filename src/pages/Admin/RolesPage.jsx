// src/pages/admin/RolesPage.jsx
import React, { useEffect, useState } from "react";
import AdminLayout from "~/components/Admin/AdminLayout";
import Table from "~/components/Admin/Table";
import Modal from "~/components/Admin/Modal";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import axiosClient from "~/apis/axiosClient";
import { FaPlus, FaShieldAlt } from "react-icons/fa";

// Gợi ý mô tả / quyền hiển thị cho từng roleCode
const getRoleDescription = (roleCode) => {
  switch (roleCode) {
    case "ADMIN":
      return "Toàn quyền hệ thống (quản lý cấu hình, users, dữ liệu).";
    case "MPOS":
      return "Nhân viên bán hàng POS: tạo hóa đơn, xử lý thanh toán.";
    case "KT":
      return "Kế toán: quản lý công nợ, báo cáo doanh thu.";
    case "USER":
      return "Khách hàng: đặt hàng và xem lịch sử mua hàng.";
    default:
      return "Vai trò hệ thống.";
  }
};

const getPermissionsLevel = (roleCode) => {
  switch (roleCode) {
    case "ADMIN":
      return "All";
    case "MPOS":
    case "KT":
      return "Limited";
    case "USER":
      return "Read-only";
    default:
      return "Basic";
  }
};

const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "roleCode",
    direction: "asc"
  });

  const [formData, setFormData] = useState({
    roleCode: "",
    roleName: "",
    description: "",
    permissions: "",
    status: "Active"
  });

  const [submitLoading, setSubmitLoading] = useState(false);
  const itemsPerPage = 10;

  // ===================== FETCH ROLES TỪ BACKEND =====================
  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);

      // GET /v1/api/roles
      const res = await axiosClient.get("/roles");
      const raw = Array.isArray(res.data) ? res.data : res.data.data || [];

      const mapped = raw.map((r) => {
        const description = getRoleDescription(r.roleCode);
        const permissions = getPermissionsLevel(r.roleCode);

        return {
          id: r.id,
          roleCode: r.roleCode,
          roleName: r.roleName,
          description,
          permissions,
          status: "Active", // backend chưa có field status → hiển thị mặc định Active
          createdAt: r.createdDate || null,
          _raw: r
        };
      });

      setRoles(mapped);
    } catch (err) {
      console.error("Error fetching roles:", err);
      setError("Không thể tải danh sách vai trò. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  // ===================== FILTER + SORT =====================
  const filteredRoles = roles.filter((role) => {
    const term = searchTerm.toLowerCase();
    return (
      role.roleCode.toLowerCase().includes(term) ||
      role.roleName.toLowerCase().includes(term) ||
      role.description.toLowerCase().includes(term)
    );
  });

  const sortedRoles = [...filteredRoles].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key] ?? "";
    const bValue = b[sortConfig.key] ?? "";

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRoles = sortedRoles.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  // ===================== MODAL OPEN/CLOSE =====================
  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({
      roleCode: "",
      roleName: "",
      description: "",
      permissions: "",
      status: "Active"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setFormData({
      roleCode: role.roleCode,
      roleName: role.roleName,
      description: role.description,
      permissions: role.permissions,
      status: role.status
    });
    setIsModalOpen(true);
  };

  // ===================== SUBMIT (CREATE / UPDATE) =====================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const payload = {
        // Chỉ gửi đúng những field RoleEntity đang có
        roleCode: formData.roleCode.trim(),
        roleName: formData.roleName.trim()
      };

      if (editingRole) {
        // PUT /v1/api/roles/{id}
        await axiosClient.put(`/roles/${editingRole.id}`, payload);
        alert("Cập nhật vai trò thành công!");
      } else {
        // POST /v1/api/roles
        await axiosClient.post("/roles", payload);
        alert("Tạo vai trò mới thành công!");
      }

      setIsModalOpen(false);
      setEditingRole(null);
      await fetchRoles();
    } catch (err) {
      console.error("Error saving role:", err);
      if (err.response) {
        alert(
          err.response.data?.message ||
            `Lỗi ${err.response.status}: Không thể lưu vai trò.`
        );
      } else {
        alert("Có lỗi xảy ra khi lưu vai trò. Vui lòng thử lại.");
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // ===================== DELETE =====================
  const handleDelete = async (role) => {
    if (
      !window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${role.roleName}"?`)
    ) {
      return;
    }

    try {
      // DELETE /v1/api/roles/{id}
      await axiosClient.delete(`/roles/${role.id}`);
      alert("Xóa vai trò thành công!");
      await fetchRoles();
    } catch (err) {
      console.error("Error deleting role:", err);
      if (err.response) {
        alert(
          err.response.data?.message ||
            `Lỗi ${err.response.status}: Không thể xóa vai trò.`
        );
      } else {
        alert("Có lỗi xảy ra khi xóa vai trò. Vui lòng thử lại.");
      }
    }
  };

  // ===================== TABLE CONFIG =====================
  const columns = [
    {
      key: "roleCode",
      title: "Role Code",
      sortable: true
    },
    {
      key: "roleName",
      title: "Role Name",
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <FaShieldAlt className="text-blue-500 mr-2" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    { key: "description", title: "Description", sortable: true },
    {
      key: "permissions",
      title: "Permissions",
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "All"
              ? "bg-green-100 text-green-800"
              : value === "Limited"
              ? "bg-yellow-100 text-yellow-800"
              : value === "Basic"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value}
        </span>
      )
    },
    {
      key: "status",
      title: "Status",
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "Active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {value}
        </span>
      )
    }
  ];

  const actions = {
    edit: openEditModal,
    delete: handleDelete
  };

  // ===================== LOADING / ERROR =====================
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Đang tải danh sách vai trò...</p>
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
              onClick={fetchRoles}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Thử lại
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ===================== UI CHÍNH =====================
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý vai trò
            </h1>
            <p className="text-gray-600">
              Quản lý các vai trò người dùng và phân quyền truy cập.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaPlus />
            <span>Thêm vai trò</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm kiếm theo role code, tên role, mô tả..."
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <Table
            columns={columns}
            data={paginatedRoles}
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
        title={editingRole ? "Chỉnh sửa vai trò" : "Tạo vai trò mới"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Code *
            </label>
            <input
              type="text"
              required
              value={formData.roleCode}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, roleCode: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="VD: ADMIN, MPOS, KT, USER"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Name *
            </label>
            <input
              type="text"
              required
              value={formData.roleName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, roleName: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Tên hiển thị của vai trò"
            />
          </div>

          {/* description & permissions hiện chỉ dùng cho UI hiển thị */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (hiển thị)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value
                }))
              }
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Mô tả ngắn về quyền hạn của vai trò"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permissions Level (hiển thị)
            </label>
            <select
              value={formData.permissions}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  permissions: e.target.value
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Chọn mức phân quyền</option>
              <option value="All">All Permissions</option>
              <option value="Limited">Limited Permissions</option>
              <option value="Basic">Basic Permissions</option>
              <option value="Read-only">Read-only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status (hiển thị)
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
                : editingRole
                ? "Cập nhật"
                : "Tạo mới"}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};

export default RolesPage;
