export async function parseJsonRequest<T>(request: Request): Promise<{
  rawBody: string;
  body: T;
}> {
  const rawBody = await request.text();

  if (!rawBody) {
    throw new Response("Request body is required.", { status: 400 });
  }

  try {
    return {
      rawBody,
      body: JSON.parse(rawBody) as T,
    };
  } catch {
    throw new Response("Invalid JSON request body.", { status: 400 });
  }
}
