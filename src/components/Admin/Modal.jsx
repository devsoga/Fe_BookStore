import React from "react";
import { FaTimes } from "react-icons/fa";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
  contentClassName = "",
  titleClassName = ""
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full"
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel (limit height to viewport and make content scrollable) */}
        <div
          className={`inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle ${sizeClasses[size]} sm:w-[90vw] max-h-[100vh]`}
        >
          {/* Header + Content container */}
          <div
            className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex flex-col"
            style={{ maxHeight: "100vh" }}
          >
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3
                className={`text-3xl leading-9 font-semibold text-gray-900 ${titleClassName}`}
              >
                {title}
              </h3>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes />
                </button>
              )}
            </div>
            {/* Scrollable content area */}
            <div
              className={`overflow-y-auto p-6 text-xl ${contentClassName}`}
              style={{ maxHeight: "calc(90vh - 120px)" }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
