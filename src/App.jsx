import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import catalog from "./catalog.json";
import { buildOrderPdf, formatCurrency } from "./pdf";

const introDelayMs = 1800;
const storageKeys = {
  lab: "gstock-lab-info",
  history: "gstock-order-history",
};

const pages = [
  { id: "home", label: "Accueil" },
  { id: "order", label: "Nouvelle Commande" },
  { id: "history", label: "Historique" },
  { id: "settings", label: "Parametres" },
];

const defaultLabInfo = {
  name: "",
  phone: "",
  address: "",
  supplierEmail: "",
  shippingPlace: "",
  shippingCity: "",
};

function createOrderItem(name, category) {
  return {
    id: crypto.randomUUID(),
    name,
    category,
    quantity: 1,
    unitPrice: 0,
    amount: 0,
  };
}

function OrderPageHeader({
  onClear,
  onSave,
  onExport,
  isExportingPdf,
  lineCount,
  quantityTotal,
  total,
}) {
  return (
    <section className="section-card order-page-header">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Nouvelle commande</p>
          <h2>Preparez une commande</h2>
          <p className="section-description">
            Selection par categories, panier tactile sur mobile et tableau lisible
            sur desktop.
          </p>
        </div>
        <div className="order-actions">
          <button type="button" className="secondary-button" onClick={onClear}>
            Vider la commande
          </button>
          <button type="button" className="secondary-button" onClick={onSave}>
            Sauvegarder
          </button>
          <button type="button" className="primary-button" onClick={onExport} disabled={isExportingPdf}>
            {isExportingPdf ? "Generation..." : "Generer PDF"}
          </button>
        </div>
      </div>

      <div className="order-summary-strip">
        <div>
          <span>Lignes</span>
          <strong>{lineCount}</strong>
        </div>
        <div>
          <span>Quantite totale</span>
          <strong>{quantityTotal}</strong>
        </div>
        <div>
          <span>Total general</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>
    </section>
  );
}

function CategoryAccordionList({ catalogData, openCategory, setOpenCategory, onAddItem }) {
  return (
    <div className="accordion-list">
      {catalogData.map((group) => {
        const isOpen = openCategory === group.category;
        return (
          <article key={group.category} className={isOpen ? "category-card open" : "category-card"}>
            <button
              type="button"
              className="category-card__header"
              onClick={() => setOpenCategory(isOpen ? "" : group.category)}
              aria-expanded={isOpen}
            >
              <span>{group.category}</span>
              <div className="category-card__meta">
                <strong>{group.items.length} articles</strong>
                <span>{isOpen ? "−" : "+"}</span>
              </div>
            </button>
            {isOpen && (
              <div className="accordion-panel">
                <div className="category-chip-grid">
                  {group.items.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="product-pill"
                      onClick={() => onAddItem(item, group.category)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function CustomProductComposer({ customItemName, setCustomItemName, onAddCustom }) {
  return (
    <div className="custom-add-card">
      <div>
        <h3>Ajouter autre produit</h3>
        <p>Saisis un produit hors liste et ajoute-le directement au panier.</p>
      </div>
      <div className="custom-add-row">
        <input
          value={customItemName}
          onChange={(event) => setCustomItemName(event.target.value)}
          placeholder="Nom du produit personnalise"
        />
        <button type="button" className="primary-button" onClick={onAddCustom}>
          Ajouter
        </button>
      </div>
    </div>
  );
}

function MobileOrderCards({
  items,
  onAdjustQuantity,
  onRemove,
  onOpenPriceEditor,
}) {
  return (
    <div className="order-cards-mobile">
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.article
            key={item.id}
            className="product-card-mobile"
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            <div className="product-card__top">
              <div>
                <strong>{item.name}</strong>
                <span className="product-card__meta">{item.category}</span>
              </div>
              <button
                type="button"
                className="remove-button"
                onClick={() => onRemove(item.id)}
                aria-label={`Supprimer ${item.name}`}
              >
                Supprimer
              </button>
            </div>

            <div className="product-card__actions">
              <div className="qty-control">
                <button
                  type="button"
                  onClick={() => onAdjustQuantity(item.id, -1)}
                  aria-label={`Diminuer la quantite de ${item.name}`}
                >
                  -
                </button>
                <span>{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onAdjustQuantity(item.id, 1)}
                  aria-label={`Augmenter la quantite de ${item.name}`}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                className="secondary-button price-edit-trigger"
                onClick={() => onOpenPriceEditor(item)}
                aria-label={`Modifier le prix de ${item.name}`}
              >
                Modifier le prix
              </button>
            </div>

            <div className="product-card__footer">
              <span>P.U. : {formatCurrency(item.unitPrice)}</span>
              <strong>{formatCurrency(item.amount)}</strong>
            </div>
          </motion.article>
        ))}
      </AnimatePresence>
    </div>
  );
}

function DesktopOrderTable({
  items,
  onAdjustQuantity,
  onUpdateOrderItem,
  onRemove,
}) {
  return (
    <div className="order-table-desktop">
      <table>
        <thead>
          <tr>
            <th>Designation</th>
            <th>Categorie</th>
            <th>Quantite</th>
            <th>P.U.</th>
            <th>Montant</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>
                <div className="qty-control compact">
                  <button
                    type="button"
                    onClick={() => onAdjustQuantity(item.id, -1)}
                    aria-label={`Diminuer la quantite de ${item.name}`}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onAdjustQuantity(item.id, 1)}
                    aria-label={`Augmenter la quantite de ${item.name}`}
                  >
                    +
                  </button>
                </div>
              </td>
              <td>
                <input
                  className="table-input"
                  type="number"
                  min="0"
                  step="1"
                  value={item.unitPrice}
                  onChange={(event) =>
                    onUpdateOrderItem(item.id, { unitPrice: event.target.value })
                  }
                />
              </td>
              <td>{formatCurrency(item.amount)}</td>
              <td>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => onRemove(item.id)}
                >
                  Supprimer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderSummaryCard({ lineCount, quantityTotal, total, onSave, onExport, isExportingPdf }) {
  return (
    <div className="order-summary-card">
      <div className="order-summary-card__stats">
        <div>
          <span>Lignes</span>
          <strong>{lineCount}</strong>
        </div>
        <div>
          <span>Quantite totale</span>
          <strong>{quantityTotal}</strong>
        </div>
        <div>
          <span>Total general</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </div>
      <div className="order-summary-card__actions">
        <button type="button" className="secondary-button" onClick={onSave}>
          Sauvegarder
        </button>
        <button type="button" className="primary-button" onClick={onExport} disabled={isExportingPdf}>
          {isExportingPdf ? "Generation..." : "Generer PDF"}
        </button>
      </div>
    </div>
  );
}

function PriceEditorModal({
  editingPriceItem,
  editingPriceValue,
  onChange,
  onClose,
  onSave,
}) {
  if (!editingPriceItem) {
    return null;
  }

  return (
    <div className="price-modal" role="dialog" aria-modal="true" aria-labelledby="price-editor-title">
      <button type="button" className="price-modal__overlay" onClick={onClose} aria-label="Fermer la fenetre de prix" />
      <div className="price-modal__sheet">
        <div className="price-modal__content">
          <p className="section-kicker">Edition du prix</p>
          <h3 id="price-editor-title">Modifier le prix</h3>
          <p className="price-modal__product">{editingPriceItem.name}</p>
          <label>
            Prix unitaire
            <input
              type="number"
              min="0"
              step="1"
              value={editingPriceValue}
              onChange={(event) => onChange(event.target.value)}
              inputMode="numeric"
              autoFocus
            />
          </label>
          <p className="price-modal__hint">
            Prix actuel : {formatCurrency(editingPriceItem.unitPrice)}
          </p>
        </div>
        <div className="price-modal__actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Annuler
          </button>
          <button type="button" className="primary-button" onClick={onSave}>
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [activePage, setActivePage] = useState("home");
  const [labInfo, setLabInfo] = useState(defaultLabInfo);
  const [orderItems, setOrderItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [openCategory, setOpenCategory] = useState(catalog[0]?.category || "");
  const [customItemName, setCustomItemName] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [editingPriceItem, setEditingPriceItem] = useState(null);
  const [editingPriceValue, setEditingPriceValue] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), introDelayMs);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const storedLabInfo = window.localStorage.getItem(storageKeys.lab);
    const storedHistory = window.localStorage.getItem(storageKeys.history);

    if (storedLabInfo) {
      setLabInfo({ ...defaultLabInfo, ...JSON.parse(storedLabInfo) });
    }
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.lab, JSON.stringify(labInfo));
  }, [labInfo]);

  useEffect(() => {
    window.localStorage.setItem(storageKeys.history, JSON.stringify(history));
  }, [history]);

  const total = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.amount, 0),
    [orderItems]
  );
  const totalQuantity = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.quantity, 0),
    [orderItems]
  );
  const orderLineCount = orderItems.length;

  const totalCatalogItems = useMemo(
    () => catalog.reduce((sum, group) => sum + group.items.length, 0),
    []
  );

  const quickStats = useMemo(
    () => [
      { label: "Articles references", value: totalCatalogItems },
      { label: "Commande en cours", value: orderItems.length },
      { label: "Commandes en attente", value: history.length },
      { label: "Total actuel", value: formatCurrency(total) },
    ],
    [history.length, orderItems.length, total, totalCatalogItems]
  );

  const summaryCards = [
    {
      title: "Informations laboratoire",
      description: labInfo.name || "Renseigne le nom du laboratoire et ses coordonnees.",
      detail: labInfo.phone || "Telephone non renseigne",
      actionLabel: "Modifier",
    },
    {
      title: "Contact fournisseur",
      description:
        labInfo.supplierEmail || "Ajoute l'email du fournisseur pour l'envoi du PDF.",
      detail: labInfo.shippingPlace || "Aucun lieu d'expedition renseigne",
      actionLabel: "Completer",
    },
  ];

  const settingsFields = [
    labInfo.name,
    labInfo.phone,
    labInfo.address,
    labInfo.shippingPlace,
    labInfo.shippingCity,
    labInfo.supplierEmail,
  ];
  const settingsCompletion = Math.round(
    (settingsFields.filter(Boolean).length / settingsFields.length) * 100
  );
  const latestHistoryLabel = history[0]
    ? new Date(history[0].createdAt).toLocaleString("fr-FR")
    : "Aucune commande sauvegardee";

  const updateLabInfo = (field, value) => {
    setLabInfo((current) => ({ ...current, [field]: value }));
  };

  const addCatalogItemToOrder = (name, category) => {
    setOrderItems((current) => {
      const existing = current.find(
        (item) => item.name === name && item.category === category
      );

      if (existing) {
        return current.map((item) => {
          if (item.id !== existing.id) {
            return item;
          }
          const quantity = item.quantity + 1;
          return { ...item, quantity, amount: quantity * item.unitPrice };
        });
      }

      return [...current, createOrderItem(name, category)];
    });

    setActivePage("order");
  };

  const addCustomItem = () => {
    const trimmedName = customItemName.trim();
    if (!trimmedName) {
      return;
    }
    addCatalogItemToOrder(trimmedName, "Autres");
    setCustomItemName("");
  };

  const updateOrderItem = (id, updates) => {
    setOrderItems((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const nextItem = { ...item, ...updates };
        const quantity = Math.max(1, Number(nextItem.quantity) || 1);
        const unitPrice = Math.max(0, Number(nextItem.unitPrice) || 0);
        return {
          ...nextItem,
          quantity,
          unitPrice,
          amount: quantity * unitPrice,
        };
      })
    );
  };

  const adjustQuantity = (id, delta) => {
    setOrderItems((current) =>
      current.map((item) => {
        if (item.id !== id) {
          return item;
        }
        const quantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity, amount: quantity * item.unitPrice };
      })
    );
  };

  const removeOrderItem = (id) => {
    setOrderItems((current) => current.filter((item) => item.id !== id));
  };

  const clearOrder = () => {
    setOrderItems([]);
  };

  const saveOrderToHistory = () => {
    if (!orderItems.length) {
      return;
    }

    const snapshot = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      total,
      items: orderItems,
    };

    setHistory((current) => [snapshot, ...current].slice(0, 30));
  };

  const reloadHistoryItem = (entry) => {
    setOrderItems(
      entry.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      }))
    );
    setActivePage("order");
  };

  const deleteHistoryItem = (id) => {
    setHistory((current) => current.filter((entry) => entry.id !== id));
  };

  const openPriceEditor = (item) => {
    setEditingPriceItem(item);
    setEditingPriceValue(String(item.unitPrice || 0));
  };

  const closePriceEditor = () => {
    setEditingPriceItem(null);
    setEditingPriceValue("");
  };

  const savePriceEditor = () => {
    if (!editingPriceItem) {
      return;
    }
    updateOrderItem(editingPriceItem.id, { unitPrice: editingPriceValue });
    closePriceEditor();
  };

  const generatePdf = async () => {
    if (!orderItems.length || isExportingPdf) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const doc = await buildOrderPdf({ labInfo, items: orderItems, total });
      doc.save(
        `commande-${(labInfo.name || "gstock-labo")
          .replace(/\s+/g, "-")
          .toLowerCase()}.pdf`
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="app-shell app-shell-v2">
      <AnimatePresence>
        {showIntro && (
          <motion.section
            className="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.45 }}
          >
            <motion.div
              className="splash-card"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="splash-badge">G-Stock Labo</span>
              <h1>La precision au service de votre laboratoire</h1>
              <p>
                Interface mobile-first, claire, rapide et professionnelle pour vos
                commandes.
              </p>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>

      <header className="desktop-nav">
        <div>
          <p className="brand-kicker">G-Stock Labo</p>
          <h2 className="brand-title">Gestion de stock et commandes</h2>
        </div>
        <nav className="desktop-nav-links" aria-label="Navigation principale">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className={activePage === page.id ? "nav-chip active" : "nav-chip"}
              onClick={() => setActivePage(page.id)}
            >
              {page.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <AnimatePresence mode="wait">
          {activePage === "home" && (
            <motion.section
              key="home"
              className="page-stack"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24 }}
            >
              <section className="hero-card">
                <div className="hero-layout">
                  <div className="hero-copy">
                    <p className="hero-kicker">Accueil</p>
                    <h1>Un tableau de bord simple, lisible et efficace.</h1>
                    <p className="hero-text">
                      Suis l'etat du stock, prepare une nouvelle commande rapidement et
                      retrouve les informations du laboratoire sans te perdre dans
                      l'interface.
                    </p>
                    <div className="hero-actions">
                      <button
                        type="button"
                        className="primary-button hero-primary"
                        onClick={() => setActivePage("order")}
                      >
                        Nouvelle commande
                      </button>
                      <button
                        type="button"
                        className="secondary-button hero-secondary"
                        onClick={() => setActivePage("settings")}
                      >
                        Parametres
                      </button>
                    </div>
                  </div>

                  <div className="hero-panel">
                    <article className="hero-highlight">
                      <span>Commande active</span>
                      <strong>{orderLineCount} ligne(s)</strong>
                      <small>{formatCurrency(total)}</small>
                    </article>
                    <article className="hero-highlight hero-highlight--soft">
                      <span>Derniere sauvegarde</span>
                      <strong>{latestHistoryLabel}</strong>
                      <small>{history.length} commande(s) en historique</small>
                    </article>
                  </div>
                </div>
              </section>

              <section className="stats-grid">
                {quickStats.map((item) => (
                  <article key={item.label} className="stat-card">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </article>
                ))}
              </section>

              <section className="summary-grid">
                {summaryCards.map((card) => (
                  <article key={card.title} className="info-card">
                    <div>
                      <h3>{card.title}</h3>
                      <p>{card.description}</p>
                      <small>{card.detail}</small>
                    </div>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => setActivePage("settings")}
                    >
                      {card.actionLabel}
                    </button>
                  </article>
                ))}
              </section>

              <section className="section-card quick-links-card">
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">Acces rapide</p>
                    <h2>Aller directement a l'essentiel</h2>
                    <p className="section-description">
                      Raccourcis utiles pour smartphone et desktop.
                    </p>
                  </div>
                </div>

                <div className="quick-links-grid">
                  <button
                    type="button"
                    className="quick-link-tile"
                    onClick={() => setActivePage("order")}
                  >
                    <span>Commande</span>
                    <strong>Ajouter et chiffrer des articles</strong>
                    <small>Catalogue par categories et total instantane</small>
                  </button>
                  <button
                    type="button"
                    className="quick-link-tile"
                    onClick={() => setActivePage("history")}
                  >
                    <span>Historique</span>
                    <strong>Reprendre une commande</strong>
                    <small>{history.length} sauvegarde(s) disponible(s)</small>
                  </button>
                  <button
                    type="button"
                    className="quick-link-tile"
                    onClick={() => setActivePage("settings")}
                  >
                    <span>Laboratoire</span>
                    <strong>Verifier les coordonnees PDF</strong>
                    <small>{settingsCompletion}% des informations completees</small>
                  </button>
                </div>
              </section>
            </motion.section>
          )}

          {activePage === "order" && (
            <motion.section
              key="order"
              className="page-stack"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24 }}
            >
              <OrderPageHeader
                onClear={clearOrder}
                onSave={saveOrderToHistory}
                onExport={generatePdf}
                isExportingPdf={isExportingPdf}
                lineCount={orderLineCount}
                quantityTotal={totalQuantity}
                total={total}
              />

              <section className="order-layout">
                <section className="section-card catalog-panel">
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">Catalogue</p>
                      <h2>Selection rapide par categories</h2>
                    </div>
                  </div>

                  <CategoryAccordionList
                    catalogData={catalog}
                    openCategory={openCategory}
                    setOpenCategory={setOpenCategory}
                    onAddItem={addCatalogItemToOrder}
                  />

                  <CustomProductComposer
                    customItemName={customItemName}
                    setCustomItemName={setCustomItemName}
                    onAddCustom={addCustomItem}
                  />
                </section>

                <section className="section-card basket-panel">
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">Panier</p>
                      <h2>Commande en temps reel</h2>
                    </div>
                  </div>

                  {orderItems.length ? (
                    <>
                      <MobileOrderCards
                        items={orderItems}
                        onAdjustQuantity={adjustQuantity}
                        onRemove={removeOrderItem}
                        onOpenPriceEditor={openPriceEditor}
                      />

                      <DesktopOrderTable
                        items={orderItems}
                        onAdjustQuantity={adjustQuantity}
                        onUpdateOrderItem={updateOrderItem}
                        onRemove={removeOrderItem}
                      />

                      <OrderSummaryCard
                        lineCount={orderLineCount}
                        quantityTotal={totalQuantity}
                        total={total}
                        onSave={saveOrderToHistory}
                        onExport={generatePdf}
                        isExportingPdf={isExportingPdf}
                      />
                    </>
                  ) : (
                    <div className="empty-state">
                      <h3>Aucun produit ajoute</h3>
                      <p>
                        Selectionne une categorie ci-dessus pour commencer la commande.
                      </p>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setOpenCategory(catalog[0]?.category || "")}
                      >
                        Ajouter depuis une categorie
                      </button>
                    </div>
                  )}
                </section>
              </section>
            </motion.section>
          )}

          {activePage === "history" && (
            <motion.section
              key="history"
              className="page-stack"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24 }}
            >
              <section className="section-card history-hero">
                <div>
                  <p className="section-kicker">Historique</p>
                  <h2>Recharger une commande precedente</h2>
                  <p className="section-description">
                    Retrouve rapidement les anciennes commandes et recharge-les en un
                    clic.
                  </p>
                </div>
                <div className="history-overview">
                  <div>
                    <span>Total en historique</span>
                    <strong>{history.length}</strong>
                  </div>
                  <div>
                    <span>Derniere entree</span>
                    <strong>{latestHistoryLabel}</strong>
                  </div>
                </div>
              </section>

              <section className="section-card">
                {history.length ? (
                  <div className="history-list">
                    {history.map((entry) => (
                      <article key={entry.id} className="history-entry">
                        <div>
                          <strong>
                            {new Date(entry.createdAt).toLocaleString("fr-FR")}
                          </strong>
                          <p>
                            {entry.items.length} ligne(s) -{" "}
                            {formatCurrency(entry.total)}
                          </p>
                        </div>
                        <div className="history-actions">
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => reloadHistoryItem(entry)}
                          >
                            Recharger
                          </button>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => deleteHistoryItem(entry.id)}
                          >
                            Supprimer
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <h3>Aucun historique</h3>
                    <p>Les commandes sauvegardees apparaitront ici.</p>
                  </div>
                )}
              </section>
            </motion.section>
          )}

          {activePage === "settings" && (
            <motion.section
              key="settings"
              className="page-stack"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24 }}
            >
              <section className="settings-layout">
                <article className="section-card settings-intro-card">
                  <div className="section-heading">
                    <div>
                      <p className="section-kicker">Parametres</p>
                      <h2>Informations du laboratoire</h2>
                      <p className="section-description">
                        Ces informations sont reutilisees dans le PDF et pour
                        l'expedition.
                      </p>
                    </div>
                  </div>

                  <div className="settings-progress">
                    <span>Completion du profil</span>
                    <strong>{settingsCompletion}%</strong>
                    <div className="settings-progress__track" aria-hidden="true">
                      <div
                        className="settings-progress__bar"
                        style={{ width: `${settingsCompletion}%` }}
                      />
                    </div>
                  </div>

                  <div className="settings-preview-list">
                    <div>
                      <span>Laboratoire</span>
                      <strong>{labInfo.name || "Non renseigne"}</strong>
                    </div>
                    <div>
                      <span>Telephone</span>
                      <strong>{labInfo.phone || "Non renseigne"}</strong>
                    </div>
                    <div>
                      <span>Expedition</span>
                      <strong>
                        {labInfo.shippingPlace || labInfo.shippingCity
                          ? `${labInfo.shippingPlace || ""} ${labInfo.shippingCity || ""}`.trim()
                          : "Non renseigne"}
                      </strong>
                    </div>
                    <div>
                      <span>Fournisseur</span>
                      <strong>{labInfo.supplierEmail || "Non renseigne"}</strong>
                    </div>
                  </div>
                </article>

                <section className="section-card settings-form-card">
                  <div className="settings-grid">
                    <label>
                      Nom du laboratoire
                      <input
                        value={labInfo.name}
                        onChange={(event) =>
                          updateLabInfo("name", event.target.value)
                        }
                        placeholder="Laboratoire central"
                      />
                    </label>
                    <label>
                      Telephone
                      <input
                        value={labInfo.phone}
                        onChange={(event) =>
                          updateLabInfo("phone", event.target.value)
                        }
                        placeholder="+226 ..."
                      />
                    </label>
                    <label className="full-span">
                      Adresse / garde d'expedition
                      <textarea
                        value={labInfo.address}
                        onChange={(event) =>
                          updateLabInfo("address", event.target.value)
                        }
                        rows="4"
                        placeholder="Adresse complete"
                      />
                    </label>
                    <label>
                      Lieu d'expedition
                      <input
                        value={labInfo.shippingPlace}
                        onChange={(event) =>
                          updateLabInfo("shippingPlace", event.target.value)
                        }
                        placeholder="Gare ou lieu"
                      />
                    </label>
                    <label>
                      Ville d'expedition
                      <input
                        value={labInfo.shippingCity}
                        onChange={(event) =>
                          updateLabInfo("shippingCity", event.target.value)
                        }
                        placeholder="Ville"
                      />
                    </label>
                    <label className="full-span">
                      Email fournisseur
                      <input
                        type="email"
                        value={labInfo.supplierEmail}
                        onChange={(event) =>
                          updateLabInfo("supplierEmail", event.target.value)
                        }
                        placeholder="fournisseur@exemple.com"
                      />
                    </label>
                  </div>
                </section>
              </section>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <PriceEditorModal
        editingPriceItem={editingPriceItem}
        editingPriceValue={editingPriceValue}
        onChange={setEditingPriceValue}
        onClose={closePriceEditor}
        onSave={savePriceEditor}
      />

      <nav className="bottom-nav" aria-label="Navigation mobile">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={
              activePage === page.id ? "bottom-nav-item active" : "bottom-nav-item"
            }
            onClick={() => setActivePage(page.id)}
          >
            <span>{page.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
