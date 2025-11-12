import axiosClient from "./axiosClient";

const promotionService = {
  // Get all promotions
  getAllPromotions: () => {
    return axiosClient.get("/promotions");
  },

  // Get promotion by ID
  // Get promotion by code
  getPromotionByCode: (promotionCode) => {
    return axiosClient.get(`/promotions/${promotionCode}`);
  },

  // Create new promotion
  createPromotion: (data) => {
    return axiosClient.post("/promotions/create", data);
  },

  // Update promotion by promotionCode
  updatePromotion: (promotionCode, data) => {
    return axiosClient.post(`/promotions/update/${promotionCode}`, data);
  },

  // Delete promotion by promotionCode
  deletePromotion: (promotionCode) => {
    return axiosClient.post(`/promotions/delete/${promotionCode}`);
  },

  // Get active promotions
  getActivePromotions: () => {
    return axiosClient.get("/promotions/active");
  },

  // Apply promotion to order
  applyPromotion: (promotionCode, orderData) => {
    return axiosClient.post("/promotions/apply", {
      promotionCode,
      ...orderData
    });
  }
};

export default promotionService;
