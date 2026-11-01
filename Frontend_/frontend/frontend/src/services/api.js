import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export const fetchCities = async () => {
  const response = await api.get('/api/cities');
  return response.data?.cities || [];
};

export const fetchNearestStations = async (lat, lon, city) => {
  const params = {};
  if (lat !== undefined && lat !== null) params.lat = lat;
  if (lon !== undefined && lon !== null) params.lon = lon;
  if (city) params.city = city;
  
  const response = await api.get('/api/nearest-station', { params });
  return response.data;
};

export const fetchParking = async (stationId, hour) => {
  const params = { station: stationId };
  if (hour !== undefined && hour !== null) params.hour = hour;

  const response = await api.get('/api/parking', { params });
  return response.data;
};

export const fetchRushAlert = async () => {
  const response = await api.get('/api/rush-alert');
  return response.data;
};

export const fetchNavigation = async (stationId) => {
  const response = await api.get('/api/navigation', { params: { station: stationId } });
  return response.data;
};

export const reserveSlot = async ({ stationId, parkingId, slotNumber }) => {
  const response = await api.post('/api/reserve', {
    stationId,
    parkingId,
    slotNumber,
  });
  return response.data;
};

export const checkIn = async (qrToken) => {
  const response = await api.post('/api/check-in', { qrToken });
  return response.data;
};

export const checkOut = async (qrToken) => {
  const response = await api.post('/api/check-out', { qrToken });
  return response.data;
};

export const fetchHistory = async () => {
  const response = await api.get('/api/history');
  return response.data?.history || [];
};

export const fetchBookings = async () => {
  const response = await api.get('/api/bookings');
  return response.data?.bookings || [];
};

export const cancelBooking = async (bookingId) => {
  const response = await api.post('/api/cancel', { bookingId });
  return response.data;
};

export const updateSensor = async ({ stationId, parkingId, availableSlots }) => {
  const response = await api.post('/api/sensor-update', {
    stationId,
    parkingId,
    availableSlots,
  });
  return response.data;
};

export default api;
