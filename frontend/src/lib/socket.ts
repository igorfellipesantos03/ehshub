import { io } from 'socket.io-client';
import { ENV } from '../config/env';

const baseURL = ENV.API_URL.replace(/\/api\/?$/, '');

export const socket = io(baseURL, {
  autoConnect: false,
  withCredentials: true
});
