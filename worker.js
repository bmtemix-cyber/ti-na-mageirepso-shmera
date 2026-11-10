import webpush from "web-push";
function looksLikeFood(sourceText) {

  const t=(sourceText || '').toUpperCase();

  const NON_FOOD=[
    'ΨΑΛΙΔΙ',
    'ΣΑΚΟΥΛ',
    'ΠΑΝΙΑ',
    'ΘΗΚΗ',
    'ΑΠΟΘΗΚ',
    'ΠΡΟΣΘΗΚ',
    'ΠΕΡΙΒΑΝ',
    'ΤΕΛΟΣ',
    'ΕΚΠΤΩΣ',
    'ΣΥΝΟΛΟ',
    'ΚΑΡΤΑ',
    'ΦΠΑ',
    'ΠΛΗΡΩΜ',
    'ΑΠΟΔΕΙΞΗ'
  ];

  if(NON_FOOD.some(x=>t.includes(x))){
    return false;
  }

  return true;
}

function normalizeFoodName(sourceText, fallbackName) {
  const t = (sourceText || '').toUpperCase();

  if (t.includes('CHICK')) return 'Κοτόπουλο στήθος';
  if (t.includes('ΓΥΡΟΣ') && t.includes('ΧΟΙΡ')) return 'Γύρος χοιρινός';
  if (t.includes('ΣΥΚΩΤΙ') && t.includes('ΜΟΣΧ')) return 'Συκώτι μοσχαρίσιο';
  if (t.includes('ΡΥΖΟΓΑΛ')) return 'Ρυζόγαλο';
  if (t.includes('TEA') || t.includes('LEMON')) return 'Τσάι λεμόνι';
  if (t.includes('WH/CR')) return 'Μπισκότα με λευκή κρέμα';
  if (t.includes('SOFT')) return 'Μπισκότα μαλακά';
  if (t.includes('ΓΑΛ')) return 'Γαλακτοκομικό';
  if (t.includes('ΤΟΡΤ')) return 'Τορτίγια ολικής';
  if (t.includes('ΛΟΥΚΟΥΜ')) return 'Λουκουμάδες';
  if (t.includes('ΠΟΛΥΣΠΟΡ')) return 'Ψωμί πολύσπορο';

  return fallbackName || 'Τρόφιμο';
}

function dedupeProducts(products) {
  const seen = new Set();

  return products.filter(p => {
    const key =
      (p.name || '').trim().toUpperCase() + '|' +
      (p.quantity || '').trim().toUpperCase() + '|' +
      (p.source_text || '').trim().toUpperCase();

    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
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
    if (url.pathname === "/api/meal-image-test") {
  try {
    const assetUrl = new URL(
      "/images/makaronia-saltsa-tyri.png",
      request.url
    );

    const r = await env.ASSETS.fetch(
      new Request(assetUrl)
    );

    return Response.json({
      ok: r.ok,
      status: r.status,
      contentType: r.headers.get("content-type"),
      contentLength: r.headers.get("content-length"),
      url: assetUrl.href
    });

  } catch (e) {
    return Response.json({
      ok: false,
      error: String(e)
    }, { status: 500 });
  }
}
if (url.pathname === "/api/meal-image") {

  const file = url.searchParams.get("file");

  const allowed = new Set([
    "fakes-kokkinistes.jpg",
    "makaronia-saltsa-tyri.png",
    "makaronia-laxanika.png"
  ]);

  if (!file || !allowed.has(file)) {
    return new Response("Not found", {
      status: 404
    });
  }

  const assetUrl = new URL(
    "/images/" + file,
    request.url
  );

  return env.ASSETS.fetch(
    new Request(assetUrl.toString(), {
      method: "GET"
    })
  );
}



    const assetResponse =
      await env.ASSETS.fetch(
        new Request(assetUrl)
      );

    if (!assetResponse.ok) {
      return new Response(
        "Image not found",
        { status: 404 }
      );
    }

    return assetResponse;

  } catch (e) {

    console.error("MEAL IMAGE ERROR", e);

    return new Response(
      "Image error",
      { status: 500 }
    );
  }


  const imageUrl =
    "https://raw.githubusercontent.com/bmtemix-cyber/ti-na-mageirepso-shmera/main/images/" +
    file;

  try {

    const r = await fetch(imageUrl);

    if (!r.ok) {
      return new Response("Image not found", { status: 404 });
    }

    return new Response(r.body, {
      headers: {
        "Content-Type":
          r.headers.get("Content-Type") || "image/png",
        "Cache-Control":
          "public, max-age=86400"
      }
    });

  } catch (e) {

    return new Response(
      "Image error",
      { status: 502 }
    );

  }
}
    if (url.pathname === "/api/generate-recipe" && request.method === "POST") {
      try {
        const body = await request.json();
        const meal = String(body.meal || "").trim().slice(0,120);
        if (!meal) return Response.json({ok:false,error:"Λείπει το φαγητό."},{status:400});
        if (!env.AI) return Response.json({ok:false,error:"Δεν είναι συνδεδεμένο το AI."},{status:503});
        const pantry = Array.isArray(body.pantry) ? body.pantry.slice(0,80).map(x=>({name:String(x.name||'').slice(0,90),qty:String(x.qty||'').slice(0,40),exp:String(x.exp||'').slice(0,20)})) : [];
        const family = body.family && typeof body.family==='object' ? body.family : {};
        const servings = Math.max(1,Math.min(12,Number(family.cookFor)||4));
        const prompt = `Δημιούργησε πρωτότυπη, ρεαλιστική ελληνική/μεσογειακή συνταγή για το φαγητό: ${meal}.
Μερίδες: ${servings}. Αποθήκη (μόνο όσα δήλωσε ο χρήστης): ${JSON.stringify(pantry)}.
Προτιμήσεις: ${String(family.favorites||'').slice(0,350)}. Αποφυγές: ${String(family.dislikes||'').slice(0,350)}.
Στόχος: ισορροπημένη υγιεινή διατροφή, λογικές ποσότητες, ασφαλές ψήσιμο. Μην αλλάξεις το ζητούμενο φαγητό.
Προτίμησε τα διαθέσιμα υλικά, αλλά μη θεωρείς ότι υπάρχουν άλλα υλικά. Η αποθήκη είναι πληροφοριακή και μπορεί να έχει ασαφείς ποσότητες.
Απάντησε ΜΟΝΟ με έγκυρο JSON χωρίς markdown, με ακριβώς τα πεδία:
{"name":"...","servings":4,"minutes":45,"ingredients":[{"name":"μακαρόνια","quantity":"500 γρ."}],"steps":["1. ...","2. ..."],"tip":"..."}.
Δώσε 5-14 υλικά και 4-9 σαφή βήματα. Μη δίνεις υποσχέσεις ιατρικού χαρακτήρα.`;
        const result = await env.AI.run("@cf/google/gemma-4-26b-a4b-it", {
          messages:[{role:"system",content:"Είσαι έμπειρος Έλληνας μάγειρας. Επιστρέφεις μόνο έγκυρο JSON με πρακτικές ασφαλείς συνταγές."},{role:"user",content:prompt}],
          stream:false, temperature:0.35, max_completion_tokens:1800,
          chat_template_kwargs:{enable_thinking:false}
        });
        let raw = typeof result==='string'?result:result?.response||result?.result?.response||result?.result||result?.choices?.[0]?.message?.content||'';
        if (typeof raw!=='string') raw=JSON.stringify(raw);
        raw=raw.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim();
        let recipe;
        try {recipe=JSON.parse(raw)} catch(e) {const match=raw.match(/\{[\s\S]*\}/);if(!match)throw Error('Το AI δεν επέστρεψε συνταγή σε JSON.');recipe=JSON.parse(match[0]);}
        if (!recipe || !Array.isArray(recipe.ingredients) || !recipe.ingredients.length || !Array.isArray(recipe.steps) || !recipe.steps.length) throw Error('Η συνταγή δεν είναι πλήρης.');
        const clean = {name:String(recipe.name||meal).slice(0,150),servings:Number(recipe.servings)||servings,minutes:Number(recipe.minutes)||null,
          ingredients:recipe.ingredients.slice(0,25).map(x=>({name:String(x?.name||'').slice(0,120),quantity:String(x?.quantity||'').slice(0,60)})).filter(x=>x.name),
          steps:recipe.steps.slice(0,15).map(x=>String(x).slice(0,600)),tip:String(recipe.tip||'').slice(0,500)};
        return Response.json({ok:true,recipe:clean});
      } catch(e) {console.error('GENERATE RECIPE',e);return Response.json({ok:false,error:'Δεν μπόρεσα να δημιουργήσω συνταγή. Δοκίμασε ξανά.'},{status:502});}
    }
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
const ogImageMatch =
  recipeHtml.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  ) ||
  recipeHtml.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
  );

const ogImage =
  ogImageMatch
    ? ogImageMatch[1]
    : null;

let recipeImage = null;

if(Array.isArray(recipe?.image)){
  recipeImage = recipe.image[recipe.image.length-1];
}else if(typeof recipe?.image === 'string'){
  recipeImage = recipe.image;
}else if(recipe?.image && typeof recipe.image === 'object'){
  recipeImage =
    recipe.image.contentUrl ||
    recipe.image.url ||
    null;
}

const bestImage =
  ogImage ||
  recipeImage ||
  null;
    return Response.json({
      ok: true,
      recipe: {
        name: recipe?.name || q,
        image: bestImage || "",
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
          ok:false,
          error:"Δεν στάλθηκε εικόνα απόδειξης."
        },
        {status:400}
      );
    }

  const result = await env.AI.run(
  "@cf/google/gemma-4-26b-a4b-it",
  {
    messages: [
      {
        role: "system",
        content:
          "You accurately read supermarket receipts. " +
          "Never invent products. " +
          "Only extract products actually visible in the image."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `
Διάβασε αυτή την ελληνική απόδειξη σούπερ μάρκετ.

Βρες ΜΟΝΟ τρόφιμα και ποτά που εμφανίζονται πραγματικά στην εικόνα.

Αγνόησε:
- εκπτώσεις
- ΦΠΑ
- σύνολα
- πληρωμές
- περιβαλλοντικά τέλη
- ψαλίδια
- εργαλεία
- πανιά
- σακούλες
- είδη καθαρισμού
- είδη αποθήκευσης
- άλλα μη τρόφιμα

Για κάθε προϊόν θέλω:

name = το πραγματικό, κατανοητό ελληνικό όνομα του προϊόντος.
Μην αντιγράφεις μηχανικά τις συντομογραφίες της απόδειξης.
Προσπάθησε να επεκτείνεις προφανείς ελληνικές συντομογραφίες.

Παραδείγματα λογικής:
ΚΕΦΑΛ. ΑΓΕΛ. ΤΥΡ. -> Κεφαλογραβιέρα αγελαδινή
ΣΥΚΩΤΙ ΜΟΣΧΑΡ. -> Συκώτι μοσχαρίσιο
ΑΡΤ. ΠΟΛΥΣΠΟΡΟ -> Ψωμί πολύσπορο

Αν όμως δεν είσαι αρκετά βέβαιος για την πλήρη ονομασία,
χρησιμοποίησε μια ασφαλή γενικότερη ονομασία, π.χ. "Αγελαδινό τυρί",
και ΜΗΝ εφευρίσκεις συγκεκριμένο προϊόν.

quantity = ποσότητα ή βάρος αν φαίνεται

source_text = η ακριβής πραγματική γραμμή της απόδειξης
Απάντησε μόνο με JSON:

{
  "products": [
    {
      "name": "...",
      "quantity": "...",
      "source_text": "..."
    }
  ]
}

Μην γράψεις εξηγήσεις.
Μην εφευρίσκεις προϊόντα.
`
          },
          {
            type: "image_url",
            image_url: {
              url: body.image
            }
          }
        ]
      }
    ],

    stream: false,
    temperature: 0,
    max_completion_tokens: 1500,

    chat_template_kwargs: {
      enable_thinking: false
    }
  },
  {
    rejectIfBusy: true
  }
);

    let text = "";

    if (typeof result === "string") {
      text = result;

    } else if (
      result &&
      typeof result.response === "string"
    ) {
      text = result.response;

    } else if (
      result &&
      typeof result.result === "string"
    ) {
      text = result.result;

    } else if (
      result &&
      result.result &&
      typeof result.result.response === "string"
    ) {
      text = result.result.response;

    } else if (
      result &&
      Array.isArray(result.choices) &&
      result.choices[0]?.message?.content
    ) {
      text = result.choices[0].message.content;
    }

    text = String(text || "")
      .replace(/^```json\s*/i,"")
      .replace(/^```\s*/i,"")
      .replace(/```$/i,"")
      .trim();

    if (!text) {
      return Response.json(
        {
          ok:false,
          error:"Το AI δεν επέστρεψε αποτέλεσμα.",
          details:JSON.stringify(result).slice(0,1500)
        },
        {status:422}
      );
    }

    let parsed;

    try {
      parsed = JSON.parse(text);

    } catch (_) {

      const match = text.match(/\{[\s\S]*\}/);

      if (!match) {
        return Response.json(
          {
            ok:false,
            error:"Το AI διάβασε την απόδειξη αλλά δεν επέστρεψε σωστό JSON.",
            details:text.slice(0,1500)
          },
          {status:422}
        );
      }

      parsed = JSON.parse(match[0]);
    }

  let products = Array.isArray(parsed?.products)
  ? parsed.products
  : [];

products = products
  .map(p => ({
    name: (p.name || '').trim(),
    quantity: (p.quantity || '').trim(),
    source_text: (p.source_text || '').trim()
  }))
  .filter(p => p.source_text)
  .filter(p => looksLikeFood(p.source_text))
  .map(p => ({
    ...p,
    name: normalizeFoodName(p.source_text, p.name)
  }));

products = dedupeProducts(products);


    const seen = new Set();

    const items = products
      .map(p => ({
        name:String(p.name || "").trim(),
        quantity:String(p.quantity || "").trim(),
        raw:String(
          p.source_text ||
          p.raw ||
          ""
        ).trim()
      }))
      .filter(p => p.name)
      .filter(p => {

        const key =
          (
            p.name +
            "|" +
            p.quantity +
            "|" +
            p.raw
          ).toLowerCase();

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });

  return Response.json({
  ok: true,
  items: items
});

  } catch(e) {

    console.error("RECEIPT ERROR",e);

    return Response.json(
      {
        ok:false,
        error:"Δεν μπόρεσα να διαβάσω την απόδειξη.",
        details:e.message || String(e)
      },
      {status:500}
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
