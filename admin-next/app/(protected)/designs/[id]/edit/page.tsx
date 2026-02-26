import Link from "next/link";
import { notFound } from "next/navigation";
import { updateDesignAction } from "@/app/(protected)/actions";
import { getDesignById } from "@/lib/admin-data";

type Params = Promise<{ id: string }>;

export default async function EditDesignPage(props: { params: Params }) {
  const params = await props.params;
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const design = await getDesignById(id);
  if (!design) {
    notFound();
  }

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Редактирование принта #{design.id}</h1>
        <Link className="btn" href="/designs">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={updateDesignAction} encType="multipart/form-data">
          <input type="hidden" name="id" value={design.id} />

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="title">Название *</label>
              <input id="title" name="title" defaultValue={design.title} required />
            </div>
            <div className="form-row">
              <label htmlFor="category">Категория</label>
              <input id="category" name="category" defaultValue={design.category} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="base_price">Цена дизайна (UZS)</label>
              <input id="base_price" name="base_price" type="number" step="0.01" defaultValue={design.basePrice} />
            </div>
            <div className="form-row">
              <label htmlFor="sort_order">Порядок</label>
              <input id="sort_order" name="sort_order" type="number" defaultValue={design.sortOrder ?? ""} />
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
            <label htmlFor="svg_file">Заменить SVG (S3 Beget)</label>
            <input id="svg_file" name="svg_file" type="file" accept=".svg,image/svg+xml" />
          </div>

          {design.svgOrig ? (
            <div className="form-row">
              <label>Текущий SVG</label>
              <img src={design.svgOrig} alt={design.title} style={{ maxWidth: 360, maxHeight: 220, objectFit: "contain" }} />
            </div>
          ) : null}

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
