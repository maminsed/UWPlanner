type variableTypes = number | string | number[] | string[] | boolean | boolean[];

export default function useGQL() {
  return async (query: string, variables: Record<string, variableTypes> = {}) => {
    const gqlUrl = process.env.NEXT_PUBLIC_GQL_URL;
    if (!gqlUrl) {
      throw new Error('Course data service is not configured.');
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(gqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({ query, variables }),
    }).finally(() => window.clearTimeout(timeout));

    if (!res.ok) throw new Error(`Course data service returned ${res.status}.`);

    const response = await res.json().catch(() => {});

    if (response?.errors?.length) {
      const msg = response.errors.map((i: { message: string }) => i.message).join('; ');
      throw new Error(`Course data service error: ${msg}`);
    }
    return response;
  };
}
