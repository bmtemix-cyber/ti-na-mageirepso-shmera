export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/test") {
      return Response.json({
        ok: true,
        message: "Το backend λειτουργεί!"
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
