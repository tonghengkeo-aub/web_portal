// ==============================================================
// HOTEL BOOKING SYSTEM - API CLIENT & STATE MANAGEMENT
// ==============================================================

const API_HOST = (typeof window !== 'undefined' && window.location && window.location.hostname)
    ? window.location.hostname
    : 'localhost';
const API_BASE_URL = `http://${API_HOST}:8080/api`;

// Current session helpers
const Auth = {
    getToken() {
        return localStorage.getItem('hb_token');
    },
    getUser() {
        const u = localStorage.getItem('hb_user');
        return u ? JSON.parse(u) : null;
    },
    setSession(token, user) {
        localStorage.setItem('hb_token', token);
        localStorage.setItem('hb_user', JSON.stringify(user));
    },
    clear() {
        localStorage.removeItem('hb_token');
        localStorage.removeItem('hb_user');
    },
    isAuthenticated() {
        return !!this.getToken();
    },
    requireRole(expectedRole) {
        const user = this.getUser();
        if (!user || user.role !== expectedRole) {
            window.location.href = 'index.html?error=unauthorized';
            return false;
        }
        return true;
    }
};

// Generic fetch wrapper with JWT & error handling
async function apiFetch(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    const token = Auth.getToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (res.status === 401 || res.status === 403) {
            console.warn('Session expired or unauthorized');
            // If on dashboard, alert and redirect
            if (!window.location.pathname.endsWith('index.html')) {
                // Auth.clear();
                // window.location.href = 'index.html';
            }
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: res.statusText }));
            throw new Error(err.message || 'API request failed');
        }

        return await res.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Global API Services
const ApiService = {
    // Auth
    async login(email, password) {
        return apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async register(data) {
        return apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Public / Customer
    async getHotels(query = '', province = '') {
        let url = '/hotels';
        const params = [];
        if (query) params.push(`query=${encodeURIComponent(query)}`);
        if (province) params.push(`province=${encodeURIComponent(province)}`);
        if (params.length) url += `?${params.join('&')}`;
        return apiFetch(url);
    },

    async getHotelById(id) {
        return apiFetch(`/hotels/${id}`);
    },

    async getRoomsByHotel(hotelId) {
        return apiFetch(`/rooms/hotel/${hotelId}`);
    },

    // Admin Endpoints
    async getAdminStats() {
        return apiFetch('/admin/stats');
    },

    async getAdminHotels() {
        return apiFetch('/admin/hotels');
    },

    async updateHotelStatus(hotelId, status) {
        return apiFetch(`/admin/hotels/${hotelId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },

    async getAdminUsers() {
        return apiFetch('/admin/users');
    },

    async toggleUserStatus(userId) {
        return apiFetch(`/admin/users/${userId}/toggle-status`, {
            method: 'PUT'
        });
    },

    async getAdminBookings() {
        return apiFetch('/admin/bookings');
    },

    async approveUser(userId, isApproved = true) {
        return apiFetch(`/admin/users/${userId}/approve`, {
            method: 'PUT',
            body: JSON.stringify({ isApproved })
        });
    },

    async createAdminUser(data) {
        return apiFetch('/admin/users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateUserRole(userId, role) {
        return apiFetch(`/admin/users/${userId}/role`, {
            method: 'PUT',
            body: JSON.stringify({ role })
        });
    },

    async deleteAdminUser(userId) {
        return apiFetch(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
    },

    async deleteUser(userId) {
        return apiFetch(`/admin/users/${userId}`, {
            method: 'DELETE'
        });
    },

    async approveBooking(bookingId) {
        return apiFetch(`/admin/bookings/${bookingId}/approve`, {
            method: 'PUT'
        });
    },

    async checkInBooking(bookingId) {
        return apiFetch(`/admin/bookings/${bookingId}/check-in`, {
            method: 'PUT'
        });
    },

    async checkOutBooking(bookingId) {
        return apiFetch(`/admin/bookings/${bookingId}/check-out`, {
            method: 'PUT'
        });
    },

    async completeBooking(bookingId) {
        return apiFetch(`/admin/bookings/${bookingId}/complete`, {
            method: 'PUT'
        });
    },

    async rejectBooking(bookingId) {
        return apiFetch(`/admin/bookings/${bookingId}/reject`, {
            method: 'PUT'
        });
    },

    async markRoomCleaned(roomId) {
        return apiFetch(`/admin/rooms/${roomId}/mark-cleaned`, {
            method: 'PUT'
        });
    },

    async getAdminRooms() {
        try {
            const data = await apiFetch('/admin/rooms');
            if (Array.isArray(data) && data.length > 0) return data;
        } catch (e) {
            console.warn('apiFetch /admin/rooms error, trying fallback:', e);
        }
        try {
            const res = await fetch(`${API_BASE_URL}/rooms/hotel/1`);
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list)) return list;
            }
        } catch (err) {
            console.error('Failed to fetch rooms from /rooms/hotel/1:', err);
        }
        return [];
    },

    async createAdminRoom(roomData) {
        return apiFetch('/admin/rooms', {
            method: 'POST',
            body: JSON.stringify(roomData)
        });
    },

    async updateAdminRoom(roomId, roomData) {
        return apiFetch(`/admin/rooms/${roomId}`, {
            method: 'PUT',
            body: JSON.stringify(roomData)
        });
    },

    async deleteAdminRoom(roomId) {
        return apiFetch(`/admin/rooms/${roomId}`, {
            method: 'DELETE'
        });
    },

    async getHotelInfo() {
        return apiFetch('/admin/hotel');
    },

    async updateHotelInfo(hotelData) {
        return apiFetch('/admin/hotel', {
            method: 'PUT',
            body: JSON.stringify(hotelData)
        });
    },

    // Hotel Owner Endpoints
    async getMyHotel() {
        return apiFetch('/owner/my-hotel');
    },

    async updateMyHotel(data) {
        return apiFetch('/owner/my-hotel', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async getOwnerStats() {
        return apiFetch('/owner/stats');
    },

    async getMyRooms() {
        return apiFetch('/owner/rooms');
    },

    async createRoom(roomData) {
        return apiFetch('/owner/rooms', {
            method: 'POST',
            body: JSON.stringify(roomData)
        });
    },

    async updateRoom(roomId, roomData) {
        return apiFetch(`/owner/rooms/${roomId}`, {
            method: 'PUT',
            body: JSON.stringify(roomData)
        });
    },

    async deleteRoom(roomId) {
        return apiFetch(`/owner/rooms/${roomId}`, {
            method: 'DELETE'
        });
    },

    async getMyHotelBookings() {
        return apiFetch('/owner/bookings');
    },

    async updateBookingStatus(bookingId, status) {
        return apiFetch(`/owner/bookings/${bookingId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    },

    async recordPayment(bookingId, paymentData) {
        return apiFetch(`/bookings/${bookingId}/payments`, {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    },

    async getBookingById(bookingId) {
        return apiFetch(`/bookings/${bookingId}`);
    },

    async getReviews() {
        try {
            const res = await fetch(`${API_BASE_URL}/reviews`, { cache: 'no-store' });
            if (res.ok) {
                const list = await res.json();
                if (Array.isArray(list)) return list;
            }
        } catch (e) {
            console.warn('Direct fetch /reviews failed:', e);
        }
        try {
            const data = await apiFetch('/reviews');
            if (Array.isArray(data)) return data;
        } catch (_) {}
        try {
            const data = await apiFetch('/admin/reviews');
            if (Array.isArray(data)) return data;
        } catch (_) {}
        return [];
    }
};

// UI Notification helpers
const Toast = {
    fire(icon, title) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon,
                title,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            alert(`${icon.toUpperCase()}: ${title}`);
        }
    }
};
