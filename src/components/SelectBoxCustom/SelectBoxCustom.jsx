import React from "react";

const SelectBoxCustom = ({ selectOptions, getValue, type, value }) => {
  return (
    <div className="relative border w-full">
      <select
        value={value}
        onChange={(e) => {
          getValue(e.target.value, type);
        }}
        className="appearance-none py-2 pl-2 pr-8 outline-none borde w-full cursor-pointer"
      >
        {selectOptions.map((item, idx) => (
          <option key={idx} value={item.value}>
            {item.title}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        <svg
          className="h-4 w-4 text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 011.08 1.04l-4.24 4.25a.75.75 0 01-1.08 0l-4.24-4.25a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  );
};

export default SelectBoxCustom;
