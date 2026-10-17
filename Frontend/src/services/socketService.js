// Later: npm i socket.io-client, uncomment the import and connectSocket body.
// import { io } from 'socket.io-client'
let socket = null
export const connectSocket = token => { /* socket = io(import.meta.env.VITE_SOCKET_URL, { auth: { token } }) */ }
export const sendMessage = (to, text) => socket?.emit('message:send', { to, text })
export const receiveMessage = cb => socket?.on('message:receive', cb)
export const typingStart = to => socket?.emit('typing:start', { to })
export const typingStop = to => socket?.emit('typing:stop', { to })
export const markMessageRead = id => socket?.emit('message:read', { id })
