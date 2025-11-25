import axios from 'axios'
import { AuthModel, UserModel } from './_models'

// Use environment variable if available, fallback to local proxy
const API_URL = import.meta.env.VITE_APP_API_URL || '/api'

export const LOGIN_URL = `${API_URL}/login`
export const PROFILE_URL = `${API_URL}/profile`
export const REQUEST_PASSWORD_URL = `${API_URL}/forgot_password`

export async function login(username: string, password: string) {
  const formData = new FormData()
  formData.append('username', username)
  formData.append('password', password)

  return axios.post(LOGIN_URL, formData)
}

export async function requestPassword(email: string) {
  return axios.post<{ result: boolean }>(REQUEST_PASSWORD_URL, { email })
}

export async function getUserByToken(token: string) {
  return axios.get<{ message: string; user: UserModel }>(PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getLocations(token: string, page = 1) {
  return axios.get(`${API_URL}/locations?page=${page}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function getZones(token: string, locationId?: number) {
  const url = locationId
    ? `${API_URL}/zones?location_id=${locationId}`
    : `${API_URL}/zones`

  return axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

export async function deleteLocation(token: string, locationId: number) {
  return axios.delete(`${API_URL}/delete-location/${locationId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}


export const createPole = async (token: string, data: any) => {
  try {
    const response = await axios.post(`${API_URL}/create-pole`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createPole error:', error);
    throw error;
  }
};


// 👥 Create user (NEW)
export const createUser = async (token: string, data: any) => {
  try {
    const response = await axios.post(`${API_URL}/create-user`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    
    throw error
  }
}

// 👥 Get users with pagination
export function getUsers(token: string, page: number = 1, limit: number = 10) {
  return axios.get(`${API_URL}/users?page=${page}&limit=${limit}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}


// 👥 Update user
export const updateUser = async (token: string, userId: number, data: any) => {
  try {
    const response = await axios.put(`${API_URL}/update-user/${userId}`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error) {
    throw error
  }
}

// 👥 Delete user
export const deleteUser = async (token: string, userId: number) => {
  try {
    const response = await axios.delete(`${API_URL}/delete-user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  } catch (error) {
    console.error('❌ deleteUser error:', error)
    throw error
  }
}


export const getUserPermissions = async (token: string, userId: number) => {
  return axios.get(`${API_URL}/user/${userId}/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export const updateUserPermissions = async (token: string, userId: number, permissions: number[]) => {
  const formData = new FormData()
  formData.append('permissions', JSON.stringify(permissions))

  return axios.put(`${API_URL}/user-permissions/${userId}`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
