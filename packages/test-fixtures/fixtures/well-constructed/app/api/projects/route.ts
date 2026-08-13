import { z } from 'zod';
const input=z.object({name:z.string().min(1).max(80)});
export async function POST(request:Request){const session=await requireSession();const data=input.parse(await request.json());return database.projects.create({data:{...data,owner_id:session.user.id}})}
