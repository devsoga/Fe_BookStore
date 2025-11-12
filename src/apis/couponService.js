import axiosClient from "./axiosClient";

const getAllCoupons = async () => {
  const result = await axiosClient.get("/v1/api/coupons");
  return result;
};

/**
 * Get coupon detail by coupon code
 * Example backend route: GET /v1/api/coupons/{couponCode}
 */
const getByCode = async (couponCode) => {
  if (!couponCode) throw new Error("couponCode is required");
  const result = await axiosClient.get(
    `/coupons/${encodeURIComponent(couponCode)}`
  );
  return result;
};

export const couponService = {
  getAllCoupons,
  getByCode
};
