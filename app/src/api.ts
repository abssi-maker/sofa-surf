// The Mac running the Sofa Surf backend: `uv run uvicorn server:app --host 0.0.0.0 --port 8788`.
// The Virtual Device reaches the Mac through QEMU's host alias 10.0.2.2;
// a real Fire TV Stick needs the Mac's Wi-Fi address instead.
export const BACKEND = 'http://10.0.2.2:8788';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`);
  if (!res.ok) {
    throw new Error((await res.text()) || `HTTP ${res.status}`);
  }
  return res.json();
}

// Test runs read app and page events from the backend's access log.
export const beacon = (ev: object) => {
  fetch(`${BACKEND}/health?ev=${encodeURIComponent(JSON.stringify(ev).slice(0, 1500))}`).catch(() => {});
};

// A site's name, title and share image, for the home screen's tiles.
export type Meta = {url: string; site: string; title: string; image: string | null};
export const meta = (url: string) => get<Meta>(`/meta?url=${encodeURIComponent(url)}`);

// Tier 2 of a live page: Nova refines the map the page's injected script built.
export type Refinement = {
  type: string;
  hide: number[];
  labels: Record<string, string>;
  questions: string[];
  model: string;
  simulated: boolean;
  ms: number;
};
export async function refine(url: string, outline: object): Promise<Refinement> {
  const res = await fetch(`${BACKEND}/refine`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({url, outline}),
  });
  if (!res.ok) {
    throw new Error((await res.text()) || `HTTP ${res.status}`);
  }
  return res.json();
}

// Ask this page: Nova answers from the page's own text; the backend keeps only what the page says.
export type Answer = {answer: string | null; quotes: string[]; grounded: boolean; simulated: boolean; ms: number};
export async function ask(url: string, question: string, text: string, title: string): Promise<Answer> {
  const res = await fetch(`${BACKEND}/ask`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({url, question, text, title}),
  });
  if (!res.ok) {
    throw new Error((await res.text()) || `HTTP ${res.status}`);
  }
  return res.json();
}

// Fictional sites served by the backend: the demo video is filmed on these (no real brands).
export const site = (path: string) => `${BACKEND}/sites/${path}`;

// Web images go through the backend: always a JPEG, never wider than needed.
export const img = (src: string, width = 960) =>
  `${BACKEND}/img?w=${Math.round(width)}&u=${encodeURIComponent(src)}`;
