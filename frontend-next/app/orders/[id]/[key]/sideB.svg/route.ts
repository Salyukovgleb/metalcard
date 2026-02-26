import { renderOrderSideBSvg } from "@/lib/order-svg";

type Params = {
  params: Promise<{ id: string; key: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { id, key } = await params;
  const orderId = Number.parseInt(id, 10);
  const result = await renderOrderSideBSvg(orderId, key);

  return new Response(result.body, {
    status: result.status,
    headers: result.contentType
      ? {
          "Content-Type": result.contentType,
        }
      : undefined,
  });
}
