import Link from "next/link";
import { createAppUserAction } from "@/app/(protected)/actions";

export default function NewUserPage() {
  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Новый пользователь</h1>
        <Link className="btn" href="/users">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={createAppUserAction}>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="full_name">Имя *</label>
              <input id="full_name" name="full_name" required />
            </div>
            <div className="form-row">
              <label htmlFor="email">E-mail *</label>
              <input id="email" name="email" type="email" required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="telegram_id">Telegram ID</label>
              <input id="telegram_id" name="telegram_id" type="number" />
            </div>
            <div className="form-row">
              <label htmlFor="new_password">Пароль *</label>
              <input id="new_password" name="new_password" type="password" required />
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="confirm_password">Повтор пароля *</label>
            <input id="confirm_password" name="confirm_password" type="password" required />
          </div>

          <div className="toolbar">
            <button className="btn-primary" type="submit">
              Сохранить
            </button>
            <Link className="btn" href="/users">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
