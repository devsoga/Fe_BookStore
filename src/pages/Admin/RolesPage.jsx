import React, { useState } from "react";
import AdminLayout from "~/components/Admin/AdminLayout";
import Table from "~/components/Admin/Table";
import Modal from "~/components/Admin/Modal";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import { FaPlus, FaShieldAlt } from "react-icons/fa";

const RolesPage = () => {
  const [roles, setRoles] = useState([
    {
      id: 1,
      name: "Admin",
      description: "Full system access",
      permissions: "All",
      status: "Active",
      createdAt: "2024-01-01"
    },
    {
      id: 2,
      name: "Manager",
      description: "Manage products and orders",
      permissions: "Limited",
      status: "Active",
      createdAt: "2024-01-02"
    },
    {
      id: 3,
      name: "Staff",
      description: "Basic operations",
      permissions: "Basic",
      status: "Active",
      createdAt: "2024-01-03"
    },
    {
      id: 4,
      name: "Customer",
      description: "Customer access",
      permissions: "Read-only",
      status: "Active",
      createdAt: "2024-01-04"
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: "",
    status: "Active"
  });

  const itemsPerPage = 10;
  const { t } = useLanguage();

  // Filter and sort data
  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedRoles = [...filteredRoles].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

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
    setSortConfig((prevConfig) => ({
      key,
      direction:
        prevConfig?.key === key && prevConfig.direction === "asc"
          ? "desc"
          : "asc"
    }));
  };

  const openCreateModal = () => {
    setEditingRole(null);
    setFormData({
      name: "",
      description: "",
      permissions: "",
      status: "Active"
    });
    setIsModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setFormData({ ...role });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (editingRole) {
      // Edit existing role
      setRoles((prev) =>
        prev.map((role) =>
          role.id === editingRole.id
            ? { ...formData, id: editingRole.id }
            : role
        )
      );
    } else {
      // Create new role
      const newRole = {
        ...formData,
        id: Math.max(...roles.map((r) => r.id), 0) + 1,
        createdAt: new Date().toISOString().split("T")[0]
      };
      setRoles((prev) => [...prev, newRole]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (role) => {
    if (
      window.confirm(`Are you sure you want to delete role "${role.name}"?`)
    ) {
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
    }
  };

  const columns = [
    {
      key: "name",
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
    },
    { key: "createdAt", title: "Created At", sortable: true }
  ];

  const actions = {
    edit: openEditModal,
    delete: handleDelete
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Roles Management
            </h1>
            <p className="text-gray-600">Manage user roles and permissions</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaPlus />
            <span>Add Role</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search roles..."
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
        title={editingRole ? "Edit Role" : "Create New Role"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter role name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
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
              placeholder="Enter role description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Permissions Level *
            </label>
            <select
              required
              value={formData.permissions}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  permissions: e.target.value
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select permission level</option>
              <option value="All">All Permissions</option>
              <option value="Limited">Limited Permissions</option>
              <option value="Basic">Basic Permissions</option>
              <option value="Read-only">Read-only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
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
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              {editingRole ? "Update Role" : "Create Role"}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};

export default RolesPage;
