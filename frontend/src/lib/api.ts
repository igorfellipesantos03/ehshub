import axios from 'axios';
import { ENV } from '../config/env';

// Configuração do cliente Axios para consumo da API
const api = axios.create({
  baseURL: ENV.API_URL,
});

// Interceptor de Requisição: Adiciona o token JWT automaticamente se estiver logado
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('@EHS:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor de Resposta: Desconecta o usuário caso o token expire (Erro 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirou ou é inválido, limpa o storage e redireciona
      if (typeof window !== 'undefined') {
        localStorage.removeItem('@EHS:token');
        localStorage.removeItem('@EHS:user');
        
        // Evita reload na tela de login quando o usuário erra a senha
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
