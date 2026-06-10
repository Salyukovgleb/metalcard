import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDesignAction } from "@/app/(protected)/actions";
import { getDesignById, listDesignCategories } from "@/lib/admin-data";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const fallbackCategories = [
  "1_patriot",
  "2_crypto",
  "3_money",
  "4_exclusive",
  "5_sport",
  "6_cars",
  "7_card_designs",
  "8_brands",
  "9_cosmos",
  "10_animals",
  "11_horoscope",
  "12_cartoons",
  "13_pattern",
  "14_games",
  "15_movie_music",
  "16_anime",
  "empty",
];

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function errorText(error: string): string {
  if (error === "upload") {
    return "SVG не удалось сохранить. Проверьте категорию и файл.";
  }
  if (error) {
    return "Заполните название, категорию и SVG.";
  }
  return "";
}

export default async function EditDesignPage(props: { params: Params; searchParams: SearchParams }) {
  const [params, searchParams, dbCategories] = await Promise.all([
    props.params,
    props.searchParams,
    listDesignCategories(),
  ]);
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const design = await getDesignById(id);
  if (!design) {
    notFound();
  }

  const categories = Array.from(new Set([...dbCategories, ...fallbackCategories, design.category].filter(Boolean))).sort();
  const error = errorText(firstParam(searchParams.error));

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Редактирование принта #{design.id}</h1>
        <Link className="btn" href="/designs">
          Назад
        </Link>
      </div>

      <div className="card">
        {error ? <div className="error">{error}</div> : null}
        <form action={updateDesignAction} encType="multipart/form-data">
          <input type="hidden" name="id" value={design.id} />

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="title">Название *</label>
              <input id="title" name="title" defaultValue={design.title} required />
            </div>
            <div className="form-row">
              <label htmlFor="category">Папка категории *</label>
              <input id="category" name="category" list="design-categories" defaultValue={design.category} required />
              <datalist id="design-categories">
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="base_price">Цена принта (UZS)</label>
              <input id="base_price" name="base_price" type="number" step="0.01" defaultValue={design.basePrice} />
              <div className="field-hint">0 значит цена берется из выбранного цвета карты.</div>
            </div>
            <div className="form-row">
              <label htmlFor="sort_order">Порядок в списке</label>
              <input id="sort_order" name="sort_order" type="number" defaultValue={design.sortOrder ?? ""} />
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="svg_file">Заменить SVG</label>
            <input id="svg_file" name="svg_file" type="file" accept=".svg,image/svg+xml" />
            <div className="field-hint">Новый файл сохранится в папку выбранной категории.</div>
          </div>

          {design.svgOrig ? (
            <div className="form-row">
              <label>Текущий SVG</label>
              <div className="current-print-preview">
                <img src={design.svgOrig} alt={design.title} />
                <code>{design.svgOrig}</code>
              </div>
            </div>
          ) : null}

          <details className="advanced-fields">
            <summary>Дополнительно</summary>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="svg_orig">SVG путь/URL *</label>
                <input id="svg_orig" name="svg_orig" defaultValue={design.svgOrig} required />
              </div>
              <div className="form-row">
                <label htmlFor="preview_webp">Preview WEBP путь/URL</label>
                <input id="preview_webp" name="preview_webp" defaultValue={design.previewWebp} />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="price_overrides">Переопределение цен по цветам (JSON)</label>
              <textarea
                id="price_overrides"
                name="price_overrides"
                rows={4}
                defaultValue={JSON.stringify(design.priceOverrides ?? {}, null, 2)}
              />
            </div>
          </details>

          <div className="form-row">
            <label>
              <input
                type="checkbox"
                name="active"
                defaultChecked={design.active}
                style={{ width: "auto", marginRight: 8 }}
              />
              Активен
            </label>
          </div>

          <div className="toolbar">
            <button className="btn-primary" type="submit">
              Сохранить
            </button>
            <Link className="btn" href="/designs">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
