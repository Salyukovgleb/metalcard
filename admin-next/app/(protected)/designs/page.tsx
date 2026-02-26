import Link from "next/link";
import { deleteDesignAction, updateDesignSortAction } from "@/app/(protected)/actions";
import { listDesignCategories, listDesigns } from "@/lib/admin-data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fmt = new Intl.NumberFormat("ru-RU");
const siteBaseUrl = (process.env.SITE_BASE_URL ?? "https://metalcards.uz").replace(/\/+$/, "");

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function extractRenderIdFromSvg(svgOrig: string): number | null {
  const clean = svgOrig.split("#")[0]?.split("?")[0]?.replaceAll("\\", "/") ?? "";
  const file = clean.split("/").filter(Boolean).at(-1) ?? "";
  const noExt = file.replace(/\.[^.]+$/, "").trim();
  if (!/^\d+$/.test(noExt)) {
    return null;
  }
  const parsed = Number.parseInt(noExt, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getDesignPreviewSrc(design: { previewWebp: string; svgOrig: string; category: string }): string {
  if (design.previewWebp) {
    return design.previewWebp;
  }
  const renderId = extractRenderIdFromSvg(design.svgOrig);
  if (renderId && design.category) {
    return `${siteBaseUrl}/renders/${design.category}/white/${renderId}.png`;
  }
  return design.svgOrig;
}

export default async function DesignsPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const category = firstParam(searchParams.category).trim();

  const [designs, categories] = await Promise.all([listDesigns(category || undefined), listDesignCategories()]);

  const redirectTo = category ? `/designs?category=${encodeURIComponent(category)}` : "/designs";

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Принты</h1>
        <div className="toolbar">
          <Link className="btn" href="/designs">
            Сброс
          </Link>
          <Link className="btn btn-primary" href="/designs/new">
            Добавить
          </Link>
        </div>
      </div>

      <div className="card">
        <form className="toolbar" method="get">
          <label htmlFor="category" style={{ marginBottom: 0 }}>
            Категория
          </label>
          <select id="category" name="category" defaultValue={category} style={{ width: 260 }}>
            <option value="">Все</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button type="submit">Фильтровать</button>
        </form>

        <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Превью</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Цена</th>
                <th>Порядок</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {designs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    Пока пусто
                  </td>
                </tr>
              ) : (
                designs.map((design) => (
                  <tr key={design.id}>
                    <td>{design.id}</td>
                    <td>
                      {design.previewWebp || design.svgOrig ? (
                        <img
                          src={getDesignPreviewSrc(design)}
                          alt={design.title}
                          style={{ width: 70, height: 44, objectFit: "contain", display: "block" }}
                        />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>{design.title}</td>
                    <td>{design.category || "—"}</td>
                    <td>
                      {design.basePrice > 0 ? (
                        <span style={{ color: "#11734f", fontWeight: 700 }}>
                          {fmt.format(Math.round(design.basePrice))} ★
                        </span>
                      ) : (
                        <span className="muted">от цвета</span>
                      )}
                    </td>
                    <td>
                      <input
                        form="sort-form"
                        name={`order_${design.id}`}
                        type="number"
                        defaultValue={design.sortOrder ?? ""}
                        min={0}
                        style={{ width: 92 }}
                      />
                    </td>
                    <td>
                      <div className="toolbar" style={{ margin: 0 }}>
                        <Link className="btn" href={`/designs/${design.id}/edit`}>
                          Ред.
                        </Link>
                        <form action={deleteDesignAction}>
                          <input type="hidden" name="id" value={design.id} />
                          <button className="btn-danger" type="submit">
                            Удалить
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
        </table>

        <form id="sort-form" action={updateDesignSortAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="redirect_to" value={redirectTo} />
          <button className="btn-primary" type="submit">
            Сохранить порядок
          </button>
        </form>
      </div>
    </>
  );
}
