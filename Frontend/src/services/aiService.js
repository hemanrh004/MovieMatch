// Point VITE_AI_API_URL at your backend (POST /api/ai/recommend). The LLM key stays on the server.
export async function askAI(message) {
  const url = import.meta.env.VITE_AI_API_URL
  if (!url) throw new Error('AI backend not configured yet. Set VITE_AI_API_URL.')
  const r = await fetch(`${url}/recommend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
  if (!r.ok) throw new Error('AI request failed')
  return r.json()
}
