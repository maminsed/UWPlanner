type variableTypes = number | string | number[] | string[] | boolean | boolean[];

export default function useGQL() {
  return async (query: string, variables: Record<string, variableTypes> = {}) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_GQL_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) throw new Error(`HTTP errro: ${res.status}`);

    const response = await res.json().catch(() => {});

    if (response?.errors?.length) {
      const msg = response.errors.map((i: { message: string }) => i.message).join('; ');
      throw new Error(`Error in GQL: ${msg}`);
    }
    return response;
  };
}
