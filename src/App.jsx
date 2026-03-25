import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import defaultCatalog from "./catalog.json";
import { buildOrderPdf, formatCurrency } from "./pdf";

const introDelayMs = 2200;
const storageKeys = {
  lab: "grimoire-lab-info",
  orders: "grimoire-order-history",
  catalog: "grimoire-custom-catalog",
  theme: "grimoire-theme",
};

const defaultLabInfo = {
  name: "",
  phone: "",
  address: "",
  supplierEmail: "",
  shippingPlace: "",
  receiverName: "",
  receiverPhone: "",
  shippingCity: "",
  transportCompany: "",
};

const sections = [
  { id: "commande", label: "Commande" },
  { id: "laboratoire", label: "Laboratoire" },
  { id: "catalogue", label: "Catalogue" },
  { id: "historique", label: "Historique" },
];

const themeOptions = [
  { id: "theme-default", name: "Theme par defaut", accent: "#4db6ff" },
  { id: "theme-sunset", name: "Theme Sable", accent: "#ff9b71" },
  { id: "theme-mint", name: "Theme Menthe", accent: "#37c89b" },
  { id: "theme-night", name: "Theme Nuit", accent: "#8ca2ff" },
];

const buildDraft = (catalog) => ({
  category: catalog[0]?.category || "",
  name: catalog[0]?.items[0] || "",
  customName: "",
  quantity: 1,
  unitPrice: "",
});

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [activeSection, setActiveSection] = useState("commande");
  const [theme, setTheme] = useState(themeOptions[0].id);
  const [labInfo, setLabInfo] = useState(defaultLabInfo);
  const [catalog, setCatalog] = useState(defaultCatalog);
  const [draft, setDraft] = useState(() => buildDraft(defaultCatalog));
  const [orderItems, setOrderItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [catalogEditor, setCatalogEditor] = useState({
    category: defaultCatalog[0]?.category || "",
    newCategory: "",
    itemName: "",
  });
  const [installStatus, setInstallStatus] = useState("Navigation prete pour mobile.");

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), introDelayMs);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const storedLab = window.localStorage.getItem(storageKeys.lab);
    const storedHistory = window.localStorage.getItem(storageKeys.orders);
    const storedCatalog = window.localStorage.getItem(storageKeys.catalog);
    const storedTheme = window.localStorage.getItem(storageKeys.theme);

    if (storedLab) setLabInfo(JSON.parse(storedLab));
    if (storedHistory) setHistory(JSON.parse(storedHistory));
    if (storedCatalog) {
      const parsedCatalog = JSON.parse(storedCatalog);
      setCatalog(parsedCatalog);
      setDraft(buildDraft(parsedCatalog));
      setCatalogEditor((current) => ({ ...current, category: parsedCatalog[0]?.category || "" }));
    }
    if (storedTheme && themeOptions.some((option) => option.id === storedTheme)) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.lab, JSON.stringify(labInfo));
  }, [labInfo]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.orders, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.catalog, JSON.stringify(catalog));
  }, [catalog]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.theme, theme);
  }, [theme]);

  useEffect(() => {
    const onOnline = () => setInstallStatus("Connexion retablie.");
    const onOffline = () => setInstallStatus("Mode hors ligne actif.");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const currentItems = useMemo(() => {
    const categoryEntry = catalog.find((entry) => entry.category === draft.category);
    const filtered = categoryEntry?.items ?? [];
    if (!search.trim()) return filtered;
    return filtered.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()));
  }, [catalog, draft.category, search]);

  useEffect(() => {
    const categoryEntry = catalog.find((entry) => entry.category === draft.category) || catalog[0];
    if (!categoryEntry) return;
    if (!catalog.some((entry) => entry.category === draft.category)) {
      setDraft(buildDraft(catalog));
      return;
    }
    if (draft.category !== "Autres" && !categoryEntry.items.includes(draft.name)) {
      setDraft((current) => ({ ...current, name: categoryEntry.items[0] || "" }));
    }
  }, [catalog, draft.category, draft.name]);

  useEffect(() => {
    if (!catalog.some((entry) => entry.category === catalogEditor.category)) {
      setCatalogEditor((current) => ({ ...current, category: catalog[0]?.category || "" }));
    }
  }, [catalog, catalogEditor.category]);

  const total = useMemo(() => orderItems.reduce((sum, item) => sum + item.amount, 0), [orderItems]);

  const kpis = useMemo(() => {
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const categoryCount = new Set(orderItems.map((item) => item.category)).size;
    const averageBasket = orderItems.length ? total / orderItems.length : 0;
    return [
      { label: "Lignes", value: String(orderItems.length) },
      { label: "Quantite totale", value: String(totalQuantity) },
      { label: "Categories", value: String(categoryCount) },
      { label: "Panier moyen", value: formatCurrency(averageBasket) },
    ];
  }, [orderItems, total]);

  const updateLabField = (field, value) => setLabInfo((current) => ({ ...current, [field]: value }));

  const addItem = () => {
    const resolvedName = draft.category === "Autres" ? draft.customName.trim() : draft.name;
    const quantity = Number(draft.quantity);
    const unitPrice = Number(draft.unitPrice);
    if (!resolvedName || quantity <= 0 || unitPrice < 0 || Number.isNaN(unitPrice)) return;

    setOrderItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        category: draft.category,
        name: resolvedName,
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
      },
    ]);

    setDraft((current) => ({ ...current, customName: "", quantity: 1, unitPrice: "" }));
  };

  const updateQuantity = (id, delta) => {
    setOrderItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        const quantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity, amount: quantity * item.unitPrice };
      })
    );
  };

  const removeItem = (id) => setOrderItems((current) => current.filter((item) => item.id !== id));

  const saveToHistory = () => {
    if (!orderItems.length) return;
    setHistory((current) => [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        total,
        items: orderItems,
      },
      ...current,
    ].slice(0, 20));
  };

  const clearCurrentOrder = () => setOrderItems([]);

  const reuseOrder = (entry) => {
    setOrderItems(entry.items.map((item) => ({ ...item, id: crypto.randomUUID() })));
    setActiveSection("commande");
  };

  const deleteHistoryEntry = (id) => setHistory((current) => current.filter((entry) => entry.id !== id));

  const generatePdf = () => {
    if (!orderItems.length) return;
    const doc = buildOrderPdf({ labInfo, items: orderItems, total });
    doc.save(`commande-${(labInfo.name || "laboratoire").replace(/\s+/g, "-").toLowerCase()}.pdf`);

    if (labInfo.supplierEmail) {
      const subject = encodeURIComponent(`Commande Laboratoire - ${labInfo.name || "Laboratoire"}`);
      const body = encodeURIComponent(
        `Bonjour,\n\nVeuillez trouver la commande preparee.\nTotal general: ${formatCurrency(total)}.\n\nCordialement.`
      );
      window.open(`mailto:${labInfo.supplierEmail}?subject=${subject}&body=${body}`, "_blank");
    }
  };

  const saveAndExport = () => {
    saveToHistory();
    generatePdf();
  };

  const addCatalogCategory = () => {
    const categoryName = catalogEditor.newCategory.trim();
    if (!categoryName || catalog.some((entry) => entry.category === categoryName)) return;
    const nextCatalog = [...catalog, { category: categoryName, items: [] }];
    setCatalog(nextCatalog);
    setCatalogEditor({ category: categoryName, newCategory: "", itemName: "" });
    setDraft((current) => ({ ...current, category: categoryName, name: "" }));
  };

  const addCatalogItem = () => {
    const itemName = catalogEditor.itemName.trim();
    if (!catalogEditor.category || !itemName) return;
    setCatalog((current) =>
      current.map((entry) => {
        if (entry.category !== catalogEditor.category || entry.items.includes(itemName)) return entry;
        return { ...entry, items: [...entry.items, itemName] };
      })
    );
    setCatalogEditor((current) => ({ ...current, itemName: "" }));
  };

  const removeCatalogItem = (categoryName, itemName) => {
    setCatalog((current) =>
      current.map((entry) =>
        entry.category === categoryName
          ? { ...entry, items: entry.items.filter((item) => item !== itemName) }
          : entry
      )
    );
  };

  const resetCatalog = () => {
    setCatalog(defaultCatalog);
    setCatalogEditor({ category: defaultCatalog[0]?.category || "", newCategory: "", itemName: "" });
    setDraft(buildDraft(defaultCatalog));
  };

  const exportCatalog = () => {
    const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "catalogue-grimoire.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importCatalog = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return;
    setCatalog(parsed);
    setCatalogEditor({ category: parsed[0]?.category || "", newCategory: "", itemName: "" });
    setDraft(buildDraft(parsed));
    event.target.value = "";
  };

  const summaryRows = [
    { label: "Nom labo", value: labInfo.name || "-" },
    { label: "Telephone", value: labInfo.phone || "-" },
    { label: "Ville", value: labInfo.shippingCity || "-" },
    { label: "Reception", value: labInfo.receiverName || "-" },
    { label: "Contact reception", value: labInfo.receiverPhone || "-" },
    { label: "Transport", value: labInfo.transportCompany || "-" },
  ];

  return (
    <div className="app-shell" data-theme={theme}>
      <AnimatePresence>
        {showIntro && (
          <motion.section
            className="intro-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="intro-card"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="intro-badge">Nom Grimoire</div>
              <h1>Gestion des stocks et commandes du laboratoire</h1>
              <p>Commande tactile, totaux en FCFA, PDF propre et transition fluide vers la preparation.</p>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      <main className="layout">
        <section className="hero-panel">
          <div className="hero-copy-block">
            <div className="hero-topline">
              <p className="eyebrow">Dashboard mobile</p>
              <span className="status-pill">{installStatus}</span>
            </div>
            <h2>Commande laboratoire en FCFA, claire sur smartphone et prete pour le PDF</h2>
            <p className="hero-copy">
              Selection rapide par categorie, ajout d&apos;autres articles, total automatique, expedition complete et themes visuels.
            </p>
            <nav className="section-tabs" aria-label="Sections principales">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={section.id === activeSection ? "tab-button active" : "tab-button"}
                  onClick={() => setActiveSection(section.id)}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          <motion.div className="hero-visual" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <div className="hero-orbit hero-orbit-one" />
            <div className="hero-orbit hero-orbit-two" />
            <motion.img
              src="/Medicine-bro.svg"
              alt="Illustration dashboard laboratoire"
              className="hero-image"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </section>

        <AnimatePresence mode="wait">
          {activeSection === "commande" && (
            <motion.div key="commande" className="section-stack" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }}>
              <section className="kpi-grid">
                {kpis.map((item, index) => (
                  <motion.article key={item.label} className="kpi-card" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.05 }}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </motion.article>
                ))}
              </section>

              <section className="content-grid">
                <article className="panel">
                  <div className="panel-head">
                    <h3>Ajouter a la commande</h3>
                    <span className="panel-note">Boutons larges et listes tactiles</span>
                  </div>
                  <div className="form-grid">
                    <label>
                      Categorie
                      <select
                        value={draft.category}
                        onChange={(event) => {
                          const selectedCategory = event.target.value;
                          const nextItems = catalog.find((entry) => entry.category === selectedCategory)?.items || [];
                          setDraft({ ...draft, category: selectedCategory, name: nextItems[0] || "", customName: "" });
                          setSearch("");
                        }}
                      >
                        {catalog.map((entry) => (
                          <option key={entry.category} value={entry.category}>
                            {entry.category}
                          </option>
                        ))}
                      </select>
                    </label>

                    {draft.category !== "Autres" ? (
                      <>
                        <label>
                          Recherche
                          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Chercher un article" />
                        </label>
                        <label>
                          Designation
                          <select value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}>
                            {currentItems.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : (
                      <label>
                        Article libre
                        <input value={draft.customName} onChange={(event) => setDraft({ ...draft, customName: event.target.value })} placeholder="Saisir un article" />
                      </label>
                    )}

                    <label>
                      Quantite
                      <div className="stepper">
                        <button type="button" onClick={() => setDraft({ ...draft, quantity: Math.max(1, draft.quantity - 1) })}>-</button>
                        <input type="number" min="1" value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: Math.max(1, Number(event.target.value) || 1) })} />
                        <button type="button" onClick={() => setDraft({ ...draft, quantity: draft.quantity + 1 })}>+</button>
                      </div>
                    </label>

                    <label>
                      Prix unitaire (FCFA)
                      <input type="number" min="0" step="1" value={draft.unitPrice} onChange={(event) => setDraft({ ...draft, unitPrice: event.target.value })} placeholder="3000" />
                    </label>
                  </div>

                  <div className="button-row">
                    <button className="primary-button" type="button" onClick={addItem}>Ajouter la ligne</button>
                    <button className="secondary-button" type="button" onClick={clearCurrentOrder}>Vider la commande</button>
                  </div>
                </article>

                <article className="panel compact-panel">
                  <div className="panel-head">
                    <h3>Expedition</h3>
                  </div>
                  <div className="summary-list">
                    {summaryRows.map((row) => (
                      <div key={row.label}>
                        <span>{row.label}</span>
                        <strong>{row.value}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              </section>

              <section className="panel order-panel">
                <div className="panel-head">
                  <h3>Commande</h3>
                  <div className="actions-row">
                    <button className="secondary-button" type="button" onClick={saveToHistory}>Enregistrer</button>
                    <button className="primary-button" type="button" onClick={saveAndExport}>Generer PDF</button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Designation</th>
                        <th>Categorie</th>
                        <th>Quantite</th>
                        <th>Prix unitaire</th>
                        <th>Montant</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.length ? (
                        <AnimatePresence initial={false}>
                          {orderItems.map((item) => (
                            <motion.tr key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
                              <td>{item.name}</td>
                              <td>{item.category}</td>
                              <td>
                                <div className="qty-chip">
                                  <button type="button" onClick={() => updateQuantity(item.id, -1)}>-</button>
                                  <span>{item.quantity}</span>
                                  <button type="button" onClick={() => updateQuantity(item.id, 1)}>+</button>
                                </div>
                              </td>
                              <td>{formatCurrency(item.unitPrice)}</td>
                              <td>{formatCurrency(item.amount)}</td>
                              <td>
                                <button className="ghost-button" type="button" onClick={() => removeItem(item.id)}>Supprimer</button>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      ) : (
                        <tr>
                          <td colSpan="6" className="empty-cell">Aucune ligne pour le moment.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="total-card">
                  <span>Total general</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>
              </section>
            </motion.div>
          )}

          {activeSection === "laboratoire" && (
            <motion.section key="laboratoire" className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }}>
              <div className="panel-head"><h3>Informations du laboratoire et expedition</h3></div>
              <div className="form-grid">
                <label>
                  Nom du laboratoire
                  <input value={labInfo.name} onChange={(event) => updateLabField("name", event.target.value)} placeholder="Laboratoire Central" />
                </label>
                <label>
                  Telephone du laboratoire
                  <input value={labInfo.phone} onChange={(event) => updateLabField("phone", event.target.value)} placeholder="+226 ..." />
                </label>
                <label className="full">
                  Adresse
                  <textarea value={labInfo.address} onChange={(event) => updateLabField("address", event.target.value)} rows="3" placeholder="Adresse complete" />
                </label>
                <label className="full">
                  Email du fournisseur
                  <input type="email" value={labInfo.supplierEmail} onChange={(event) => updateLabField("supplierEmail", event.target.value)} placeholder="fournisseur@exemple.com" />
                </label>
                <label>
                  Lieu d&apos;expedition / gare
                  <input value={labInfo.shippingPlace} onChange={(event) => updateLabField("shippingPlace", event.target.value)} placeholder="Nom du lieu ou gare" />
                </label>
                <label>
                  Ville d&apos;expedition
                  <input value={labInfo.shippingCity} onChange={(event) => updateLabField("shippingCity", event.target.value)} placeholder="Ouagadougou" />
                </label>
                <label>
                  Personne qui recupere
                  <input value={labInfo.receiverName} onChange={(event) => updateLabField("receiverName", event.target.value)} placeholder="Nom du receveur" />
                </label>
                <label>
                  Contact du receveur
                  <input value={labInfo.receiverPhone} onChange={(event) => updateLabField("receiverPhone", event.target.value)} placeholder="+226 ..." />
                </label>
                <label className="full">
                  Compagnie de transport / gare
                  <input value={labInfo.transportCompany} onChange={(event) => updateLabField("transportCompany", event.target.value)} placeholder="Compagnie ou gare d'expedition" />
                </label>
              </div>

              <div className="theme-section">
                <div className="panel-head"><h3>Themes</h3></div>
                <div className="theme-grid">
                  {themeOptions.map((option) => (
                    <button key={option.id} type="button" className={theme === option.id ? "theme-card active" : "theme-card"} onClick={() => setTheme(option.id)}>
                      <span className="theme-swatch" style={{ "--swatch": option.accent }} />
                      <strong>{option.name}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </motion.section>
          )}

          {activeSection === "catalogue" && (
            <motion.section key="catalogue" className="content-grid" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }}>
              <article className="panel">
                <div className="panel-head"><h3>Mettre a jour le catalogue</h3></div>
                <div className="form-grid">
                  <label>
                    Categorie cible
                    <select value={catalogEditor.category} onChange={(event) => setCatalogEditor({ ...catalogEditor, category: event.target.value })}>
                      {catalog.map((entry) => (
                        <option key={entry.category} value={entry.category}>{entry.category}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nouvel article
                    <input value={catalogEditor.itemName} onChange={(event) => setCatalogEditor({ ...catalogEditor, itemName: event.target.value })} placeholder="Ajouter un consommable" />
                  </label>
                  <label>
                    Nouvelle categorie
                    <input value={catalogEditor.newCategory} onChange={(event) => setCatalogEditor({ ...catalogEditor, newCategory: event.target.value })} placeholder="Creer une categorie" />
                  </label>
                  <label>
                    Import JSON
                    <input type="file" accept="application/json" onChange={importCatalog} />
                  </label>
                </div>
                <div className="button-row">
                  <button className="primary-button" type="button" onClick={addCatalogItem}>Ajouter l&apos;article</button>
                  <button className="secondary-button" type="button" onClick={addCatalogCategory}>Ajouter la categorie</button>
                  <button className="secondary-button" type="button" onClick={exportCatalog}>Exporter JSON</button>
                  <button className="ghost-button" type="button" onClick={resetCatalog}>Reinitialiser</button>
                </div>
              </article>

              <article className="panel">
                <div className="panel-head"><h3>Catalogue actuel</h3></div>
                <div className="catalog-grid">
                  {catalog.map((entry) => (
                    <div key={entry.category} className="catalog-card">
                      <div className="catalog-header">
                        <strong>{entry.category}</strong>
                        <span>{entry.items.length} article(s)</span>
                      </div>
                      <div className="catalog-items">
                        {entry.items.length ? (
                          entry.items.map((item) => (
                            <div key={item} className="catalog-item">
                              <span>{item}</span>
                              <button type="button" className="ghost-button small-button" onClick={() => removeCatalogItem(entry.category, item)}>X</button>
                            </div>
                          ))
                        ) : (
                          <p className="empty-history">Categorie vide.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </motion.section>
          )}

          {activeSection === "historique" && (
            <motion.section key="historique" className="panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.28 }}>
              <div className="panel-head"><h3>Historique des commandes</h3></div>
              <div className="history-list">
                {history.length ? (
                  history.map((entry) => (
                    <div key={entry.id} className="history-card">
                      <div>
                        <strong>{new Date(entry.createdAt).toLocaleString("fr-FR")}</strong>
                        <p>{entry.items.length} ligne(s) - {formatCurrency(entry.total)}</p>
                      </div>
                      <div className="actions-row">
                        <button className="secondary-button" type="button" onClick={() => reuseOrder(entry)}>Reutiliser</button>
                        <button className="ghost-button" type="button" onClick={() => deleteHistoryEntry(entry.id)}>Supprimer</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="empty-history">Aucune commande sauvegardee.</p>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
