import axiosClient from "./axiosClient";

const getAllCoupons = async () => {
  const result = await axiosClient.get("/coupons");
  return result;
};

const getByCode = async (couponCode) => {
  if (!couponCode) throw new Error("couponCode is required");
  const result = await axiosClient.get(
    `/coupons/${encodeURIComponent(couponCode)}`
  );
  return result;
};

const createCoupon = async (payload) => {
  const result = await axiosClient.post("/coupons/create", payload);
  return result;
};

const updateCoupon = async (couponCode, payload) => {
  const result = await axiosClient.post(
    `/coupons/update/${encodeURIComponent(couponCode)}`,
    payload
  );
  return result;
};

const deleteCoupon = async (couponCode) => {
  const result = await axiosClient.post(
    `/coupons/delete/${encodeURIComponent(couponCode)}`
  );
  return result;
};

const couponService = {
  getAllCoupons,
  getByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon
};

export default couponService;
export { couponService };
