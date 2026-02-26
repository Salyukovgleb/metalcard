import Link from "next/link";
import { createColorAction } from "@/app/(protected)/actions";

export default function NewColorPage() {
  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Новый цвет</h1>
        <Link className="btn" href="/colors">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={createColorAction}>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="code">Код *</label>
              <input id="code" name="code" required />
            </div>
            <div className="form-row">
              <label htmlFor="title">Название *</label>
              <input id="title" name="title" required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="markup">Цена (UZS)</label>
              <input id="markup" name="markup" type="number" step="0.01" defaultValue="0" />
            </div>
            <div className="form-row">
              <label htmlFor="params">Параметры (JSON)</label>
              <textarea id="params" name="params" rows={3} defaultValue="{}" />
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
            <Link className="btn" href="/colors">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
