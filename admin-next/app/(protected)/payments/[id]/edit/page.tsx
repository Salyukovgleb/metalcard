import Link from "next/link";
import { notFound } from "next/navigation";
import { updatePaymentAction } from "@/app/(protected)/actions";
import { getPaymentById } from "@/lib/admin-data";

type Params = Promise<{ id: string }>;

const PROVIDERS = ["payme", "click", "cash"];
const STATUSES = ["pending", "succeeded", "failed", "canceled"];

export default async function EditPaymentPage(props: { params: Params }) {
  const params = await props.params;
  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    notFound();
  }

  const payment = await getPaymentById(id);
  if (!payment) {
    notFound();
  }

  return (
    <>
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <h1 style={{ margin: 0 }}>Редактирование платежа #{payment.id}</h1>
        <Link className="btn" href="/payments">
          Назад
        </Link>
      </div>

      <div className="card">
        <form action={updatePaymentAction}>
          <input type="hidden" name="id" value={payment.id} />

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="order_id">Order ID *</label>
              <input id="order_id" name="order_id" type="number" defaultValue={payment.orderId} required />
            </div>
            <div className="form-row">
              <label htmlFor="amount">Сумма *</label>
              <input id="amount" name="amount" type="number" step="0.01" defaultValue={payment.amount} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="provider">Провайдер *</label>
              <select id="provider" name="provider" defaultValue={payment.provider}>
                {PROVIDERS.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <label htmlFor="status">Статус *</label>
              <select id="status" name="status" defaultValue={payment.status}>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="currency">Валюта</label>
              <input id="currency" name="currency" defaultValue={payment.currency} />
            </div>
            <div className="form-row">
              <label htmlFor="provider_invoice_id">Invoice ID</label>
              <input id="provider_invoice_id" name="provider_invoice_id" defaultValue={payment.providerInvoiceId} />
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="return_url">Return URL</label>
            <input id="return_url" name="return_url" defaultValue={payment.returnUrl} />
          </div>

          <div className="toolbar">
            <button className="btn-primary" type="submit">
              Сохранить
            </button>
            <Link className="btn" href="/payments">
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
