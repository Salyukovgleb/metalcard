import { loginAction } from "@/app/login/actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage(props: { searchParams: SearchParams }) {
  const searchParams = await props.searchParams;
  const hasError = Boolean(searchParams.error);

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 style={{ marginTop: 0 }}>Вход в админку</h1>
        <form action={loginAction}>
          <div className="form-row">
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" required />
          </div>
          <div className="form-row">
            <label htmlFor="password">Пароль</label>
            <input id="password" name="password" type="password" required />
          </div>
          <button className="btn-primary" type="submit">
            Войти
          </button>
          {hasError ? <div className="error">Неверный логин или пароль.</div> : null}
        </form>
      </div>
    </div>
  );
}
