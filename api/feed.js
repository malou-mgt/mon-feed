// ⚠️ Noms EXACTS des colonnes de ta base Notion (majuscules, accents, pluriel)
const PROPS = {
  date: "Date de publication",
  images: "Images",
  format: "Format",   // ou "Formats" selon le nom de ta colonne
  statut: "Statut",
};

module.exports = async (req, res) => {
  // Mot de passe optionnel pour protéger l'accès au feed
  if (process.env.FEED_KEY && req.query.key !== process.env.FEED_KEY) {
    return res.status(401).json({ error: "Accès refusé" });
  }

  try {
    const r = await fetch(
      `https://api.notion.com/v1/databases/${process.env.NOTION_DATABASE_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page_size: 30, // nombre de posts affichés
          filter: { property: PROPS.date, date: { is_not_empty: true } },
          sorts: [{ property: PROPS.date, direction: "descending" }],
        }),
      }
    );

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.message });

    const posts = data.results.map((page) => {
      const p = page.properties;
      const files = p[PROPS.images]?.files || [];
      const first = files[0];
      const fmt = p[PROPS.format];
      const st = p[PROPS.statut];
      return {
        url: page.url,
        date: p[PROPS.date]?.date?.start || null,
        image: first ? first.file?.url || first.external?.url : null,
        nbImages: files.length,
        format: fmt?.select?.name || fmt?.multi_select?.[0]?.name || null,
        statut: st?.status?.name || st?.select?.name || null,
      };
    });

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    res.status(200).json(posts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
