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
        { ok:false, error:"Δεν στάλθηκε εικόνα απόδειξης." },
        { status:400 }
      );
    }

// ---------------------------------------------------
// 1ο ΒΗΜΑ: OCR - διαβάζουμε μόνο το κείμενο
// ---------------------------------------------------

const ocrResult = await env.AI.run(
  "@cf/moondream/moondream3.1-9B-A2B",
  {
    task: "query",
    image: body.image,
    question:
      "Transcribe ALL text visible in this supermarket receipt image. " +
      "Preserve each receipt line on a separate line. " +
      "Do not explain anything. Return only the text printed on the receipt.",
    reasoning: false,
    stream: false,
    temperature: 0
  }
);

const ocrInner =
  ocrResult && ocrResult.result !== undefined
    ? ocrResult.result
    : ocrResult;

let receiptText = "";

if (typeof ocrInner === "string") {
  receiptText = ocrInner;

} else if (
  ocrInner &&
  typeof ocrInner.answer === "string"
) {
  receiptText = ocrInner.answer;

} else if (
  ocrInner &&
  typeof ocrInner.response === "string"
) {
  receiptText = ocrInner.response;
}

receiptText = String(receiptText || "").trim();

if (!receiptText) {
  return Response.json(
    {
      ok:false,
      error:"Το OCR δεν μπόρεσε να διαβάσει την απόδειξη."
    },
    {status:422}
  );
}


// ---------------------------------------------------
// 2ο ΒΗΜΑ: βρίσκουμε τρόφιμα μέσα στο OCR κείμενο
// ---------------------------------------------------

const parseResult = await env.AI.run(
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
  {
    prompt: `
Παρακάτω είναι OCR κείμενο από ελληνική απόδειξη σούπερ μάρκετ.

Κράτησε ΜΟΝΟ τρόφιμα και ποτά.

Αγνόησε:
- εκπτώσεις
- τιμές χωρίς προϊόν
- ΦΠΑ
- σύνολα
- πληρωμές
- σακούλες
- ψαλίδια
- εργαλεία
- πανιά
- αποθηκευτικά είδη
- είδη σπιτιού
- περιβαλλοντικά τέλη

Μην εφευρίσκεις προϊόντα.

Για κάθε προϊόν χρησιμοποίησε πραγματική γραμμή από το OCR.

Επέστρεψε ΜΟΝΟ έγκυρο JSON:

{
  "products": [
    {
      "name": "κατανοητό ελληνικό όνομα",
      "quantity": "ποσότητα αν φαίνεται",
      "source_text": "πραγματική γραμμή OCR"
    }
  ]
}

OCR ΑΠΟΔΕΙΞΗΣ:

${receiptText}
`,
    max_tokens: 1800,
    temperature: 0
  }
);

const parseInner =
  parseResult && parseResult.result !== undefined
    ? parseResult.result
    : parseResult;

let parseText = "";

if (typeof parseInner === "string") {
  parseText = parseInner;

} else if (
  parseInner &&
  typeof parseInner.response === "string"
) {
  parseText = parseInner.response;

} else if (
  parseInner &&
  typeof parseInner.answer === "string"
) {
  parseText = parseInner.answer;
}

parseText = String(parseText || "")
  .replace(/^```json\s*/i,"")
  .replace(/^```\s*/i,"")
  .replace(/```$/i,"")
  .trim();

let parsed;

try {

  parsed = JSON.parse(parseText);

} catch (_) {

  const match = parseText.match(/\{[\s\S]*\}/);

  if (!match) {
    return Response.json(
      {
        ok:false,
        error:"Το OCR διάβασε την απόδειξη αλλά δεν μπόρεσα να αναγνωρίσω τα προϊόντα.",
        details:receiptText.slice(0,1500)
      },
      {status:422}
    );
  }

  parsed = JSON.parse(match[0]);
}

let products =
  Array.isArray(parsed.products)
    ? parsed.products
    : [];


    const seen = new Set();

    const items = products
      .map(p => ({
        name: String(p.name || p.title || "").trim(),

        quantity: String(
          p.quantity ||
          p.amount ||
          p.weight ||
          ""
        ).trim(),

        raw: String(
          p.source_text ||
          p.raw ||
          p.original_text ||
          ""
        ).trim()
      }))

      .filter(p => p.name)

      .filter(p => {
        const key =
          p.name.toLowerCase() +
          "|" +
          p.quantity.toLowerCase() +
          "|" +
          p.raw.toLowerCase();

        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      });

    return Response.json({
      ok:true,
      items:items
    });

  } catch(e) {
    console.error("RECEIPT ERROR", e);

    return Response.json(
      {
        ok:false,
        error:"Δεν μπόρεσα να διαβάσω την απόδειξη.",
        details:e.message || String(e)
      },
      { status:500 }
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
