import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAdminUser } from "@/lib/auth";
import { logoutAction } from "@/app/(protected)/actions";

export default async function ProtectedLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionAdminUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <h1>Админ-панель</h1>
        <div className="muted" style={{ color: "rgba(255,255,255,0.8)", marginBottom: 12 }}>
          {user.fullName}
        </div>

        <nav className="nav">
          <Link href="/">Главная</Link>
          <Link href="/designs">Принты</Link>
          <Link href="/colors">Цвета</Link>
          <Link href="/promos">Промо</Link>
          <Link href="/users">Пользователи</Link>
          <Link href="/orders">Заказы</Link>
          <Link href="/payments">Платежи</Link>
          <Link href="/analytics">Аналитика</Link>
        </nav>

        <form className="logout-form" action={logoutAction}>
          <button type="submit">Выйти</button>
        </form>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
