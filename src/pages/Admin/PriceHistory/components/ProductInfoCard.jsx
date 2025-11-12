import React from "react";
import { FaDollarSign, FaBoxes, FaCalculator } from "react-icons/fa";

const ProductInfoCard = ({
  product,
  importPrice,
  profitMargin,
  formatPrice
}) => {
  return (
    <div className="bg-gradient-to-br from-slate-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FaBoxes className="text-blue-600" />
        Thông tin sản phẩm
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Product Details */}
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Mã sản phẩm
            </p>
            <p className="font-bold text-lg text-blue-600">
              {product.productCode}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Tên sản phẩm
            </p>
            <p className="font-semibold text-gray-900">{product.productName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Danh mục
            </p>
            <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
              {typeof product.category === "object"
                ? product.category?.categoryName ||
                  product.category?.categoryCode ||
                  "Unknown Category"
                : product.category || "Unknown Category"}
            </span>
          </div>
        </div>

        {/* Import Price Info */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <FaDollarSign className="text-blue-600" />
            <p className="text-sm font-semibold text-gray-700">
              Giá nhập hiện tại
            </p>
          </div>
          <p className="text-2xl font-bold text-blue-600 mb-1">
            {formatPrice(importPrice)}
          </p>
          <p className="text-xs text-gray-600">Từ hóa đơn đang áp dụng</p>
        </div>

        {/* Current Selling Price & Profit */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <FaCalculator className="text-purple-600" />
            <p className="text-sm font-semibold text-gray-700">
              Giá bán & Lợi nhuận
            </p>
          </div>
          <p className="text-2xl font-bold text-purple-600 mb-1">
            {formatPrice(product.currentSellingPrice)}
          </p>
          <div
            className={`text-sm font-medium px-2 py-1 rounded-full inline-block ${
              profitMargin > 0
                ? "text-green-700 bg-green-100"
                : profitMargin < 0
                ? "text-red-700 bg-red-100"
                : "text-gray-700 bg-gray-100"
            }`}
          >
            Lãi: {profitMargin.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductInfoCard;
