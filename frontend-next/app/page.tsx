import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { preferredLocaleFromAcceptLanguage, withQuery } from "@/lib/site";
import { toQueryString, type SearchParams } from "@/lib/query";

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function RootPage({ searchParams }: Props) {
  const requestHeaders = await headers();
  const locale = preferredLocaleFromAcceptLanguage(requestHeaders.get("accept-language"));
  const query = toQueryString(await searchParams);

  redirect(withQuery(`/${locale}/`, query));
}
