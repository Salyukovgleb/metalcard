import Link from "next/link";
import { deletePromoAction } from "@/app/(protected)/actions";
import { listPromos } from "@/lib/admin-data";

const fmt = new Intl.NumberFormat("ru-RU");

function toDisplayDate(value: string): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ru-RU", { hour12: false });
}

export default async function PromosPage() {
  const promos = await listPromos();

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Промо</h1>
        <Link className="btn btn-primary" href="/promos/new">
          Добавить
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Код</th>
              <th>Активен</th>
              <th>Фикс. цена</th>
              <th>Принт</th>
              <th>Цвет</th>
              <th>Период</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {promos.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">
                  Пока пусто
                </td>
              </tr>
            ) : (
              promos.map((promo) => (
                <tr key={promo.id}>
                  <td>{promo.id}</td>
                  <td>{promo.code}</td>
                  <td>{promo.active ? <span className="ok-badge">Да</span> : <span className="warn-badge">Нет</span>}</td>
                  <td>{promo.fixedPrice === null ? "—" : `${fmt.format(Math.round(promo.fixedPrice))} UZS`}</td>
                  <td>{promo.designTitle || "—"}</td>
                  <td>{promo.colorTitle || "—"}</td>
                  <td>
                    {toDisplayDate(promo.startsAt)} - {toDisplayDate(promo.endsAt)}
                  </td>
                  <td>
                    <div className="toolbar" style={{ margin: 0 }}>
                      <Link className="btn" href={`/promos/${promo.id}/edit`}>
                        Ред.
                      </Link>
                      <form action={deletePromoAction}>
                        <input type="hidden" name="id" value={promo.id} />
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
      </div>
    </>
  );
}
