import React from "react";
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown
} from "react-icons/fa";

const Table = ({
  columns,
  data,
  actions = {},
  sortConfig = null,
  onSort = null,
  className = ""
}) => {
  const getSortIcon = (columnKey) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <FaSort className="text-gray-400" />;
    }
    return sortConfig.direction === "asc" ? (
      <FaSortUp className="text-blue-500" />
    ) : (
      <FaSortDown className="text-blue-500" />
    );
  };

  const handleSort = (columnKey) => {
    if (onSort) {
      onSort(columnKey);
    }
  };

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? "cursor-pointer hover:bg-gray-100" : ""
                }`}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.title || column.label}</span>
                  {column.sortable && getSortIcon(column.key)}
                </div>
              </th>
            ))}
            {(actions.view || actions.edit || actions.delete) && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={
                  columns.length +
                  (actions.view || actions.edit || actions.delete ? 1 : 0)
                }
                className="px-6 py-4 text-center text-gray-500"
              >
                No data available
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr key={row.id || index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      if (column.render) {
                        try {
                          const rendered = column.render(row, row, index);
                          // If the renderer returned a valid React element, render it directly
                          if (React.isValidElement(rendered)) return rendered;
                          // Arrays are valid React children (array of strings/elements)
                          if (Array.isArray(rendered)) return rendered;
                          // Primitive types are fine
                          if (
                            typeof rendered === "string" ||
                            typeof rendered === "number" ||
                            typeof rendered === "boolean" ||
                            rendered === null ||
                            rendered === undefined
                          ) {
                            return <div className="text-sm text-gray-900">{rendered}</div>;
                          }
                          // If renderer returned a plain object, stringify it to avoid React error
                          return (
                            <div className="text-sm text-gray-900">
                              {JSON.stringify(rendered)}
                            </div>
                          );
                        } catch (e) {
                          console.error("Table render error for column", column.key, e);
                          return (
                            <div className="text-sm text-red-600">Render error</div>
                          );
                        }
                      }

                      const cellValue = row[column.key];
                      if (typeof cellValue === "object") {
                        if (cellValue == null) return <div />;
                        if (cellValue.toString && typeof cellValue.toString === "function") {
                          return <div className="text-sm text-gray-900">{cellValue.toString()}</div>;
                        }
                        return <div className="text-sm text-gray-900">{JSON.stringify(cellValue)}</div>;
                      }

                      return <div className="text-sm text-gray-900">{cellValue}</div>;
                    })()}
                  </td>
                ))}
                {(actions.view || actions.edit || actions.delete) && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {actions.view && (
                        <button
                          onClick={() => actions.view(row)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View"
                        >
                          <FaEye />
                        </button>
                      )}
                      {actions.edit && (
                        <button
                          onClick={() => actions.edit(row)}
                          className="text-yellow-600 hover:text-yellow-900 p-1"
                          title="Edit"
                        >
                          <FaEdit />
                        </button>
                      )}
                      {actions.delete && (
                        <button
                          onClick={() => actions.delete(row)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
