import axios from 'axios';

// API URL - Vite proxy orqali
// api.js (4-qator)
// Agar env dan kelmasa, Render URL ga /api qo'shib yozamiz
const API_URL = import.meta.env.VITE_API_URL || "https://new-shop-1.onrender.com/api"; 

console.log('API URL:', API_URL);

console.log('API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 60000,
});

// ==================== KATEGORIYALAR API ====================
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  getById: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  getStats: () => api.get('/categories/stats'),
  search: (query) => api.get(`/categories/search?q=${query}`),
  getWithCounts: () => api.get('/categories/with-counts'),
};

// ==================== QARZDORLAR API ====================
export const debtorAPI = {
  getAll: (params) => api.get('/debtors', { params }),
  getActive: () => api.get('/debtors/active'),
  getById: (id) => api.get(`/debtors/${id}`),
  create: (data) => api.post('/debtors', data),
  update: (id, data) => api.put(`/debtors/${id}`, data),
  delete: (id) => api.delete(`/debtors/${id}`),
  updateDebt: (id, data) => api.patch(`/debtors/${id}/debt`, data),
  getPayments: (debtorId) => api.get(`/debtors/${debtorId}/payments`),
  addPayment: (debtorId, paymentData) => api.post(`/debtors/${debtorId}/payments`, paymentData),
  getRemoved: (debtorId) => api.get(`/debtors/${debtorId}/removed`),
  addRemoved: (debtorId, removedData) => api.post(`/debtors/${debtorId}/removed`, removedData),
  markProductAsPaid: (debtorId, productId, data) => 
    api.post(`/debtors/${debtorId}/products/${productId}/mark-paid`, data),
  updateProduct: (debtorId, productId, data) => 
    api.put(`/debtors/${debtorId}/products/${productId}`, data),
  search: (query) => api.get('/debtors/search', { params: { query } }),
  getStats: () => api.get('/debtors/stats'),
  getHistory: (debtorId) => api.get(`/debtors/${debtorId}/history`),
  getTransactions: (debtorId) => api.get(`/debtors/${debtorId}/transactions`),
  getDebtorSales: (debtorId) => api.get(`/debtors/${debtorId}/sales`),
};

// ==================== SOTISH API ====================
export const saleAPI = {
  create: (data) => api.post('/sales', data),
  getAll: (params) => api.get('/sales', { params }),
  getById: (id) => api.get(`/sales/${id}`),
  delete: (id) => api.delete(`/sales/${id}`),
  getToday: () => api.get('/sales/today'),
  getStats: (params) => api.get('/sales/stats', { params }),
  getByDebtor: (debtorId) => api.get(`/sales/debtor/${debtorId}`),
};

// ==================== MAHSULOTLAR API ====================
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getByBarcode: (barcode) => api.get(`/products/barcode/${barcode}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getLowStock: () => api.get('/products/low-stock'),
  getStats: () => api.get('/products/stats'),
};

// ==================== TRANSAKTSIYALAR API ====================
export const transactionAPI = {
  create: (data) => api.post('/transactions', data),
  getAll: (params) => api.get('/transactions', { params }),
  getById: (id) => api.get(`/transactions/${id}`),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  getToday: () => api.get('/transactions/today'),
  getStats: (params) => api.get('/transactions/stats', { params }),
  getSalesReport: (params) => api.get('/transactions/report/sales', { params }),
};

// ==================== TEST CONNECTION ====================
// Faqat bir marta export qilingan testConnection funksiyasi
export const testConnection = async () => {
  try {
    console.log('Testing connection to:', API_URL);
    const response = await api.get('/test');
    console.log('✅ Backend connection test:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    
    // Agar proxy orqali ishlamasa, direct URL ga urinib ko'rish
    if (error.message.includes('Network Error') || error.message.includes('Failed to fetch')) {
      console.log('🔄 Trying direct connection to backend...');
      try {
        const directResponse = await axios.get('http://localhost:5000/api/test', {
          timeout: 5000
        });
        console.log('✅ Direct connection successful:', directResponse.data);
        return { 
          success: true, 
          data: directResponse.data,
          message: 'Connected directly (proxy not working)' 
        };
      } catch (directError) {
        console.error('❌ Direct connection also failed:', directError.message);
        return { 
          success: false, 
          error: 'Both proxy and direct connections failed',
          details: {
            proxyError: error.message,
            directError: directError.message
          }
        };
      }
    }
    
    return { 
      success: false, 
      error: error.message,
      status: error.response?.status 
    };
  }
};

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // CORS xatosi
    if (error.message === 'Network Error' && !error.response) {
      console.error('🌐 CORS/Network Error detected');
      console.error('Possible solutions:');
      console.error('1. Check if backend server is running on port 5000');
      console.error('2. Check CORS configuration in backend');
      console.error('3. Try accessing via http://localhost:5173 instead of https');
    }
    
    // 401 xatosi (unauthorized)
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized - check authentication');
      localStorage.removeItem('token');
    }
    
    return Promise.reject(error);
  }
);

export default api;