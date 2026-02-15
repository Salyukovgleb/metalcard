import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import DefaultDesignPage from "@/components/design/default-design-page";
import PromoDesignPage from "@/components/design/promo-design-page";
import {
  isLocale,
  preferredLocaleFromAcceptLanguage,
  type Locale,
  withQuery,
} from "@/lib/site";
import type { SearchParams } from "@/lib/query";
import { toQueryString } from "@/lib/query";

type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<SearchParams>;
};

export default async function DesignRouterPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const query = toQueryString(resolvedSearchParams);

  if (slug.length === 1 && isLocale(slug[0])) {
    return <DefaultDesignPage locale={slug[0] as Locale} searchParams={resolvedSearchParams} />;
  }

  if (slug.length === 1) {
    const requestHeaders = await headers();
    const locale = preferredLocaleFromAcceptLanguage(requestHeaders.get("accept-language"));
    redirect(withQuery(`/design/${slug[0]}/${locale}/`, query));
  }

  if (slug.length === 2 && isLocale(slug[1])) {
    return (
      <PromoDesignPage
        locale={slug[1] as Locale}
        promoSlug={slug[0]}
        searchParams={resolvedSearchParams}
      />
    );
  }

  notFound();
}
