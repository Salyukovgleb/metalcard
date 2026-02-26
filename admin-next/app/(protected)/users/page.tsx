import Link from "next/link";
import { deleteAppUserAction } from "@/app/(protected)/actions";
import { listAppUsers } from "@/lib/admin-data";

function displayDate(value: string): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ru-RU", { hour12: false });
}

export default async function UsersPage() {
  const users = await listAppUsers();

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Пользователи</h1>
        <Link className="btn btn-primary" href="/users/new">
          Добавить
        </Link>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Имя</th>
              <th>E-mail</th>
              <th>Telegram ID</th>
              <th>Создан</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  Пока пусто
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>{user.telegramId ?? "—"}</td>
                  <td>{displayDate(user.createdAt)}</td>
                  <td>
                    <div className="toolbar" style={{ margin: 0 }}>
                      <Link className="btn" href={`/users/${user.id}/edit`}>
                        Ред.
                      </Link>
                      <form action={deleteAppUserAction}>
                        <input type="hidden" name="id" value={user.id} />
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
