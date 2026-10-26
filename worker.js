import webpush from "web-push";
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
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/reminder-setting" && request.method === "POST") {
  try {
    const body = await request.json();

    if (!body.id) {
      return Response.json(
        { ok:false, error:"Λείπουν στοιχεία." },
        { status:400 }
      );
    }

    const key = "subscription:" + body.id;
    const raw = await env.REMINDERS.get(key);

    if (!raw) {
      return Response.json(
        { ok:false, error:"Δεν βρέθηκε subscription." },
        { status:404 }
      );
    }

    const saved = JSON.parse(raw);
if(typeof body.enabled === "boolean"){
}

if(body.time){
  saved.reminderTime = body.time;
}
    saved.enabled = body.enabled;

    await env.REMINDERS.put(
      key,
      JSON.stringify(saved)
    );

    return Response.json({
      ok:true,
      enabled:saved.enabled
    });

  } catch(e) {
    return Response.json(
      {
        ok:false,
        error:"Αποτυχία αλλαγής ρύθμισης.",
        details:e.message || String(e)
      },
      { status:500 }
    );
  }
}
    if (url.pathname === "/api/mark-opened" && request.method === "POST") {
  try {
    const body = await request.json();

    if (!body.id || !body.date) {
      return Response.json(
        { ok:false, error:"Λείπουν στοιχεία." },
        { status:400 }
      );
    }

    const key="subscription:"+body.id;
    const raw=await env.REMINDERS.get(key);

    if (!raw) {
      return Response.json(
        { ok:false, error:"Δεν βρέθηκε subscription." },
        { status:404 }
      );
    }

    const saved=JSON.parse(raw);

    saved.lastOpenedDate=body.date;

    await env.REMINDERS.put(
      key,
      JSON.stringify(saved)
    );

    return Response.json({ok:true});

  } catch(e) {
    return Response.json(
      {
        ok:false,
        error:"Αποτυχία ενημέρωσης lastOpenedDate.",
        details:e.message || String(e)
      },
      {status:500}
    );
  }
}
    if (url.pathname === "/api/test-push" && request.method === "POST") {
  try {
    const body = await request.json();
    const id = body.id;

    if (!id) {
      return Response.json(
        { ok:false, error:"Λείπει το device id." },
        { status:400 }
      );
    }

    const raw = await env.REMINDERS.get("subscription:" + id);

    if (!raw) {
      return Response.json(
        { ok:false, error:"Δεν βρέθηκε push subscription." },
        { status:404 }
      );
    }

    const saved = JSON.parse(raw);

    if (!saved.subscription) {
      return Response.json(
        { ok:false, error:"Το subscription δεν είναι έγκυρο." },
        { status:400 }
      );
    }

    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );

    await webpush.sendNotification(
      saved.subscription,
      JSON.stringify({
        title:"🍳 Τι να μαγειρέψω σήμερα;",
        body:"Η δοκιμαστική ειδοποίηση λειτουργεί!",
        tag:"test-reminder"
      })
    );

    return Response.json({
      ok:true,
      message:"Η δοκιμαστική ειδοποίηση στάλθηκε."
    });

  } catch(e) {
    console.error("TEST PUSH ERROR", e);

    return Response.json(
      {
        ok:false,
        error:"Αποτυχία αποστολής push.",
        details:e.message || String(e)
      },
      { status:500 }
    );
  }
}
if (url.pathname === "/api/save-subscription" && request.method === "POST") {
  try {
    const body = await request.json();

    if (!body.subscription || !body.id) {
      return Response.json(
        { ok: false, error: "Λείπουν στοιχεία subscription." },
        { status: 400 }
      );
    }

    await env.REMINDERS.put(
      "subscription:" + body.id,
      JSON.stringify({
        subscription: body.subscription,
        lastOpenedDate: body.lastOpenedDate || "",
        enabled: true
      })
    );

    return Response.json({ ok: true });

 } catch(e){
  return Response.json(
    {
      ok:false,
      error:"Αποτυχία αποθήκευσης subscription.",
      details:e.message || String(e)
    },
    {status:500}
  );
}
}  
if (url.pathname === "/api/search-recipe") {
  const q = (url.searchParams.get("q") || "").trim();

  if (!q) {
    return Response.json(
      { ok: false, error: "Λείπει το όνομα του φαγητού." },
      { status: 400 }
    );
  }

  try {
    const searchUrl =
      "https://www.argiro.gr/?s=" + encodeURIComponent(q);

    const r = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!r.ok) throw new Error("HTTP " + r.status);

    const html = await r.text();

    const links = [
      ...html.matchAll(/href=["']([^"']*\/recipe\/[^"']+)["']/gi)
    ]
      .map(m => m[1])
      .map(x => x.startsWith("http") ? x : new URL(x, "https://www.argiro.gr").href);

    const unique = [...new Set(links)];

    if (!unique.length) {
      return Response.json({
        ok: false,
        error: "Δεν βρέθηκε ελληνική συνταγή."
      }, { status: 404 });
    }

    const recipeUrl = unique[0];

    const page = await fetch(recipeUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const recipeHtml = await page.text();
    const recipe = findRecipeJsonLd(recipeHtml);

    return Response.json({
      ok: true,
      recipe: {
        name: recipe?.name || q,
        image: Array.isArray(recipe?.image)
          ? recipe.image[0]
          : recipe?.image?.url || recipe?.image || "",
        source: "Argiro.gr",
        url: recipeUrl
      }
    });

  } catch (e) {
    return Response.json(
      { ok: false, error: "Η αναζήτηση απέτυχε." },
      { status: 500 }
    );
  }
}
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
    
if (url.pathname === "/api/read-receipt" && request.method === "POST") {
  try {
    const body = await request.json();

    if (!body.image) {
      return Response.json(
        {
          ok: false,
          error: "Δεν στάλθηκε εικόνα απόδειξης."
        },
        { status: 400 }
      );
    }

    const result = await env.AI.run(
      "@cf/moondream/moondream3.1-9B-A2B",
      {
        task: "query",
        image: body.image,
        question: `
Διάβασε προσεκτικά αυτή την ελληνική απόδειξη σούπερ μάρκετ.

Θέλω να καταγράψεις ΜΟΝΟ τα πραγματικά τρόφιμα και ποτά που βλέπεις στην απόδειξη.

Μην εφευρίσκεις προϊόντα.
Μην επαναλαμβάνεις προϊόντα.
Μην προσθέτεις προϊόντα που δεν φαίνονται.

Αγνόησε:
- εκπτώσεις
- ΦΠΑ
- σύνολα
- κάρτα / πληρωμή
- περιβαλλοντικά τέλη
- εργαλεία
- ψαλίδια
- σακούλες
- είδη σπιτιού
- αποθηκευτικά είδη
- μη τρόφιμα

Για κάθε πραγματικό τρόφιμο ή ποτό γράψε ΑΚΡΙΒΩΣ μία γραμμή έτσι:

ΚΑΘΑΡΟ ΟΝΟΜΑ|ΠΟΣΟΤΗΤΑ|ΑΚΡΙΒΕΣ ΚΕΙΜΕΝΟ ΑΠΟΔΕΙΞΗΣ

Παράδειγμα:
Μπισκότα|200 g|ΜΠΙΣ.COOK.WH/CR.200G
Σοκολάτα|100 g|ΣΟ.ΓΑΛ.ΚΟΜ.ΚΑΣ.100G

Μην γράψεις JSON.
Μην γράψεις εξηγήσεις.
Μην γράψεις τίτλο.
Μόνο τις γραμμές προϊόντων.
`,
        reasoning: false,
        stream: false,
        max_tokens: 2000,
        temperature: 0.1
      }
    );

    const text =
      typeof result?.answer === "string"
        ? result.answer.trim()
        : "";

    console.log("RECEIPT RAW ANSWER:", text);

    if (!text) {
      return Response.json(
        {
          ok: false,
          error: "Το AI δεν επέστρεψε κείμενο."
        },
        { status: 500 }
      );
    }

    const items = text
      .split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("```"))
      .map(line => {
        line = line.replace(/^[-•*]\s*/, "");

        const parts = line.split("|");

        if (parts.length < 3) {
          return null;
        }

        return {
          name: parts[0].trim(),
          quantity: parts[1].trim(),
          raw: parts.slice(2).join("|").trim()
        };
      })
      .filter(Boolean);

    if (!items.length) {
      return Response.json(
        {
          ok: false,
          error: "Το AI διάβασε την απόδειξη αλλά δεν επέστρεψε προϊόντα στη σωστή μορφή.",
          details: text.slice(0, 1500)
        },
        { status: 422 }
      );
    }

    return Response.json({
      ok: true,
      items: items
    });

  } catch (e) {
    console.error("RECEIPT ERROR", e);

    return Response.json(
      {
        ok: false,
        error: "Δεν μπόρεσα να διαβάσω την απόδειξη.",
        details: e.message || String(e)
      },
      { status: 500 }
    );
  }
}


    
     return new Response("Not found", { status: 404 });
  },

  async scheduled(controller, env, ctx) {
    const now = new Date(controller.scheduledTime);

    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Athens',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(now);

    const get = type =>
      parts.find(x => x.type === type)?.value || '';

    const today =
      get('year') + '-' +
      get('month') + '-' +
      get('day');

    const hour = get('hour');
    const minute = get('minute');

    // Στέλνουμε μόνο στις 20:30 ώρα Ελλάδας
   

    webpush.setVapidDetails(
      env.VAPID_SUBJECT,
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY
    );

    let cursor;

    do {
      const list = await env.REMINDERS.list({
        prefix: 'subscription:',
        cursor
      });

      for (const key of list.keys) {
        try {
          const raw = await env.REMINDERS.get(key.name);

          if (!raw) continue;

          const saved = JSON.parse(raw);
const currentTime=hour+':'+minute;
const reminderTime=saved.reminderTime || '20:30';

if(currentTime !== reminderTime) continue;
          if (!saved.enabled) continue;
          if (!saved.subscription) continue;

          // Αν άνοιξε σήμερα, δεν στέλνουμε ειδοποίηση
          if (saved.lastOpenedDate === today) continue;

          await webpush.sendNotification(
            saved.subscription,
            JSON.stringify({
              title: '🍳 Τι να μαγειρέψω σήμερα;',
              body: 'Μην ξεχάσεις να καταγράψεις τα σημερινά γεύματα.',
              tag: 'evening-reminder'
            })
          );

        } catch(e) {
          console.error(
            'REMINDER ERROR',
            key.name,
            e.message || e
          );
        }
      }

      cursor = list.list_complete ? undefined : list.cursor;

    } while (cursor);
  }
};
