// Mock for next-auth
export const signIn = jest.fn(() => Promise.resolve({ ok: true, error: null }));
export const signOut = jest.fn(() => Promise.resolve());
export const useSession = jest.fn(() => ({
  data: {
    user: {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      role: "admin",
    },
  },
  status: "authenticated",
}));

export const auth = jest.fn(() =>
  Promise.resolve({
    user: {
      id: "1",
      name: "Test User",
      email: "test@example.com",
      role: "admin",
    },
  })
);

export const handlers = {
  GET: jest.fn(),
  POST: jest.fn(),
};
