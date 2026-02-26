import Link from "next/link";
import { createOrderAction } from "@/app/(protected)/actions";
import { listPromos } from "@/lib/admin-data";

export default async function NewOrderPage() {
  const promos = await listPromos();

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Новый заказ</h1>
        <Link className="btn" href="/orders">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={createOrderAction}>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="customer_name">Имя клиента *</label>
              <input id="customer_name" name="customer_name" required />
            </div>
            <div className="form-row">
              <label htmlFor="customer_phone">Телефон *</label>
              <input id="customer_phone" name="customer_phone" required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="receive_method">Способ получения *</label>
              <select id="receive_method" name="receive_method" defaultValue="pickup">
                <option value="pickup">pickup</option>
                <option value="delivery">delivery</option>
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="promo_id">Промо</label>
              <select id="promo_id" name="promo_id" defaultValue="">
                <option value="">—</option>
                {promos.map((promo) => (
                  <option key={promo.id} value={promo.id}>
                    {promo.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="delivery_fee">Стоимость доставки</label>
              <input id="delivery_fee" name="delivery_fee" type="number" step="0.01" defaultValue="0" />
            </div>
            <div className="form-row">
              <label htmlFor="discount">Скидка</label>
              <input id="discount" name="discount" type="number" step="0.01" defaultValue="0" />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="currency">Валюта</label>
              <input id="currency" name="currency" defaultValue="UZS" />
            </div>
            <div className="form-row">
              <label htmlFor="notes">Заметки</label>
              <input id="notes" name="notes" />
            </div>
          </div>

          <div className="toolbar">
            <button className="btn-primary" type="submit">
              Создать
            </button>
            <Link className="btn" href="/orders">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
