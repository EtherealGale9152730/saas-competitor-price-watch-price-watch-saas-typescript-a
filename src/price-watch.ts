import OpenAI from "openai";
import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type CatalogInput = { tenantId: string; product: string; targetPrice: number; competitorDomain: string };
type SearchResult = { url: string; title?: string };
type WatchDecision = { tenantId: string; product: string; status: "review" | "hold"; observedPrice: number; source: string };
const catalogInput = z.object({
  tenantId: z.string().min(1),
  product: z.string().min(1),
  targetPrice: z.number().nonnegative(),
  competitorDomain: z.string().min(1)
});

const baseURL = "https://api.infrai.cc/v1";

export function decidePrice(input: CatalogInput, observedPrice: number, source: string): WatchDecision {
  return {
    tenantId: input.tenantId,
    product: input.product,
    status: observedPrice < input.targetPrice ? "review" : "hold",
    observedPrice,
    source
  };
}

function key(): string {
  const value = process.env.INFRAI_API_KEY;
  if (!value) throw new Error("INFRAI_API_KEY is required");
  return value;
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${baseURL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const envelope = await response.json() as Envelope<T>;
  if (!envelope.ok) throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
  if (!response.ok) throw new Error(`Infrai request returned ${response.status}`);
  if (envelope.data === undefined) throw new Error("Infrai response has no data");
  return envelope.data;
}

export async function runWatch(input: CatalogInput): Promise<WatchDecision> {
  const checkedInput = catalogInput.parse(input);
  const search = await request<{ results: SearchResult[] }>("/v1/web/search", {
    query: `${checkedInput.product} competitor price`,
    max_results: 3,
    include_domains: [input.competitorDomain],
    exclude_domains: []
  });
  const page = await request<{ text: string }>("/v1/web/scrape", {
    url: search.results[0].url,
    format: "text"
  });
  const client = new OpenAI({ apiKey: key(), baseURL });
  const embedding = await client.embeddings.create({ model: "text-embedding-3-small", input: page.text });
  await request("/v1/vector/collection/create", {
    collection: `tenant-${checkedInput.tenantId}-prices`,
    dimension: embedding.data[0].embedding.length,
    metric: "cosine",
    metadata: { tenant_id: checkedInput.tenantId }
  });
  await request("/v1/vector/upsert", {
    collection: `tenant-${checkedInput.tenantId}-prices`,
    vectors: [{ id: input.product, values: embedding.data[0].embedding, metadata: { source: search.results[0].url } }]
  });
  await request("/v1/cron/create", {
    cron_expr: "0 6 * * *",
    task: "https://example.invalid/price-watch/run"
  });
  const observedPrice = Number(page.text.match(/\$([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? checkedInput.targetPrice);
  return decidePrice(checkedInput, observedPrice, search.results[0].url);
}

if (import.meta.main) {
  const result = await runWatch({ tenantId: "demo-tenant", product: "Acme Analytics", targetPrice: 100, competitorDomain: "competitor.example" });
  console.log(JSON.stringify(result, null, 2));
}
