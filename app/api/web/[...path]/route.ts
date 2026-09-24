import { proxyToPlutus } from '../proxy';

type Params = { params: Promise<{ path: string[] }> };

async function handle(request: Request, { params }: Params): Promise<Response> {
  const { path } = await params;
  return proxyToPlutus(request, path, process.env.PLUTUS_API_URL);
}

export { handle as GET, handle as POST, handle as PATCH, handle as PUT, handle as DELETE };
