// Cloudflare Worker — Wankun Club
// Sirve: Ventas, Flex Meli (Sheet original) + Stock, Meli, Precios (Sheet nuevo)

const SHEET_VENTAS_ID = "12hLk00E3eT9ORZyrk-gHw7dQgUhGJhA1iSbLn5genVI";
const SHEET_STOCK_ID  = "12tLzcCBqVcYRQcXJvqgoXnLl6sBUMdaqRxD1pjQt6Lo";

const GID_MAP = {
  // Sheet Ventas original
  "Ventas":    "1367093791",
  "Flex%20meli": "1280177385",
  // Sheet Stock nuevo
  "Stock":         "0",
  "Meli":          "347057047",
  "Precios":       "545005826",
  "Movimientos":   "1632731645",
};

const STOCK_SHEETS = ["Stock", "Meli", "Precios", "Movimientos"];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const sheet = url.searchParams.get("sheet") || "Ventas";

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": "text/csv; charset=utf-8",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    const isStock = STOCK_SHEETS.includes(sheet);
    const spreadsheetId = isStock ? SHEET_STOCK_ID : SHEET_VENTAS_ID;
    const gid = GID_MAP[sheet] || GID_MAP["Ventas"];

    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;

    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csv = await res.text();
      return new Response(csv, { headers });
    } catch (e) {
      return new Response(`Error: ${e.message}`, { status: 500, headers });
    }
  }
};
