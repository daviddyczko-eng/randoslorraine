export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Route API
    if (url.pathname === "/api/rando") {
      try {
        const data = await getRandoData(); // ta fonction interne

        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Erreur interne Worker" }), {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    }

    // Fallback : fichiers statiques
    return new Response("Not found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
};

// Exemple de fonction interne
async function getRandoData() {
  return {
    date: "2024-07-20",
    lieu: "Lorraine",
    gps: "48.6921, 6.1844",
  };
}
