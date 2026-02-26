import Link from "next/link";
import { notFound } from "next/navigation";
import { updateAppUserAction } from "@/app/(protected)/actions";
import { getAppUserById } from "@/lib/admin-data";

type Params = Promise<{ id: string }>;

export default async function EditUserPage(props: { params: Params }) {
  const params = await props.params;
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const user = await getAppUserById(id);
  if (!user) {
    notFound();
  }

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Редактирование пользователя #{user.id}</h1>
        <Link className="btn" href="/users">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={updateAppUserAction}>
          <input type="hidden" name="id" value={user.id} />

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="full_name">Имя *</label>
              <input id="full_name" name="full_name" defaultValue={user.fullName} required />
            </div>
            <div className="form-row">
              <label htmlFor="email">E-mail *</label>
              <input id="email" name="email" type="email" defaultValue={user.email} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="telegram_id">Telegram ID</label>
              <input id="telegram_id" name="telegram_id" type="number" defaultValue={user.telegramId ?? ""} />
            </div>
            <div className="form-row">
              <label htmlFor="new_password">Новый пароль</label>
              <input id="new_password" name="new_password" type="password" />
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="confirm_password">Повтор нового пароля</label>
            <input id="confirm_password" name="confirm_password" type="password" />
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
