export type SearchParams = Record<string, string | string[] | undefined>;

export function toQueryString(searchParams?: SearchParams): string {
  if (!searchParams) {
    return "";
  }

  const urlParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      for (const arrayValue of value) {
        urlParams.append(key, arrayValue);
      }
      continue;
    }

    urlParams.append(key, value);
  }

  const serialized = urlParams.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}
