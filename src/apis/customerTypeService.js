import axiosClient from "./axiosClient";

const customerTypeService = {
  // Get all customer types
  getAll: async () => {
    const url = "/customer-types";
    return axiosClient.get(url);
  },

  // Get customer type by code
  getByCode: async (customerTypeCode) => {
    const url = `/customer-types/${customerTypeCode}`;
    return axiosClient.get(url);
  },

  // Create new customer type
  create: async (data) => {
    const url = "/customer-types/create";
    return axiosClient.post(url, data);
  },

  // Update customer type
  update: async (customerTypeCode, data) => {
    const url = `/customer-types/update/${customerTypeCode}`;
    return axiosClient.post(url, data);
  },

  // Delete customer type
  delete: async (customerTypeCode) => {
    const url = `/customer-types/delete/${customerTypeCode}`;
    return axiosClient.post(url);
  }
};

export default customerTypeService;
