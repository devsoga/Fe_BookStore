import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaTags,
  FaSpinner,
  FaExclamationTriangle
} from "react-icons/fa";
import Modal from "~/components/Admin/Modal";
import AdminLayout from "~/components/Admin/AdminLayout";
import SearchBar from "~/components/Admin/SearchBar";
import { useLanguage } from "~/i18n/AdminLanguageProvider";
import Pagination from "~/components/Admin/Pagination";
import customerTypeService from "~/apis/customerTypeService";

const CustomerTypePage = () => {
  const [customerTypes, setCustomerTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomerType, setSelectedCustomerType] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    customerTypeCode: "",
    customerTypeName: "",
    promotionCode: "",
    description: ""
  });

  // Fetch customer types
  const fetchCustomerTypes = async () => {
    try {
      setLoading(true);
      const response = await customerTypeService.getAll();
      if (response.data && response.data.data) {
        setCustomerTypes(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching customer types:", err);
      setError(t("admin.customers.messages.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerTypes();
  }, []);

  // Handle create
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await customerTypeService.create(formData);
      setShowCreateModal(false);
      resetForm();
      fetchCustomerTypes();
      alert(t("admin.customers.messages.createSuccess"));
    } catch (err) {
      console.error("Error creating customer type:", err);
      alert(t("admin.customers.messages.createError"));
    } finally {
      setLoading(false);
    }
  };

  // Handle update
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await customerTypeService.update(
        selectedCustomerType.customerTypeCode,
        formData
      );
      setShowEditModal(false);
      resetForm();
      fetchCustomerTypes();
      alert("Cập nhật loại khách hàng thành công!");
    } catch (err) {
      console.error("Error updating customer type:", err);
      alert("Có lỗi xảy ra khi cập nhật loại khách hàng");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    try {
      setLoading(true);
      await customerTypeService.delete(selectedCustomerType.customerTypeCode);
      setShowDeleteModal(false);
      setSelectedCustomerType(null);
      fetchCustomerTypes();
      alert("Xóa loại khách hàng thành công!");
    } catch (err) {
      console.error("Error deleting customer type:", err);
      alert("Có lỗi xảy ra khi xóa loại khách hàng");
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      customerTypeCode: "",
      customerTypeName: "",
      promotionCode: "",
      description: ""
    });
    setSelectedCustomerType(null);
  };

  // Open modals
  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (customerType) => {
    setSelectedCustomerType(customerType);
    setFormData({
      customerTypeCode: customerType.customerTypeCode,
      customerTypeName: customerType.customerTypeName,
      promotionCode: customerType.promotionCode || "",
      description: customerType.description || ""
    });
    setShowEditModal(true);
  };

  const openViewModal = (customerType) => {
    setSelectedCustomerType(customerType);
    setShowViewModal(true);
  };

  const openDeleteModal = (customerType) => {
    setSelectedCustomerType(customerType);
    setShowDeleteModal(true);
  };

  // Filter customer types
  const filteredCustomerTypes = customerTypes.filter(
    (type) =>
      type.customerTypeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.customerTypeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (type.description &&
        type.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomerTypes.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(filteredCustomerTypes.length / itemsPerPage);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading && customerTypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-4xl text-blue-500" />
        <span className="ml-2 text-lg">{t("admin.common.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaExclamationTriangle className="text-4xl text-red-500" />
        <span className="ml-2 text-lg text-red-500">{error}</span>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <FaTags className="mr-2 text-blue-500" />
              {t("admin.customerTypes.title")}
            </h1>
            <p className="text-gray-600 mt-1">
              {t("admin.customerTypes.subtitle")}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
          >
            <FaPlus className="mr-2" />
            Thêm loại khách hàng
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t("admin.customerTypes.searchPlaceholder")}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center">
              <FaTags className="text-2xl text-blue-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">
                  {t("admin.customerTypes.stats.total")}
                </p>
                <p className="text-xl font-semibold text-gray-800">
                  {customerTypes.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center">
              <FaTags className="text-2xl text-green-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Có mã khuyến mãi</p>
                <p className="text-xl font-semibold text-gray-800">
                  {customerTypes.filter((type) => type.promotionCode).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center">
              <FaTags className="text-2xl text-purple-500" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Kết quả tìm kiếm</p>
                <p className="text-xl font-semibold text-gray-800">
                  {filteredCustomerTypes.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã loại
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên loại khách hàng
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mã khuyến mãi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mô tả
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      <FaExclamationTriangle className="mx-auto text-4xl mb-2" />
                      <p>Không tìm thấy loại khách hàng nào</p>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((type) => (
                    <tr key={type.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {type.customerTypeCode}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {type.customerTypeName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {type.promotionCode ? (
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            {type.promotionCode}
                          </span>
                        ) : (
                          <span className="text-gray-400">Không có</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {type.description || "Không có mô tả"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openViewModal(type)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-100"
                            title="Xem chi tiết"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => openEditModal(type)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-100"
                            title="Chỉnh sửa"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => openDeleteModal(type)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-100"
                            title="Xóa"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={filteredCustomerTypes.length}
              />
            </div>
          )}
        </div>

        {/* Create Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Thêm loại khách hàng mới"
          size="lg"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mã loại khách hàng *
                </label>
                <input
                  type="text"
                  name="customerTypeCode"
                  value={formData.customerTypeCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: CUS_SILVER"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên loại khách hàng *
                </label>
                <input
                  type="text"
                  name="customerTypeName"
                  value={formData.customerTypeName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Khách hàng Bạc"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã khuyến mãi
              </label>
              <input
                type="text"
                name="promotionCode"
                value={formData.promotionCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: VIP5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả về loại khách hàng này..."
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading && <FaSpinner className="animate-spin mr-2" />}
                Tạo mới
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Chỉnh sửa loại khách hàng"
          size="lg"
        >
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mã loại khách hàng *
                </label>
                <input
                  type="text"
                  name="customerTypeCode"
                  value={formData.customerTypeCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên loại khách hàng *
                </label>
                <input
                  type="text"
                  name="customerTypeName"
                  value={formData.customerTypeName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mã khuyến mãi
              </label>
              <input
                type="text"
                name="promotionCode"
                value={formData.promotionCode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {loading && <FaSpinner className="animate-spin mr-2" />}
                Cập nhật
              </button>
            </div>
          </form>
        </Modal>

        {/* View Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title="Chi tiết loại khách hàng"
          size="md"
        >
          {selectedCustomerType && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mã loại khách hàng
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    {selectedCustomerType.customerTypeCode}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên loại khách hàng
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    {selectedCustomerType.customerTypeName}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mã khuyến mãi
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                  {selectedCustomerType.promotionCode || "Không có"}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md min-h-[80px]">
                  {selectedCustomerType.description || "Không có mô tả"}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Xác nhận xóa"
          size="sm"
        >
          {selectedCustomerType && (
            <div className="space-y-4">
              <div className="flex items-center text-red-600">
                <FaExclamationTriangle className="text-2xl mr-3" />
                <div>
                  <p className="font-medium">
                    Bạn có chắc chắn muốn xóa loại khách hàng này?
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    <strong>{selectedCustomerType.customerTypeName}</strong> -{" "}
                    {selectedCustomerType.customerTypeCode}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Hành động này không thể hoàn tác!
              </p>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {loading && <FaSpinner className="animate-spin mr-2" />}
                  Xóa
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default CustomerTypePage;
