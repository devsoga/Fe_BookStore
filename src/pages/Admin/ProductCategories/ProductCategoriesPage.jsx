import React, { useState, useEffect } from "react";
import AdminLayout from "~/components/Admin/AdminLayout";
import Table from "~/components/Admin/Table";
import Modal from "~/components/Admin/Modal";
import SearchBar from "~/components/Admin/SearchBar";
import Pagination from "~/components/Admin/Pagination";
import { FaPlus, FaLayerGroup, FaSpinner } from "react-icons/fa";
import { categoryService } from "~/apis/categoryService";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ProductCategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const [formData, setFormData] = useState({
    categoryCode: "",
    categoryName: "",
    categoryType: "book",
    description: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const itemsPerPage = 10;
  const MAX_NAME_LEN = 100;

  // Load categories from API
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAllCategory();
      const categoriesData = response?.data?.data || [];
      setCategories(categoriesData);
    } catch (error) {
      console.error("Failed to load categories:", error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const validateForm = () => {
    const name = (formData.categoryName || "").trim();
    if (!name)
      return { ok: false, message: "Tên danh mục không được để trống." };
    if (name.length > MAX_NAME_LEN)
      return {
        ok: false,
        message: `Tên danh mục không được vượt quá ${MAX_NAME_LEN} ký tự.`
      };
    return { ok: true };
  };

  // Category type options
  const categoryTypes = [
    { value: "book", label: "Book" },
    { value: "modelKit", label: "Model Kit" },
    { value: "figure", label: "Figure" },
    { value: "calculator", label: "Calculator" },
    { value: "note", label: "Note" },
    { value: "watch", label: "Watch" },
    { value: "pen", label: "Pen" },
    { value: "draw", label: "Draw" },
    { value: "studentBook", label: "Student Book" },
    { value: "compaEke", label: "Compass/Ruler Set" },
    { value: "pencilEraser", label: "Pencil/Eraser" }
  ];

  // Get category type label
  const getCategoryTypeLabel = (type) => {
    const categoryType = categoryTypes.find((ct) => ct.value === type);
    return categoryType ? categoryType.label : type;
  };

  // Filter and sort data
  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.categoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.categoryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || category.categoryType === filterType;

    return matchesSearch && matchesType;
  });

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (!sortConfig) return 0;

    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCategories = sortedCategories.slice(
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
    setEditingCategory(null);
    setFormData({
      // auto-generate category code based on timestamp
      categoryCode: `LSP_${Date.now()}`,
      categoryName: "",
      categoryType: "book",
      description: ""
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    setFormData({
      categoryCode: category.categoryCode,
      categoryName: category.categoryName,
      categoryType: category.categoryType,
      description: category.description
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const valid = validateForm();
    if (!valid.ok) {
      toast.error(valid.message);
      return;
    }

    (async () => {
      setSubmitting(true);
      try {
        if (editingCategory) {
          // update via API
          const payload = {
            categoryCode: formData.categoryCode,
            categoryName: formData.categoryName,
            categoryType: formData.categoryType,
            description: formData.description
          };
          const res = await categoryService.updateCategory(
            editingCategory.categoryCode,
            payload
          );
          // refresh list
          await loadCategories();
          toast.success("Cập nhật danh mục thành công");
        } else {
          const payload = {
            categoryCode: formData.categoryCode,
            categoryName: formData.categoryName,
            categoryType: formData.categoryType,
            description: formData.description
          };
          const res = await categoryService.createCategory(payload);
          await loadCategories();
          toast.success("Tạo danh mục thành công");
        }
      } catch (err) {
        console.error("Category save failed:", err);
        toast.error("Lưu danh mục thất bại. Vui lòng thử lại.");
      } finally {
        setSubmitting(false);
        setIsModalOpen(false);
      }
    })();
  };

  const handleDelete = (category) => {
    if (
      window.confirm(
        `Are you sure you want to delete category "${category.categoryName}"?`
      )
    ) {
      (async () => {
        try {
          setLoading(true);
          await categoryService.deleteCategory(category.categoryCode);
          await loadCategories();
          toast.success("Xóa danh mục thành công");
        } catch (err) {
          console.error("Delete category failed:", err);
          toast.error("Xóa danh mục thất bại. Vui lòng thử lại.");
        } finally {
          setLoading(false);
        }
      })();
    }
  };

  const columns = [
    {
      key: "categoryCode",
      title: "Category Code",
      sortable: true,
      render: (_value, item) => (
        <div className="flex items-center">
          <FaLayerGroup className="text-blue-500 mr-2" />
          <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {item?.categoryCode}
          </code>
        </div>
      )
    },
    {
      key: "categoryName",
      title: "Category Name",
      sortable: true,
      render: (_value, item) => (
        <span className="font-medium text-gray-900">{item?.categoryName}</span>
      )
    },
    {
      key: "categoryType",
      title: "Type",
      sortable: true,
      render: (_value, item) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {getCategoryTypeLabel(item?.categoryType)}
        </span>
      )
    },
    {
      key: "description",
      title: "Description",
      render: (_value, item) => (
        <div className="max-w-xs truncate" title={item?.description}>
          {item?.description}
        </div>
      )
    }
  ];

  const actions = {
    edit: openEditModal,
    delete: handleDelete
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <ToastContainer position="top-right" autoClose={3000} />
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Product Categories
            </h1>
            <p className="text-gray-600">
              Manage product categories and organization
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FaPlus />
            <span>Add Category</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search categories..."
              />
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {categoryTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <FaSpinner className="animate-spin text-blue-600 text-2xl mr-3" />
              <span className="text-gray-600">Loading categories...</span>
            </div>
          ) : (
            <>
              <Table
                columns={columns}
                data={paginatedCategories}
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
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? "Edit Category" : "Create New Category"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Code *
            </label>
            <input
              type="text"
              required
              value={formData.categoryCode}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none"
              placeholder="Auto-generated category code"
              disabled={true}
            />
            {editingCategory && (
              <p className="text-xs text-gray-500 mt-1">
                Category code cannot be changed when editing
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              value={formData.categoryName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  categoryName: e.target.value
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter category name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Type *
            </label>
            <select
              value={formData.categoryType}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  categoryType: e.target.value
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {categoryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
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
              placeholder="Enter category description"
            />
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
              disabled={submitting}
              className={`px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors ${
                submitting ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <FaSpinner className="animate-spin" />
                  <span>Đang lưu...</span>
                </span>
              ) : editingCategory ? (
                "Update Category"
              ) : (
                "Create Category"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
};

export default ProductCategoriesPage;
