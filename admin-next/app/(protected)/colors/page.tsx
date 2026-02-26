import Link from "next/link";
import { deleteColorAction } from "@/app/(protected)/actions";
import { listColors } from "@/lib/admin-data";

const fmt = new Intl.NumberFormat("ru-RU");

export default async function ColorsPage() {
  const colors = await listColors();

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Цвета</h1>
        <Link className="btn btn-primary" href="/colors/new">
          Добавить
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Код</th>
              <th>Название</th>
              <th>Цена</th>
              <th>Активен</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {colors.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Пока пусто
                </td>
              </tr>
            ) : (
              colors.map((color) => (
                <tr key={color.id}>
                  <td>{color.id}</td>
                  <td>{color.code}</td>
                  <td>{color.title}</td>
                  <td>{fmt.format(Math.round(color.markup))} UZS</td>
                  <td>{color.active ? <span className="ok-badge">Да</span> : <span className="warn-badge">Нет</span>}</td>
                  <td>
                    <div className="toolbar" style={{ margin: 0 }}>
                      <Link className="btn" href={`/colors/${color.id}/edit`}>
                        Ред.
                      </Link>
                      <form action={deleteColorAction}>
                        <input type="hidden" name="id" value={color.id} />
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
