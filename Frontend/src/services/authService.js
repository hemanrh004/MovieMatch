// MOCK adapter (not secure). Replace with POST /api/auth/login|register and store the returned JWT.
export const login = async ({ email }) => ({ user: { id: 'me', name: email.split('@')[0], email }, token: 'mock-token' })
export const register = async ({ name, email, username }) => ({ user: { id: 'me', name, username, email }, token: 'mock-token' })
