export async function graphql(query) {
  if (!process.env.BUFFER_API_KEY) throw new Error('BUFFER_API_KEY is required');
  const r = await fetch('https://api.buffer.com', {
    method: 'POST', headers: {'Content-Type':'application/json', Authorization:`Bearer ${process.env.BUFFER_API_KEY}`},
    body: JSON.stringify({query}), signal: AbortSignal.timeout(45000)
  });
  if (!r.ok) throw new Error(`Buffer HTTP ${r.status}`);
  const b = await r.json();
  if (b.errors?.length) throw new Error(JSON.stringify(b.errors));
  return b.data;
}
