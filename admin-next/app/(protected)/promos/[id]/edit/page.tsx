import Link from "next/link";
import { notFound } from "next/navigation";
import { updatePromoAction } from "@/app/(protected)/actions";
import { getPromoById, listActiveColorOptions, listActiveDesignOptions } from "@/lib/admin-data";

type Params = Promise<{ id: string }>;

function toDateTimeLocal(value: string): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default async function EditPromoPage(props: { params: Params }) {
  const params = await props.params;
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const [promo, designs, colors] = await Promise.all([getPromoById(id), listActiveDesignOptions(), listActiveColorOptions()]);
  if (!promo) {
    notFound();
  }

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Редактирование промо #{promo.id}</h1>
        <Link className="btn" href="/promos">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={updatePromoAction}>
          <input type="hidden" name="id" value={promo.id} />

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="code">Код *</label>
              <input id="code" name="code" defaultValue={promo.code} required />
            </div>
            <div className="form-row">
              <label htmlFor="fixed_price">Фиксированная цена (UZS)</label>
              <input id="fixed_price" name="fixed_price" type="number" step="0.01" defaultValue={promo.fixedPrice ?? ""} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="design_id">Принт</label>
              <select id="design_id" name="design_id" defaultValue={String(promo.designId ?? "")}>
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
              <select id="color_id" name="color_id" defaultValue={String(promo.colorId ?? "")}>
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
              <input id="starts_at" name="starts_at" type="datetime-local" defaultValue={toDateTimeLocal(promo.startsAt)} />
            </div>
            <div className="form-row">
              <label htmlFor="ends_at">Окончание</label>
              <input id="ends_at" name="ends_at" type="datetime-local" defaultValue={toDateTimeLocal(promo.endsAt)} />
            </div>
          </div>

          <div className="form-row">
            <label>
              <input
                type="checkbox"
                name="active"
                defaultChecked={promo.active}
                style={{ width: "auto", marginRight: 8 }}
              />
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
