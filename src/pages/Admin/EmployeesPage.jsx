// src/pages/admin/EmployeesPage.jsx
import React, { useState, useEffect } from "react";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import { useLanguage } from "~/i18n/AdminLanguageProvider";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import axiosClient from "~/apis/axiosClient";

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
  FaIdBadge,
  FaDollarSign,
  FaStar,
  FaUser,
  FaTrophy,
  FaBriefcase,
  FaBuilding,
  FaCrown,
  FaUserTie,
  FaTools,
  FaChartLine,
  FaCheckCircle,
  FaTimesCircle
} from "react-icons/fa";

const EmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [employeeStats, setEmployeeStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    managers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({
    key: "hire_date",
    direction: "desc"
  });
  const [formData, setFormData] = useState({
    ho_ten: "",
    email: "",
    phone: "",
    dia_chi: "",
    department: "",
    position: "",
    salary: "",
    employee_id: "",
    is_active: true
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // 🔔 Notify modal
  const [notifyModal, setNotifyModal] = useState({
    open: false,
    type: "success", // success | error
    title: "",
    message: ""
  });

  const itemsPerPage = 10;
  const { formatVND } = useStransferToVND();
  const { t } = useLanguage();

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

  // Phòng ban hiển thị trên filter
  const departments = [
    t("admin.employees.departments.management"),
    t("admin.employees.departments.sales"),
    t("admin.employees.departments.warehouse"),
    t("admin.employees.departments.support"),
    t("admin.employees.departments.accounting"),
    t("admin.employees.departments.marketing"),
    t("admin.employees.departments.delivery"),
    t("admin.employees.departments.it")
  ];

  // Map roleCode -> tên phòng ban hiển thị
  const mapRoleCodeToDepartment = (roleCode) => {
    switch (roleCode) {
      case "ADMIN":
        return t("admin.employees.departments.management");
      case "MPOS":
        return t("admin.employees.departments.sales");
      case "KT":
        return t("admin.employees.departments.accounting");
      default:
        return t("admin.employees.departments.it");
    }
  };

  // ==================== FETCH EMPLOYEES FROM API ====================
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axiosClient.get("/employees");
      const rawList = Array.isArray(res.data) ? res.data : res.data.data || [];

      const mapped = rawList.map((e) => {
        const account = e.accountEntity || {};
        const role = account.roleEntity || {};

        const department = mapRoleCodeToDepartment(role.roleCode);

        return {
          id: e.id,
          employeeCode: e.employeeCode,
          employeeName: e.employeeName,
          birthDate: e.birthDate,
          gender: e.gender,
          created_at: e.createdDate,
          hire_date: e.createdDate,

          ho_ten: e.employeeName || "",
          employee_id: e.employeeCode || "",
          email: account.email || "",
          phone: account.phoneNumber || "",
          is_active:
            typeof account.status === "boolean" ? account.status : true,

          department,
          position: role.roleName || "",
          salary: 0,
          dia_chi: "",

          roleCode: role.roleCode || "",
          _raw: e
        };
      });

      setEmployees(mapped);

      const stats = {
        total: mapped.length,
        active: mapped.filter((e) => e.is_active).length,
        inactive: mapped.filter((e) => !e.is_active).length,
        managers: mapped.filter((e) => e.roleCode === "ADMIN").length
      };
      setEmployeeStats(stats);
    } catch (err) {
      console.error("Error fetching employees:", err);
      setError("Không thể tải dữ liệu nhân viên. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== FILTER + SORT ====================
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      !searchTerm ||
      employee.ho_ten?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      !filterStatus ||
      (filterStatus === "active" && employee.is_active) ||
      (filterStatus === "inactive" && !employee.is_active);

    const matchesDepartment =
      !filterDepartment || employee.department === filterDepartment;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (!sortConfig) return 0;

    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (sortConfig.key === "hire_date" || sortConfig.key === "created_at") {
      aValue = aValue ? new Date(aValue) : new Date(0);
      bValue = bValue ? new Date(bValue) : new Date(0);
    }

    if (sortConfig.key === "salary") {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = sortedEmployees.slice(
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

  // ==================== MODALS ====================
  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      ho_ten: "",
      email: "",
      phone: "",
      dia_chi: "",
      department: "",
      position: "",
      salary: "",
      employee_id: "",
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      ho_ten: employee.ho_ten || "",
      email: employee.email || "",
      phone: employee.phone || "",
      dia_chi: employee.dia_chi || "",
      department: employee.department || "",
      position: employee.position || "",
      salary: employee.salary || "",
      employee_id: employee.employee_id || "",
      is_active: employee.is_active !== false
    });
    setIsModalOpen(true);
  };

  const openViewModal = (employee) => {
    setViewingEmployee(employee);
    setIsViewModalOpen(true);
  };

  // ==================== SUBMIT (UPDATE / CREATE) ====================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      if (editingEmployee) {
        // UPDATE EMPLOYEE
        const original = editingEmployee._raw || {};
        const originalAccount = original.accountEntity || {};

        const { authorities, ...accountWithoutAuthorities } = originalAccount;

        const payload = {
          ...original,
          employeeName: formData.ho_ten,
          employeeCode: original.employeeCode,
          birthDate: original.birthDate,
          gender: original.gender,
          accountEntity: {
            ...accountWithoutAuthorities,
            phoneNumber: formData.phone,
            email: formData.email,
            status: formData.is_active
          }
        };

        console.log("PUT /employees/" + editingEmployee.id, payload);

        const res = await axiosClient.put(
          `/employees/${editingEmployee.id}`,
          payload
        );
        console.log("Update employee success:", res.data);

        showNotify(
          "success",
          "Cập nhật thành công",
          "Thông tin nhân viên đã được cập nhật."
        );
      } else {
        // chưa hỗ trợ create
        showNotify(
          "error",
          "Chưa hỗ trợ tạo mới",
          "Tính năng thêm nhân viên sẽ được cập nhật trong phiên bản sau."
        );
      }

      setIsModalOpen(false);
      setEditingEmployee(null);
      await fetchEmployees();
    } catch (err) {
      console.error("Error submitting employee:", err);
      if (err.response) {
        console.error("Backend error:", err.response.status, err.response.data);
        showNotify(
          "error",
          "Lỗi cập nhật",
          err.response.data?.message ||
            `Lỗi ${err.response.status}: yêu cầu không hợp lệ (Bad Request).`
        );
      } else {
        showNotify(
          "error",
          "Lỗi hệ thống",
          "Có lỗi xảy ra khi lưu nhân viên. Vui lòng thử lại."
        );
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (employee) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa nhân viên "${employee.ho_ten}"?`
      )
    ) {
      return;
    }

    try {
      // TODO: khi có API delete thì gọi thật
      setEmployees((prev) => prev.filter((emp) => emp.id !== employee.id));
      showNotify(
        "success",
        "Xóa nhân viên",
        "Nhân viên đã được xóa khỏi danh sách (tạm thời chỉ xóa trên giao diện)."
      );
      await fetchEmployees();
    } catch (error) {
      console.error("Error deleting employee:", error);
      showNotify(
        "error",
        "Lỗi xóa nhân viên",
        "Có lỗi xảy ra khi xóa nhân viên."
      );
    }
  };

  // ==================== HELPERS ====================
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getDepartmentIcon = (department) => {
    switch (department) {
      case t("admin.employees.departments.management"):
        return FaCrown;
      case t("admin.employees.departments.sales"):
        return FaChartLine;
      case t("admin.employees.departments.warehouse"):
        return FaBuilding;
      case t("admin.employees.departments.support"):
        return FaUsers;
      case t("admin.employees.departments.accounting"):
        return FaDollarSign;
      case t("admin.employees.departments.marketing"):
        return FaStar;
      case t("admin.employees.departments.delivery"):
        return FaTrophy;
      case t("admin.employees.departments.it"):
        return FaTools;
      default:
        return FaBriefcase;
    }
  };

  const getDepartmentColor = (department) => {
    switch (department) {
      case t("admin.employees.departments.management"):
        return "bg-purple-100 text-purple-800";
      case t("admin.employees.departments.sales"):
        return "bg-green-100 text-green-800";
      case t("admin.employees.departments.warehouse"):
        return "bg-blue-100 text-blue-800";
      case t("admin.employees.departments.support"):
        return "bg-yellow-100 text-yellow-800";
      case t("admin.employees.departments.accounting"):
        return "bg-red-100 text-red-800";
      case t("admin.employees.departments.marketing"):
        return "bg-pink-100 text-pink-800";
      case t("admin.employees.departments.delivery"):
        return "bg-indigo-100 text-indigo-800";
      case t("admin.employees.departments.it"):
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // ==================== LOADING / ERROR ====================
  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">Đang tải dữ liệu nhân viên...</p>
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
              onClick={fetchEmployees}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const StatCard = ({ title, value, icon: Icon, color, change }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color} mr-4`}>
          <Icon className="text-xl text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value.toLocaleString()}
          </p>
          {change && (
            <p
              className={`text-xs ${
                change >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {change >= 0 ? "+" : ""}
              {change}% so với tháng trước
            </p>
          )}
        </div>
      </div>
    </div>
  );

  // ==================== UI ====================
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quản lý nhân viên
            </h1>
            <p className="text-gray-600">
              Quản lý thông tin và hoạt động của nhân viên
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaPlus />
            <span>Thêm nhân viên</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Tổng nhân viên"
            value={employeeStats.total}
            icon={FaUsers}
            color="bg-blue-500"
            change={3}
          />
          <StatCard
            title="Đang làm việc"
            value={employeeStats.active}
            icon={FaUserTie}
            color="bg-green-500"
            change={5}
          />
          <StatCard
            title="Nghỉ việc"
            value={employeeStats.inactive}
            icon={FaUserCircle}
            color="bg-red-500"
            change={-2}
          />
          <StatCard
            title="Quản lý"
            value={employeeStats.managers}
            icon={FaCrown}
            color="bg-purple-500"
            change={0}
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Tìm kiếm theo tên, email, mã NV..."
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="active">Đang làm việc</option>
                <option value="inactive">Nghỉ việc</option>
              </select>
            </div>
            <div>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả phòng ban</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Employees Table */}
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
                      <span>Nhân viên</span>
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
                    Phòng ban / Chức vụ
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("hire_date")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Ngày vào làm</span>
                      {sortConfig?.key === "hire_date" && (
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
                {paginatedEmployees.map((employee) => {
                  const DepartmentIcon = getDepartmentIcon(employee.department);
                  const departmentColor = getDepartmentColor(
                    employee.department
                  );

                  return (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {employee.ho_ten?.charAt(0)?.toUpperCase() ||
                                  "N"}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.ho_ten || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {employee.employee_id && (
                                <span className="inline-flex items-center">
                                  <FaIdBadge className="mr-1" />
                                  {employee.employee_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-900">
                            <FaEnvelope className="mr-2 text-gray-400" />
                            {employee.email || "N/A"}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <FaPhone className="mr-2 text-gray-400" />
                            {employee.phone || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${departmentColor}`}
                          >
                            <DepartmentIcon className="mr-1 text-xs" />
                            {employee.department}
                          </span>
                          <div className="text-sm text-gray-600">
                            {employee.position || "N/A"}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <FaCalendarAlt className="mr-2 text-gray-400" />
                          {formatDate(employee.hire_date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            employee.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {employee.is_active ? "Đang làm việc" : "Nghỉ việc"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openViewModal(employee)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => openEditModal(employee)}
                            className="text-yellow-600 hover:text-yellow-900 p-1 rounded hover:bg-yellow-50"
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(employee)}
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

          {paginatedEmployees.length === 0 && (
            <div className="text-center py-12">
              <FaUsers className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Không có nhân viên
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterStatus || filterDepartment
                  ? "Không tìm thấy nhân viên phù hợp với bộ lọc."
                  : "Chưa có nhân viên nào trong hệ thống."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                placeholder="Nhập họ tên nhân viên"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã nhân viên *
              </label>
              <input
                type="text"
                required
                value={formData.employee_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    employee_id: e.target.value
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nhập mã nhân viên (VD: NV_ADMIN)"
                disabled={!!editingEmployee}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phòng ban *
              </label>
              <select
                required
                value={formData.department}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    department: e.target.value
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Chọn phòng ban</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chức vụ *
              </label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, position: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nhập chức vụ"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <option value={true}>Đang làm việc</option>
                <option value={false}>Nghỉ việc</option>
              </select>
            </div>
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
              <span>{editingEmployee ? "Cập nhật" : "Tạo mới"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* View Employee Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Chi tiết nhân viên"
        size="lg"
      >
        {viewingEmployee && (
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 h-16 w-16">
                <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {viewingEmployee.ho_ten?.charAt(0)?.toUpperCase() || "N"}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {viewingEmployee.ho_ten}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(
                      viewingEmployee.department
                    )}`}
                  >
                    {React.createElement(
                      getDepartmentIcon(viewingEmployee.department),
                      { className: "mr-1 text-xs" }
                    )}
                    {viewingEmployee.department}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Mã nhân viên</p>
                    <p className="text-sm font-medium">
                      {viewingEmployee.employee_id || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Chức vụ</p>
                    <p className="text-sm font-medium">
                      {viewingEmployee.position || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-sm font-medium">
                      {viewingEmployee.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Số điện thoại</p>
                    <p className="text-sm font-medium">
                      {viewingEmployee.phone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Địa chỉ</p>
                    <p className="text-sm font-medium">
                      {viewingEmployee.dia_chi || "Chưa cập nhật"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ngày vào làm</p>
                    <p className="text-sm font-medium">
                      {formatDate(viewingEmployee.hire_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Trạng thái</p>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingEmployee.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {viewingEmployee.is_active
                        ? "Đang làm việc"
                        : "Nghỉ việc"}
                    </span>
                  </div>
                </div>
              </div>
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

export default EmployeesPage;
