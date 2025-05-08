// API 設定檔
let API_URL = '';

// 根據環境動態決定 API URL
if (typeof window !== 'undefined') {
  // 瀏覽器環境
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // 本地開發環境
    API_URL = 'http://localhost:4000';
  } else {
    // 生產環境（Vercel）
    API_URL = 'https://time2cinema-backend.onrender.com';
  }
} else {
  // 服務器端渲染環境
  API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://time2cinema-backend.onrender.com';
}

export default API_URL;
