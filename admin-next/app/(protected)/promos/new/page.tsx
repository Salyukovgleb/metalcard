import Link from "next/link";
import { createPromoAction } from "@/app/(protected)/actions";
import { listActiveColorOptions, listActiveDesignOptions } from "@/lib/admin-data";

export default async function NewPromoPage() {
  const [designs, colors] = await Promise.all([listActiveDesignOptions(), listActiveColorOptions()]);

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Новый промо-код</h1>
        <Link className="btn" href="/promos">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={createPromoAction}>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="code">Код *</label>
              <input id="code" name="code" required />
            </div>
            <div className="form-row">
              <label htmlFor="fixed_price">Фиксированная цена (UZS)</label>
              <input id="fixed_price" name="fixed_price" type="number" step="0.01" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="design_id">Принт</label>
              <select id="design_id" name="design_id" defaultValue="">
                <option value="">—</option>
                {designs.map((design) => (
                  <option key={design.id} value={design.id}>
                    #{design.id} {design.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="color_id">Цвет</label>
              <select id="color_id" name="color_id" defaultValue="">
                <option value="">—</option>
                {colors.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.code} - {color.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="starts_at">Начало</label>
              <input id="starts_at" name="starts_at" type="datetime-local" />
            </div>
            <div className="form-row">
              <label htmlFor="ends_at">Окончание</label>
              <input id="ends_at" name="ends_at" type="datetime-local" />
            </div>
          </div>

          <div className="form-row">
            <label>
              <input type="checkbox" name="active" defaultChecked style={{ width: "auto", marginRight: 8 }} />
              Активен
            </label>
          </div>

          <div className="toolbar">
            <button className="btn-primary" type="submit">
              Сохранить
            </button>
            <Link className="btn" href="/promos">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
