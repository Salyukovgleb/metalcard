import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { toQueryString, type SearchParams } from "@/lib/query";
import { preferredLocaleFromAcceptLanguage, withQuery } from "@/lib/site";

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function GalleryRootPage({ searchParams }: Props) {
  const requestHeaders = await headers();
  const locale = preferredLocaleFromAcceptLanguage(requestHeaders.get("accept-language"));
  const query = toQueryString(await searchParams);

  redirect(withQuery(`/gallery/${locale}/`, query));
}
