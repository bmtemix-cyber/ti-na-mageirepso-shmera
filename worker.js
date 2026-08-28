function findRecipeJsonLd(html) {
  const matches = [...html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )];

  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]);

      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item?.["@type"] === "Recipe") return item;

        if (Array.isArray(item?.["@graph"])) {
          const recipe = item["@graph"].find(
            x => x?.["@type"] === "Recipe"
          );
          if (recipe) return recipe;
        }
      }
    } catch (_) {}
  }

  return null;
}

function instructionText(x) {
  if (!x) return "";

  if (typeof x === "string") return x;

  if (Array.isArray(x)) {
    return x
      .map(v => instructionText(v))
      .filter(Boolean)
      .join("\n");
  }

  if (x.text) return x.text;

  if (x.itemListElement) {
    return instructionText(x.itemListElement);
  }

  return "";
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/test") {
      return Response.json({
        ok: true,
        message: "Το backend λειτουργεί!"
      });
    }

    if (url.pathname === "/api/recipe") {
      const recipeUrl = url.searchParams.get("url");

      if (!recipeUrl) {
        return Response.json(
          { ok: false, error: "Λείπει το url της συνταγής." },
          { status: 400 }
        );
      }

      let target;

      try {
        target = new URL(recipeUrl);
      } catch (_) {
        return Response.json(
          { ok: false, error: "Μη έγκυρο URL." },
          { status: 400 }
        );
      }

      const allowed = [
        "argiro.gr",
        "www.argiro.gr",
        "akispetretzikis.com",
        "www.akispetretzikis.com"
      ];

      if (!allowed.includes(target.hostname)) {
        return Response.json(
          { ok: false, error: "Η πηγή δεν υποστηρίζεται ακόμη." },
          { status: 400 }
        );
      }

      try {
        const r = await fetch(target.toString(), {
          headers: {
            "User-Agent": "Mozilla/5.0"
          }
        });

        if (!r.ok) {
          throw new Error("HTTP " + r.status);
        }

        const html = await r.text();
        const recipe = findRecipeJsonLd(html);

        if (!recipe) {
          return Response.json(
            { ok: false, error: "Δεν βρέθηκαν δομημένα στοιχεία συνταγής." },
            { status: 404 }
          );
        }

        const image = Array.isArray(recipe.image)
          ? recipe.image[0]
          : recipe.image?.url || recipe.image || "";

        return Response.json({
          ok: true,
          recipe: {
            name: recipe.name || "",
            image,
            ingredients: recipe.recipeIngredient || [],
            instructions: instructionText(recipe.recipeInstructions),
            servings: recipe.recipeYield || "",
            prepTime: recipe.prepTime || "",
            cookTime: recipe.cookTime || "",
            source: target.hostname,
            url: target.toString()
          }
        });
      } catch (e) {
        return Response.json(
          {
            ok: false,
            error: "Δεν μπόρεσα να διαβάσω τη συνταγή."
          },
          { status: 500 }
        );
      }
    }

    return new Response("Not found", { status: 404 });
  }
};
