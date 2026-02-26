import Link from "next/link";
import { notFound } from "next/navigation";
import { updateColorAction } from "@/app/(protected)/actions";
import { getColorById } from "@/lib/admin-data";

type Params = Promise<{ id: string }>;

export default async function EditColorPage(props: { params: Params }) {
  const params = await props.params;
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const color = await getColorById(id);
  if (!color) {
    notFound();
  }

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Редактирование цвета #{color.id}</h1>
        <Link className="btn" href="/colors">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={updateColorAction}>
          <input type="hidden" name="id" value={color.id} />

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="code">Код *</label>
              <input id="code" name="code" defaultValue={color.code} required />
            </div>
            <div className="form-row">
              <label htmlFor="title">Название *</label>
              <input id="title" name="title" defaultValue={color.title} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="markup">Цена (UZS)</label>
              <input id="markup" name="markup" type="number" step="0.01" defaultValue={color.markup} />
            </div>
            <div className="form-row">
              <label htmlFor="params">Параметры (JSON)</label>
              <textarea id="params" name="params" rows={3} defaultValue={JSON.stringify(color.params ?? {}, null, 2)} />
            </div>
          </div>

          <div className="form-row">
            <label>
              <input
                type="checkbox"
                name="active"
                defaultChecked={color.active}
                style={{ width: "auto", marginRight: 8 }}
              />
              Активен
            </label>
          </div>

          <div className="toolbar">
            <button className="btn-primary" type="submit">
              Сохранить
            </button>
            <Link className="btn" href="/colors">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
