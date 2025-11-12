import React, { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaPercent, FaTags } from "react-icons/fa";
import AdminLayout from "~/components/Admin/AdminLayout";
import Modal from "~/components/Admin/Modal";
import Table from "~/components/Admin/Table";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import promotionTypeService from "~/apis/promotionTypeService";
import { toast, ToastContainer } from "react-toastify";

const MAX_NAME_LEN = 100;
const MAX_DESC_LEN = 500;

const PromotionTypesPage = () => {
  const [promotionTypes, setPromotionTypes] = useState([]);
  const [filteredPromotionTypes, setFilteredPromotionTypes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPromotionType, setCurrentPromotionType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  // Promotion type categories
  const promotionTypeCategories = [
    "PERCENTAGE",
    "FIXED_AMOUNT",
    "BUY_ONE_GET_ONE",
    "FREE_SHIPPING",
    "BUNDLE_DISCOUNT",
    "QUANTITY_DISCOUNT",
    "SEASONAL_DISCOUNT",
    "MEMBERSHIP_DISCOUNT",
    "FIRST_TIME_BUYER",
    "REFERRAL_BONUS"
  ];

  const [formData, setFormData] = useState({
    promotionTypeCode: "",
    promotionTypeName: "",
    description: ""
  });

  // Load promotion types from API
  const loadPromotionTypes = async () => {
    try {
      setLoading(true);
      const response = await promotionTypeService.getAllPromotionTypes();

      const data = response?.data?.data || [];
      // Normalize API response fields to the shape used by the UI
      console.log(data);
      const normalized = data.map((item) => ({
        // keep original fields
        ...item,
        // map API names to both API and legacy UI keys
        promotionTypeCode: item.promotionTypeCode || item.typeCode || item.code,
        promotionTypeName: item.promotionTypeName || item.typeName || item.name,
        // also keep legacy keys used elsewhere
        typeCode: item.promotionTypeCode || item.typeCode || item.code,
        typeName: item.promotionTypeName || item.typeName || item.name,
        // keep description
        description: item.description || item.desc || "",
        // optional fields with sensible defaults
        discountType: item.discountType || "PERCENTAGE",
        isActive: item.isActive !== undefined ? item.isActive : true
      }));
      setPromotionTypes(normalized);
      setFilteredPromotionTypes(normalized);
    } catch (error) {
      console.error("Error loading promotion types:", error);
      toast.error("Lỗi khi tải danh sách loại khuyến mãi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotionTypes();
  }, []);

  // Search functionality
  useEffect(() => {
    const filtered = promotionTypes.filter(
      (type) =>
        (type.promotionTypeName || type.typeName || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (type.promotionTypeCode || type.typeCode || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (type.description || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    );
    setFilteredPromotionTypes(filtered);
    setCurrentPage(1);
  }, [searchTerm, promotionTypes]);

  // Form validation
  const validateForm = () => {
    if (!formData.promotionTypeName.trim()) {
      toast.error("Tên loại khuyến mãi không được để trống");
      return false;
    }
    if (formData.promotionTypeName.length > MAX_NAME_LEN) {
      toast.error(
        `Tên loại khuyến mãi không được vượt quá ${MAX_NAME_LEN} ký tự`
      );
      return false;
    }
    if (formData.description && formData.description.length > MAX_DESC_LEN) {
      toast.error(`Mô tả không được vượt quá ${MAX_DESC_LEN} ký tự`);
      return false;
    }
    return true;
  };

  // Open modal for creating new promotion type
  const openCreateModal = () => {
    const timestamp = Date.now();
    setCurrentPromotionType(null);
    setFormData({
      promotionTypeCode: `PT_${timestamp}`,
      promotionTypeName: "",
      description: ""
    });
    setIsModalOpen(true);
  };

  // Open modal for editing promotion type
  const openEditModal = (promotionType) => {
    setCurrentPromotionType(promotionType);
    setFormData({
      // promotionType is expected to be normalized, but we support API names as fallback
      promotionTypeCode:
        promotionType.promotionTypeCode ||
        promotionType.typeCode ||
        promotionType.code ||
        "",
      promotionTypeName:
        promotionType.promotionTypeName ||
        promotionType.typeName ||
        promotionType.name ||
        "",
      description: promotionType.description || promotionType.desc || ""
    });
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      // Build payload matching backend field names
      const payload = {
        promotionTypeCode: formData.promotionTypeCode,
        promotionTypeName: formData.promotionTypeName,
        description: formData.description
      };

      if (currentPromotionType) {
        // Update existing promotion type (use code from several possible fields)
        const code =
          currentPromotionType.promotionTypeCode ||
          currentPromotionType.typeCode ||
          currentPromotionType.code;
        await promotionTypeService.updatePromotionType(code, payload);
        toast.success("Cập nhật loại khuyến mãi thành công!");
      } else {
        // Create new promotion type
        await promotionTypeService.createPromotionType(payload);
        toast.success("Tạo loại khuyến mãi thành công!");
      }

      setIsModalOpen(false);
      loadPromotionTypes();
    } catch (error) {
      console.error("Error saving promotion type:", error);
      toast.error(
        currentPromotionType
          ? "Lỗi khi cập nhật loại khuyến mãi"
          : "Lỗi khi tạo loại khuyến mãi"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Ask for confirmation before deleting a promotion type (opens modal)
  const handleDelete = (promotionType) => {
    setConfirmTarget(promotionType);
    setIsConfirmOpen(true);
  };

  // Perform deletion after user confirms in modal
  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;

    try {
      const code =
        confirmTarget.promotionTypeCode ||
        confirmTarget.typeCode ||
        confirmTarget.code;
      await promotionTypeService.deletePromotionType(code);
      toast.success("Xóa loại khuyến mãi thành công!");
      loadPromotionTypes();
    } catch (error) {
      console.error("Error deleting promotion type:", error);
      toast.error("Lỗi khi xóa loại khuyến mãi");
    } finally {
      setIsConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredPromotionTypes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredPromotionTypes.slice(startIndex, endIndex);

  // Table columns
  const columns = [
    {
      key: "typeCode",
      label: "Mã loại",
      render: (item) => (
        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
          {item.promotionTypeCode || item.typeCode || item.code}
        </span>
      )
    },
    {
      key: "typeName",
      label: "Tên loại khuyến mãi",
      render: (item) => (
        <div className="font-medium text-gray-900">
          {item.promotionTypeName || item.typeName || item.name}
        </div>
      )
    },
    {
      key: "discountType",
      label: "Loại giảm giá",
      render: (item) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.discountType === "PERCENTAGE"
              ? "bg-blue-100 text-blue-800"
              : item.discountType === "FIXED_AMOUNT"
              ? "bg-green-100 text-green-800"
              : "bg-purple-100 text-purple-800"
          }`}
        >
          {item.discountType === "PERCENTAGE" && "Phần trăm"}
          {item.discountType === "FIXED_AMOUNT" && "Số tiền cố định"}
          {item.discountType === "BUY_ONE_GET_ONE" && "Mua 1 tặng 1"}
          {item.discountType === "FREE_SHIPPING" && "Miễn phí vận chuyển"}
          {item.discountType === "BUNDLE_DISCOUNT" && "Giảm giá combo"}
          {item.discountType === "QUANTITY_DISCOUNT" && "Giảm giá số lượng"}
          {item.discountType === "SEASONAL_DISCOUNT" && "Giảm giá theo mùa"}
          {item.discountType === "MEMBERSHIP_DISCOUNT" && "Giảm giá thành viên"}
          {item.discountType === "FIRST_TIME_BUYER" && "Khách hàng mới"}
          {item.discountType === "REFERRAL_BONUS" && "Giới thiệu bạn bè"}
        </span>
      )
    },
    {
      key: "description",
      label: "Mô tả",
      render: (item) => (
        <span className="text-sm text-gray-600">
          {item.description
            ? item.description.length > 50
              ? `${item.description.substring(0, 50)}...`
              : item.description
            : "Không có mô tả"}
        </span>
      )
    },
    {
      key: "isActive",
      label: "Trạng thái",
      render: (item) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            item.isActive
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {item.isActive ? "Hoạt động" : "Không hoạt động"}
        </span>
      )
    },
    {
      key: "actions",
      label: "Thao tác",
      render: (item) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openEditModal(item)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Chỉnh sửa"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => handleDelete(item)}
            className="text-red-600 hover:text-red-800 transition-colors"
            title="Xóa"
          >
            <FaTrash />
          </button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FaTags className="text-2xl text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Quản lý loại khuyến mãi
              </h1>
              <p className="text-gray-600 mt-1">
                Quản lý các loại khuyến mãi trong hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FaPlus />
            <span>Tạo loại khuyến mãi</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <SearchBar
            placeholder="Tìm kiếm loại khuyến mãi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tổng loại</p>
                <p className="text-2xl font-bold text-gray-900">
                  {promotionTypes.length}
                </p>
              </div>
              <FaTags className="text-blue-500 text-xl" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Đang hoạt động</p>
                <p className="text-2xl font-bold text-green-600">
                  {promotionTypes.filter((type) => type.isActive).length}
                </p>
              </div>
              <FaPercent className="text-green-500 text-xl" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Kết quả tìm</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredPromotionTypes.length}
                </p>
              </div>
              <FaTags className="text-blue-500 text-xl" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Đang tải...</p>
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={currentItems}
                emptyMessage="Không tìm thấy loại khuyến mãi nào"
              />
              {totalPages > 1 && (
                <div className="p-4 border-t">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={
            currentPromotionType
              ? "Chỉnh sửa loại khuyến mãi"
              : "Tạo loại khuyến mãi mới"
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã loại khuyến mãi *
              </label>
              <input
                type="text"
                name="promotionTypeCode"
                value={formData.promotionTypeCode}
                onChange={handleInputChange}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                placeholder="Mã tự động"
              />
            </div>

            {/* Type Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên loại khuyến mãi *
              </label>
              <input
                type="text"
                name="promotionTypeName"
                value={formData.promotionTypeName}
                onChange={handleInputChange}
                maxLength={MAX_NAME_LEN}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập tên loại khuyến mãi"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.promotionTypeName.length}/{MAX_NAME_LEN} ký tự
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô tả
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                maxLength={MAX_DESC_LEN}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nhập mô tả cho loại khuyến mãi"
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/{MAX_DESC_LEN} ký tự
              </div>
            </div>

            {/* (No discount type / isActive fields in modal — only name & description required) */}

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                disabled={submitting}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {submitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>
                  {submitting
                    ? "Đang lưu..."
                    : currentPromotionType
                    ? "Cập nhật"
                    : "Tạo mới"}
                </span>
              </button>
            </div>
          </form>
        </Modal>

        {/* Confirmation Modal for delete */}
        <Modal
          isOpen={isConfirmOpen}
          onClose={() => {
            setIsConfirmOpen(false);
            setConfirmTarget(null);
          }}
          title="Xác nhận xóa"
          size="sm"
        >
          <div className="space-y-4">
            <p>
              Bạn có chắc chắn muốn xóa loại khuyến mãi "
              {confirmTarget?.promotionTypeName ||
                confirmTarget?.typeName ||
                ""}
              "?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsConfirmOpen(false);
                  setConfirmTarget(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </Modal>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </AdminLayout>
  );
};

export default PromotionTypesPage;
