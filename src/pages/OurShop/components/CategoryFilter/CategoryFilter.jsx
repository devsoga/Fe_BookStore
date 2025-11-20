import React from "react";
import {
  IoBookOutline,
  IoCalculatorOutline,
  IoWatchOutline,
  IoCreateOutline,
  IoBrushOutline,
  IoSchoolOutline
} from "react-icons/io5";
import {
  FaRobot,
  FaUserAstronaut,
  FaStickyNote,
  FaPen,
  FaRuler,
  FaEraser
} from "react-icons/fa";

const CategoryFilter = ({
  selectedCategory,
  onCategoryChange,
  productCounts = {},
  bookTypes = []
}) => {
  const categories = [
    {
      code: "all",
      name: "Tất cả sản phẩm",
      icon: null,
      color: "bg-gray-100 text-gray-700 hover:bg-gray-200",
      activeColor: "bg-blue-600 text-white"
    },
    {
      code: "book",
      name: "Sách",
      icon: IoBookOutline,
      color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
      activeColor: "bg-blue-600 text-white"
    },
    {
      code: "modelKit",
      name: "Mô hình Kit",
      icon: FaRobot,
      color: "bg-purple-50 text-purple-700 hover:bg-purple-100",
      activeColor: "bg-purple-600 text-white"
    },
    {
      code: "figure",
      name: "Mô hình Figure",
      icon: FaUserAstronaut,
      color: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
      activeColor: "bg-indigo-600 text-white"
    },
    {
      code: "calculator",
      name: "Máy tính",
      icon: IoCalculatorOutline,
      color: "bg-green-50 text-green-700 hover:bg-green-100",
      activeColor: "bg-green-600 text-white"
    },
    {
      code: "note",
      name: "Sổ tay/Vở",
      icon: FaStickyNote,
      color: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100",
      activeColor: "bg-yellow-600 text-white"
    },
    {
      code: "watch",
      name: "Đồng hồ",
      icon: IoWatchOutline,
      color: "bg-red-50 text-red-700 hover:bg-red-100",
      activeColor: "bg-red-600 text-white"
    },
    {
      code: "pen",
      name: "Bút",
      icon: FaPen,
      color: "bg-orange-50 text-orange-700 hover:bg-orange-100",
      activeColor: "bg-orange-600 text-white"
    },
    {
      code: "draw",
      name: "Dụng cụ vẽ",
      icon: IoBrushOutline,
      color: "bg-pink-50 text-pink-700 hover:bg-pink-100",
      activeColor: "bg-pink-600 text-white"
    },
    {
      code: "studentBook",
      name: "Sách học sinh",
      icon: IoSchoolOutline,
      color: "bg-teal-50 text-teal-700 hover:bg-teal-100",
      activeColor: "bg-teal-600 text-white"
    },
    {
      code: "compaEke",
      name: "Thước/Compa",
      icon: FaRuler,
      color: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100",
      activeColor: "bg-cyan-600 text-white"
    },
    {
      code: "pencilEraser",
      name: "Bút chì/Tẩy",
      icon: FaEraser,
      color: "bg-gray-50 text-gray-700 hover:bg-gray-100",
      activeColor: "bg-gray-600 text-white"
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"
          />
        </svg>
        Lọc theo danh mục sản phẩm
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-3">
        {categories.map((category) => {
          // Treat book sub-type selections as activating the 'book' category
          const isActive =
            category.code === "book"
              ? selectedCategory === "book" ||
                (bookTypes || []).includes(selectedCategory)
              : selectedCategory === category.code;
          const IconComponent = category.icon;
          const count = productCounts[category.code] || 0;

          return (
            <button
              key={category.code}
              onClick={() => onCategoryChange(category.code)}
              className={`
                relative p-4 rounded-lg border-2 transition-all duration-200 group min-h-[80px] flex flex-col items-center justify-center text-center
                ${
                  isActive
                    ? `${category.activeColor} border-current shadow-md transform scale-105`
                    : `${category.color} border-transparent hover:border-current hover:shadow-sm hover:transform hover:scale-102`
                }
              `}
            >
              <div className="flex flex-col items-center gap-1">
                {IconComponent && <IconComponent className="text-2xl mb-1" />}
                <span className="text-xs font-medium leading-tight">
                  {category.name}
                </span>
                {category.code !== "all" && (
                  <span
                    className={`
                    text-xs px-1.5 py-0.5 rounded-full font-medium
                    ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-black/5 text-gray-600"
                    }
                  `}
                  >
                    {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
        {/* Book sub-type buttons removed (handled by SortProduct select) */}
      </div>
    </div>
  );
};

export default CategoryFilter;
