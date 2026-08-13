export async function POST(request: Request) {
  const form = await request.formData();
  await bucket.save(form.get('file'));
  return new Response('stored');
}
