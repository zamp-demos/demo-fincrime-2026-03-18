// Central API config - Railway URL hardcoded as fallback for production
const API_BASE = import.meta.env.VITE_API_URL || 'https://backend-production-c9c4b.up.railway.app';
export default API_BASE;
