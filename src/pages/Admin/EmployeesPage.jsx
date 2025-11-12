import React, { useState, useEffect } from "react";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import { useLanguage } from "~/i18n/AdminLanguageProvider";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import mockEmployees from "~/mocks/employees.json";
import { useStransferToVND } from "~/hooks/useStransferToVND";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaUsers,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUserCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaSave,
  FaTimes,
  FaSearch,
  FaIdBadge,
  FaDollarSign,
  FaStar,
  FaUser,
  FaTrophy,
  FaGift,
  FaShieldAlt,
  FaBriefcase,
  FaBuilding,
  FaCrown,
  FaUserTie,
  FaTools,
  FaChartLine
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

  const itemsPerPage = 10;
  const { formatVND } = useStransferToVND();
  const { t } = useLanguage();

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

  // Fetch employees data
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use mock data for local testing
      const employeeData = Array.isArray(mockEmployees) ? mockEmployees : [];
      setEmployees(employeeData);

      // Calculate statistics
      const stats = {
        total: employeeData.length,
        active: employeeData.filter((e) => e.is_active).length,
        inactive: employeeData.filter((e) => !e.is_active).length,
        managers: employeeData.filter(
          (e) => e.role === "manager" || e.department === "Quản lý"
        ).length
      };
      setEmployeeStats(stats);
    } catch (error) {
      console.error("Error fetching employees:", error);
      setError("Không thể tải dữ liệu nhân viên. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Filter and sort data
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

    // Handle date sorting
    if (sortConfig.key === "hire_date" || sortConfig.key === "created_at") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    // Handle salary sorting
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      if (editingEmployee) {
        // Update employee in mock data
        setEmployees((prev) =>
          prev.map((emp) =>
            emp.id === editingEmployee.id
              ? { ...emp, ...formData, salary: Number(formData.salary) }
              : emp
          )
        );
        alert("Cập nhật nhân viên thành công!");
      } else {
        // Create new employee in mock data
        const newEmployee = {
          id: Math.max(...employees.map((e) => e.id), 0) + 1,
          ...formData,
          salary: Number(formData.salary),
          role: formData.department === "Quản lý" ? "manager" : "employee",
          hire_date: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        setEmployees((prev) => [...prev, newEmployee]);
        alert("Thêm nhân viên thành công!");
      }

      setIsModalOpen(false);
      await fetchEmployees(); // Refresh stats
    } catch (error) {
      console.error("Error submitting employee:", error);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (employee) => {
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa nhân viên "${employee.ho_ten}"?`
      )
    ) {
      try {
        setEmployees((prev) => prev.filter((emp) => emp.id !== employee.id));
        alert("Xóa nhân viên thành công!");
        await fetchEmployees(); // Refresh stats
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert("Có lỗi xảy ra khi xóa nhân viên.");
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getDepartmentIcon = (department) => {
    switch (department) {
      case "Quản lý":
        return FaCrown;
      case "Bán hàng":
        return FaChartLine;
      case "Kho":
        return FaBuilding;
      case "Hỗ trợ":
        return FaUsers;
      case "Kế toán":
        return FaDollarSign;
      case "Marketing":
        return FaStar;
      case "Giao hàng":
        return FaTrophy;
      case "IT":
        return FaTools;
      default:
        return FaBriefcase;
    }
  };

  const getDepartmentColor = (department) => {
    switch (department) {
      case "Quản lý":
        return "bg-purple-100 text-purple-800";
      case "Bán hàng":
        return "bg-green-100 text-green-800";
      case "Kho":
        return "bg-blue-100 text-blue-800";
      case "Hỗ trợ":
        return "bg-yellow-100 text-yellow-800";
      case "Kế toán":
        return "bg-red-100 text-red-800";
      case "Marketing":
        return "bg-pink-100 text-pink-800";
      case "Giao hàng":
        return "bg-indigo-100 text-indigo-800";
      case "IT":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

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
                    onClick={() => handleSort("salary")}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Lương</span>
                      {sortConfig?.key === "salary" && (
                        <span className="text-blue-500">
                          {sortConfig.direction === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatVND(employee.salary)}
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

      {/* Create/Edit Modal */}
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
                placeholder="Nhập mã nhân viên (VD: EMP001)"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ
            </label>
            <textarea
              value={formData.dia_chi}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dia_chi: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập địa chỉ"
            />
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
                Mức lương (VND) *
              </label>
              <input
                type="number"
                required
                value={formData.salary}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, salary: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nhập mức lương"
                min="0"
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
            {/* Employee Info */}
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
                    <p className="text-sm text-gray-500">Mức lương</p>
                    <p className="text-sm font-medium text-green-600">
                      {formatVND(viewingEmployee.salary)}
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
    </AdminLayout>
  );
};

export default EmployeesPage;
