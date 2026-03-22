import API from "./api";

export const registerUser = async (data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) => {
  const res = await API.post("/api/auth/register", data); // ✅ FIXED
  return res.data.data;
};

export const loginUser = async (data: {
  email: string;
  password: string;
}) => {
  const res = await API.post("/api/auth/login", data); // ✅
  return res.data.data;
};

export const getMe = async () => {
  const res = await API.get("/api/auth/me"); // ✅
  return res.data.data;
};