export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return database.projects.find(params.id);
}
