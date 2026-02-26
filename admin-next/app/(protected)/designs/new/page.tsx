import Link from "next/link";
import { createDesignAction } from "@/app/(protected)/actions";

export default function NewDesignPage() {
  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Новый принт</h1>
        <Link className="btn" href="/designs">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={createDesignAction} encType="multipart/form-data">
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="title">Название *</label>
              <input id="title" name="title" required />
            </div>
            <div className="form-row">
              <label htmlFor="category">Категория</label>
              <input id="category" name="category" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="base_price">Цена дизайна (UZS)</label>
              <input id="base_price" name="base_price" type="number" step="0.01" defaultValue="0" />
            </div>
            <div className="form-row">
              <label htmlFor="sort_order">Порядок</label>
              <input id="sort_order" name="sort_order" type="number" />
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="price_overrides">Переопределение цен по цветам (JSON)</label>
            <textarea id="price_overrides" name="price_overrides" rows={4} defaultValue="{}" />
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="svg_orig">SVG путь/URL</label>
              <input id="svg_orig" name="svg_orig" placeholder="/static/category/file.svg или https://..." />
            </div>
            <div className="form-row">
              <label htmlFor="preview_webp">Preview WEBP путь/URL</label>
              <input id="preview_webp" name="preview_webp" />
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="svg_file">Загрузить SVG (S3 Beget)</label>
            <input id="svg_file" name="svg_file" type="file" accept=".svg,image/svg+xml" />
          </div>

          <div className="form-row">
            <label>
              <input type="checkbox" name="active" defaultChecked style={{ width: "auto", marginRight: 8 }} /> Активен
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
