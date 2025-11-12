import React from "react";
import { FaEdit, FaPlus, FaUpload, FaTimes, FaBook } from "react-icons/fa";

const ProductForm = ({
  editingProduct,
  previewImage,
  previewImageFile,
  handleImageUpload,
  removeImage,
  categories,
  handleSaveProduct,
  setIsModalOpen,
  setEditingProduct,
  setPreviewImage,
  setPreviewImageFile,
  formatCurrency,
  normalizeImage,
  loading
}) => {
  console.log(editingProduct);
  return (
    <div className="max-h-[70vh] overflow-y-auto">
      <form onSubmit={handleSaveProduct} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Image Upload */}
          <div className="lg:col-span-1">
            <div className="sticky top-0">
              <label className="block text-sm font-semibold text-gray-700 mb-4">
                Hình ảnh sản phẩm
              </label>

              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="product-image-upload"
                />

                {previewImage ? (
                  <div className="relative">
                    <img
                      src={normalizeImage(previewImage)}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <FaTimes size={12} />
                    </button>
                    <label
                      htmlFor="product-image-upload"
                      className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 cursor-pointer rounded-lg flex items-center justify-center transition-all"
                    >
                      <div className="bg-white bg-opacity-90 rounded-full p-2 opacity-0 hover:opacity-100 transition-opacity">
                        <FaEdit className="text-gray-600" />
                      </div>
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="product-image-upload"
                    className="cursor-pointer block"
                  >
                    <div className="w-20 h-20 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <FaUpload className="text-blue-600 text-2xl" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      Tải lên hình ảnh
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Chọn file ảnh từ máy tính của bạn
                    </p>
                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block hover:bg-blue-700 transition-colors">
                      Chọn file
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      PNG, JPG lên đến 5MB
                    </p>
                  </label>
                )}
              </div>

              {/* Image Guidelines */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                  Hướng dẫn ảnh sản phẩm
                </h4>
                <ul className="text-xs text-blue-600 space-y-1">
                  <li>• Tỷ lệ khung hình 4:5 hoặc 3:4</li>
                  <li>• Độ phân giải tối thiểu 800x600px</li>
                  <li>• Nền trắng hoặc trong suốt</li>
                  <li>• Sản phẩm chiếm 80% khung hình</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Columns - Form Fields */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Section */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FaBook className="text-blue-600" />
                Thông tin cơ bản
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tên sản phẩm *
                  </label>
                  <input
                    type="text"
                    name="productName"
                    defaultValue={
                      editingProduct?.productName || editingProduct?.name
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Nhập tên sản phẩm..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô tả sản phẩm
                  </label>
                  <textarea
                    name="description"
                    rows="4"
                    defaultValue={editingProduct?.description}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                    placeholder="Mô tả chi tiết về sản phẩm..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tác giả *
                  </label>
                  <input
                    type="text"
                    name="author"
                    defaultValue={editingProduct?.author}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Tên tác giả..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nhà xuất bản
                  </label>
                  <input
                    type="text"
                    name="publisher"
                    defaultValue={editingProduct?.publisher}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Nhà xuất bản..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mã sản phẩm / ISBN
                  </label>
                  <input
                    type="text"
                    name="productCode"
                    defaultValue={
                      editingProduct?.productCode || editingProduct?.isbn || ""
                    }
                    disabled={!!editingProduct}
                    readOnly={!!editingProduct}
                    title={
                      editingProduct
                        ? "Không thể thay đổi mã sản phẩm sau khi tạo"
                        : "Mã sản phẩm (mặc định sẽ sử dụng Mã sản phẩm nếu để trống)..."
                    }
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      editingProduct ? "bg-gray-100 cursor-not-allowed" : ""
                    }`}
                    placeholder="Mã sản phẩm (mặc định sẽ sử dụng Mã sản phẩm nếu để trống)..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Danh mục *
                  </label>
                  <select
                    name="categoryCode"
                    defaultValue={editingProduct?.categoryCode}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((category) => (
                      <option
                        key={category.categoryCode}
                        value={category.categoryCode}
                      >
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing Section (hidden when creating) */}
            {editingProduct && (
              <div className="bg-green-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaBook className="text-green-600" />
                  Thông tin giá & kho
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giá nhập
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 flex items-center">
                      <span className="text-sm font-medium">
                        {editingProduct?.importPrice
                          ? `${formatCurrency(editingProduct.importPrice)}đ`
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Giá bán
                    </label>
                    <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 flex items-center">
                      <span className="text-sm font-medium">
                        {editingProduct?.price
                          ? `${formatCurrency(editingProduct.price)}đ`
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số lượng tồn kho *
                    </label>
                    <input
                      type="number"
                      name="stock"
                      defaultValue={editingProduct?.stockQuantity}
                      required
                      min="0"
                      disabled={!!editingProduct}
                      readOnly={!!editingProduct}
                      title={
                        editingProduct
                          ? "Số lượng tồn kho đã được khóa và không thể chỉnh sửa"
                          : "Số lượng tồn kho"
                      }
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        editingProduct ? "bg-gray-100 cursor-not-allowed" : ""
                      }`}
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              setIsModalOpen(false);
              setEditingProduct(null);
              setPreviewImage("");
              setPreviewImageFile(null);
            }}
            className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Đang xử lý...
              </>
            ) : (
              <>
                {editingProduct ? <FaEdit /> : <FaPlus />}
                {editingProduct ? "Cập nhật" : "Thêm mới"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
