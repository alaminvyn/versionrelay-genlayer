export async function readRateLimit(adapter, fetcher = fetch) {
  const { request, responsePath } = adapter;
  const response = await fetcher(new URL(request.path, "https://api.github.com"), {
    method: request.method,
    headers: request.headers,
  });
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
  return responsePath.reduce((value, key) => value?.[key], await response.json());
}
