import React, { useState } from "react";
import AdminLayout from "~/components/Admin/AdminLayout";
import Table from "~/components/Admin/Table";
import Modal from "~/components/Admin/Modal";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import { FaPlus, FaUser, FaToggleOn, FaToggleOff } from "react-icons/fa";

const AccountsPage = () => {
  const [accounts, setAccounts] = useState([
    {
      id: 1,
      username: "admin",
      email: "admin@bookstore.com",
      role: "Admin",
      status: "Active",
      lastLogin: "2024-01-15 10:30:00",
      createdAt: "2024-01-01"
    },
    {
      id: 2,
      username: "manager01",
      email: "manager@bookstore.com",
      role: "Manager",
      status: "Active",
      lastLogin: "2024-01-14 14:20:00",
      createdAt: "2024-01-02"
    },
    {
      id: 3,
      username: "staff01",
      email: "staff@bookstore.com",
      role: "Staff",
      status: "Inactive",
      lastLogin: "2024-01-10 09:15:00",
      createdAt: "2024-01-03"
    },
    {
      id: 4,
      username: "customer01",
      email: "customer@gmail.com",
      role: "Customer",
      status: "Active",
      lastLogin: "2024-01-15 16:45:00",
      createdAt: "2024-01-04"
    }
  ]);

  const [roles] = useState([
    { id: 1, name: "Admin" },
    { id: 2, name: "Manager" },
    { id: 3, name: "Staff" },
    { id: 4, name: "Customer" }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    status: "Active"
  });

  const itemsPerPage = 10;
  const { t } = useLanguage();

  // Filter and sort data
  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || account.role === filterRole;
    const matchesStatus = !filterStatus || account.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

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
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    if (editingAccount) {
      // Edit existing account
      setAccounts((prev) =>
        prev.map((account) =>
          account.id === editingAccount.id
            ? {
                ...account,
                username: formData.username,
                email: formData.email,
                role: formData.role,
                status: formData.status
              }
            : account
        )
      );
    } else {
      // Create new account
      const newAccount = {
        id: Math.max(...accounts.map((a) => a.id), 0) + 1,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        lastLogin: "Never",
        createdAt: new Date().toISOString().split("T")[0]
      };
      setAccounts((prev) => [...prev, newAccount]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (account) => {
    if (
      window.confirm(
        `Are you sure you want to delete account "${account.username}"?`
      )
    ) {
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    }
  };

  const toggleAccountStatus = (account) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === account.id
          ? { ...a, status: a.status === "Active" ? "Inactive" : "Active" }
          : a
      )
    );
  };

  const columns = [
    {
      key: "username",
      title: "Username",
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <FaUser className="text-blue-500 mr-2" />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    { key: "email", title: "Email", sortable: true },
    {
      key: "role",
      title: "Role",
      render: (value) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            value === "Admin"
              ? "bg-red-100 text-red-800"
              : value === "Manager"
              ? "bg-yellow-100 text-yellow-800"
              : value === "Staff"
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
      render: (value, row) => (
        <button
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
      )
    },
    { key: "lastLogin", title: "Last Login", sortable: true },
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
              Accounts Management
            </h1>
            <p className="text-gray-600">
              Manage user accounts and assign roles
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaPlus />
            <span>Add Account</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search accounts..."
              />
            </div>
            <div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.name}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
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
        title={editingAccount ? "Edit Account" : "Create New Account"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Enter username"
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
              placeholder="Enter email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {!editingAccount && "*"}
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
                  ? "Leave blank to keep current password"
                  : "Enter password"
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password {!editingAccount && "*"}
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
              placeholder="Confirm password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, role: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
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
              {editingAccount ? "Update Account" : "Create Account"}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};

export default AccountsPage;
