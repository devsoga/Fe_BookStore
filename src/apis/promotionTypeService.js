import axiosClient from "./axiosClient";

const promotionTypeService = {
  // Get all promotion types
  getAllPromotionTypes: () => {
    return axiosClient.get("/promotion-types");
  },

  // Get promotion type by code
  getPromotionTypeByCode: (promotionTypeCode) => {
    return axiosClient.get(`/promotion-types/${promotionTypeCode}`);
  },

  // Create new promotion type
  createPromotionType: (data) => {
    return axiosClient.post("/promotion-types/create", data);
  },

  // Update promotion type (by code)
  updatePromotionType: (promotionTypeCode, data) => {
    return axiosClient.post(
      `/promotion-types/update/${promotionTypeCode}`,
      data
    );
  },

  // Delete promotion type (by code)
  deletePromotionType: (promotionTypeCode) => {
    return axiosClient.post(`/promotion-types/delete/${promotionTypeCode}`);
  }
};

export default promotionTypeService;
