export async function POST(request: Request) {
  const event = await request.json();
  await sendOrder(event.orderId);
  return new Response('ok');
}
