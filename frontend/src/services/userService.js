// Mock User Service (Prepared for FastAPI / MongoDB backend)

export const userService = {
  getUsers: async (localUsers) => {
    return localUsers || [];
  },

  getUserById: async (id, localUsers) => {
    return localUsers.find((u) => u.id === id) || null;
  }
};
