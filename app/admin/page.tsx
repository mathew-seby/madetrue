"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  getCategories, 
  getSellers, 
  getAllProductsAdmin, 
  updateProductStatus,
  setProductHidden,
  deleteProduct,
  updateSellerApplication,
  registerSellerVendor,
  getPayoutDetailsForSeller,
  getApplicationStatus,
  getOrdersAdmin, 
  updateOrderStatus, 
  updateOrderWhatsappStatus,
  addCategory,
  updateCategory,
  deleteCategory,
  getAuditLog,
  recordAudit
} from "@/lib/supabase/client";
import type { SellerApplicationAction, SellerPayoutDetails } from "@/lib/supabase/client";
import { Order, Product, Seller, Category, AuditEntry, AuditEntityType } from "@/types";
import { DELIVERY_FEE } from "@/lib/utils/constants";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { CATEGORY_ICONS, DEFAULT_CATEGORY_ICON, slugifyName, isValidSlug, type CategoryIcon } from "@/lib/utils/categories";
import { computeAdminAnalytics, type MakerLeaderRow } from "@/lib/utils/adminAnalytics";
import { useAuth } from "@/components/shared/AuthProvider";
import { 
  ShieldCheck, LogOut, Check, X, Clock, Eye, Store, Tag, 
  MapPin, Inbox, CheckCircle, AlertTriangle, FileText, ExternalLink, 
  ChevronUp, Image as ImageIcon, Navigation, ShoppingBag, 
  Users, Send, Award, ShieldAlert, Calendar, CreditCard,
  Search, Trash2, EyeOff, ArrowDownUp, Layers, PenLine, ChartColumn, RefreshCw, History,
  Leaf, UtensilsCrossed, Paintbrush, Sprout, Flower
} from "lucide-react";

// Pre-seed three demo orders the first time the admin console runs.
// Lives at module scope on purpose: Date.now() inside a component body
// would break render-purity rules, and this only needs to run once ever.
const MOCK_SEEDED_ORDERS = [
  {
    id: `order-1719736800000-0`,
    buyer_id: "buyer-joel",
    buyer_name: "Joel Punnen",
    buyer_phone: "9876543210",
    seller_id: "seller-1", // Sreedevi's Spices
    product_id: "prod-1", // Organic Cardamom
    product_name: "Organic Cardamom (Elakkai)",
    price: 190,
    quantity: 2,
    status: "pending",
    delivery_type: "delivery",
    address: "Pipeline Road, Kakkanad, Kochi, Ernakulam, Kerala",
    payment_method: "cod",
    delivery_fee: DELIVERY_FEE,
    whatsapp_notified: true,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
    lat: 9.9816,
    lng: 76.3400
  },
  {
    id: `order-1719736800000-1`,
    buyer_id: "buyer-mathew",
    buyer_name: "Mathew Seby",
    buyer_phone: "9865432107",
    seller_id: "seller-2", // George's Farm
    product_id: "prod-3", // Toddy-Style Coconut Vinegar
    product_name: "Toddy-Style Coconut Vinegar",
    price: 120,
    quantity: 3,
    status: "accepted",
    delivery_type: "delivery",
    address: "Near Church, Aluva, Kochi, Ernakulam, Kerala",
    payment_method: "upi",
    delivery_fee: DELIVERY_FEE,
    whatsapp_notified: false,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(), // 12 hours ago
    lat: 10.1076,
    lng: 76.3501
  },
  {
    id: `order-1719736800000-2`,
    buyer_id: "buyer-guest",
    buyer_name: "Anjali Krishna",
    buyer_phone: "7654321098",
    seller_id: "seller-3", // Sarah's Kitchen
    product_id: "prod-5", // Homemade Malabar Garlic Pickle
    product_name: "Homemade Malabar Garlic Pickle",
    price: 150,
    quantity: 1,
    status: "completed",
    delivery_type: "delivery",
    address: "Thrikkakara, Kochi, Ernakulam, Kerala",
    payment_method: "cod",
    delivery_fee: DELIVERY_FEE,
    whatsapp_notified: true,
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
    lat: 10.0269,
    lng: 76.3268
  }
];

// Honest per-order money breakdown for the console's order book. Seller
// share falls back to the line price when base_price is missing (legacy
// mock rows), and the delivery fee rides delivery baskets only (₹49 flat,
// locked decision #4).
function orderMoney(order: Order) {
  const price = order.price ?? 0;
  const subtotal = price * order.quantity;
  const deliveryFee = order.delivery_type === "delivery" ? order.delivery_fee ?? 0 : 0;
  return {
    subtotal,
    sellerShare: (order.base_price ?? price) * order.quantity,
    commission: (order.commission ?? 0) * order.quantity,
    deliveryFee,
    total: subtotal + deliveryFee,
  };
}

// Icon name → lucide component for the category cards' tile previews.
// The CRUD whitelist lives in lib/utils/categories.ts; any unknown stored
// name falls back to Leaf, exactly like the public homepage tiles.
const CATEGORY_ICON_COMPONENTS: Record<string, ComponentType<{ className?: string }>> = {
  Leaf,
  UtensilsCrossed,
  Brush: Paintbrush,
  Sprout,
  Flower,
};

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading, logout } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Main navigation sections: products, sellers, orders
  const [currentSection, setCurrentSection] = useState<"products" | "sellers" | "categories" | "analytics" | "audit" | "orders">("products");

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [sellersList, setSellersList] = useState<Seller[]>([]);
  const [sellersMap, setSellersMap] = useState<{ [key: string]: Seller }>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Category management (Step 5): the live list the CRUD section edits,
  // plus the draft being added or edited (null = list mode only). The
  // slug input auto-follows the name until the moderator types in it.
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryDraft, setCategoryDraft] = useState<{
    mode: "add" | "edit";
    id?: string;
    name: string;
    slug: string;
    icon: string;
  } | null>(null);
  const [categorySlugTouched, setCategorySlugTouched] = useState(false);
  // Audit trail (Step 7): every moderation action this console records.
  // A failed read never breaks the console — the tab reads empty and a
  // warn lands in the browser log.
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [auditFilter, setAuditFilter] = useState("");

  // Sub-tabs filters
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [sellerFilter, setSellerFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [orderFilter, setOrderFilter] = useState<"all" | "pending" | "accepted" | "completed" | "cancelled">("all");

  // Order book (Step 4): search, fulfillment/payment filters, sort
  // direction, and which order's detail view is open. All purely
  // client-side on top of the already-global order list.
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStageFilter, setOrderStageFilter] = useState<"all" | "delivery" | "pickup">("all");
  const [orderPayFilter, setOrderPayFilter] = useState<"all" | "upi" | "cod">("all");
  const [orderSortDir, setOrderSortDir] = useState<"newest" | "oldest">("newest");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Payout display fields per maker store, hydrated from the private
  // seller_payout_kyc table (mock: inline on the seller row) by the
  // admin-only /api/sellers/[id]/payout route. `{}` → the card loses
  // nothing to blades: it simply renders its "—" placeholders.
  const [payoutsMap, setPayoutsMap] = useState<{ [sellerId: string]: SellerPayoutDetails }>({});

  // Expanded product detail
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Product moderation search (name, maker, category, audit note).
  const [productQuery, setProductQuery] = useState("");

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Stable toast helper (referenced by loadModerationData with stable deps)
  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const loadModerationData = useCallback(async () => {
    setLoading(true);
    try {
      const allProducts = await getAllProductsAdmin();
      const allSellers = await getSellers();
      const allCategories = await getCategories();
      
      // Load orders; pre-seed demo rows only in mock mode. In Supabase
      // mode the database IS the order book — an empty list is honest.
      let allOrders: Order[] = await getOrdersAdmin();
      if (!isSupabaseEnabled() && allOrders.length === 0 && typeof window !== "undefined") {
        localStorage.setItem("madetrue_orders", JSON.stringify(MOCK_SEEDED_ORDERS));
        allOrders = MOCK_SEEDED_ORDERS as Order[];
      }

      const sellerMap = allSellers.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {} as { [key: string]: Seller });

      // Payout cards: one admin-only fetch per maker, all in parallel.
      // allSettled keeps one failing lookup (or a 403 from an expired
      // session) from blanking the whole table — a failed slot just
      // renders "—".
      const payoutResults = await Promise.allSettled(
        allSellers.map((s) => getPayoutDetailsForSeller(s.id))
      );
      const payoutMap: { [sellerId: string]: SellerPayoutDetails } = {};
      allSellers.forEach((seller, i) => {
        const result = payoutResults[i];
        if (result.status === "fulfilled") payoutMap[seller.id] = result.value;
      });

      setProducts(allProducts);
      setSellersList(allSellers);
      setSellersMap(sellerMap);
      setPayoutsMap(payoutMap);
      setOrders(allOrders);
      setCategories(allCategories);
    } catch {
      showToast("Failed to fetch admin dashboard data", "error");
    } finally {
      setLoading(false);
    }

    // The audit trail loads beside the moderation data but never breaks
    // it: an unreachable trail (e.g. migration 0009 not applied yet in
    // Supabase mode) leaves the tab empty with a console warn.
    try {
      const trail = await getAuditLog();
      setAuditLog(trail);
    } catch (e) {
      console.warn("[madetrue] audit trail unavailable:", e);
      setAuditLog([]);
    }
  }, [showToast]);

  // Authentication check on mount: the console is admin-only and the
  // decision is derived from the REAL session (AuthProvider), never from a
  // stored console flag. Guests are sent to the console login; signed-in
  // non-admins are blocked with the landing below.
  useEffect(() => {
    if (authLoading) return;

    /* eslint-disable react-hooks/set-state-in-effect -- mount sync of external/auth store */
    if (currentUser && currentUser.role === "admin") {
      setAuthorized(true);
      setCheckingAuth(false);
      loadModerationData();
      return;
    }

    if (currentUser) {
      // Block signed-in non-admin accounts
      setAuthorized(false);
      setCheckingAuth(false);
      return;
    }

    // Guest: the console login is the front door. The spinner stays on
    // until the navigation lands, so the blocked screen never flashes.
    router.replace("/admin/login");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [router, loadModerationData, currentUser, authLoading]);

  const handleLogout = async () => {
    await logout();
    router.push("/admin/login");
  };

  // --- Audit trail recording (Step 7) -------------------------------------
  // One fire-and-forget call per console action: the actor arrives from
  // the session (AuthProvider), the caller supplies entity + action + the
  // human before → after summary. Never blocks or breaks the action
  // itself — a failed append only warns in the console log.
  const logConsoleAction = (entry: {
    entity_type: AuditEntityType;
    entity_id: string;
    entity_label: string;
    action: string;
    summary: string;
  }) => {
    if (!currentUser) return;
    recordAudit({
      ...entry,
      actor_name: currentUser.name || currentUser.email,
      actor_email: currentUser.email,
      actor_id: currentUser.id,
    })
      .then(() => {
        // Refresh silently so the Audit tab is current after the next visit.
        getAuditLog()
          .then(setAuditLog)
          .catch(() => undefined);
      })
      .catch((e) => console.warn("[madetrue] audit append failed:", e));
  };

  const handleApproval = async (productId: string, status: "approved" | "rejected" | "pending") => {
    let reason = "";
    let commissionVal = 0;
    if (status === "rejected") {
      const inputReason = window.prompt("Please enter a reason for rejecting this product listing (this will be sent to the seller):");
      if (inputReason === null) return;
      reason = inputReason.trim() || "No specific reason provided.";
    } else if (status === "approved") {
      const prod = products.find(p => p.id === productId);
      const basePrice = prod?.base_price || prod?.price || 0;
      const inputCommission = window.prompt(
        `Review Sourcing Price: ₹${basePrice}\nEnter commission amount (₹) to add to this price:`
      );
      if (inputCommission === null) return;
      
      const parsedCommission = parseFloat(inputCommission.trim());
      if (isNaN(parsedCommission) || parsedCommission < 0) {
        showToast("Please enter a valid numeric commission amount.", "error");
        return;
      }
      commissionVal = parsedCommission;
    }

    try {
      const beforeStatus = products.find((p) => p.id === productId)?.status ?? "unknown";
      const updated = await updateProductStatus(productId, status, reason, commissionVal);
      if (updated) {
        let msg = "";
        const statusWord =
          status === "approved" ? "approved" : status === "rejected" ? "rejected" : "sent back for re-review";
        if (status === "approved") {
          msg = `Product "${updated.name}" has been approved for listing.`;
        } else if (status === "rejected") {
          msg = `Product "${updated.name}" has been rejected. Reason: ${reason}`;
        } else {
          msg = `Product "${updated.name}" has been sent back for re-review.`;
        }
        showToast(msg, "success");
        logConsoleAction({
          entity_type: "product",
          entity_id: updated.id,
          entity_label: updated.name,
          action: `review_${status}`,
          summary:
            `Review status: ${beforeStatus} → ${statusWord}` +
            (status === "approved"
              ? ` (sourcing price ₹${updated.base_price ?? "—"} + commission ₹${updated.commission ?? commissionVal})`
              : status === "rejected"
                ? ` — reason: ${reason}`
                : ""),
        });
        loadModerationData();
      }
    } catch {
      showToast("Operation failed. Try again.", "error");
    }
  };

  const handleSellerApplication = async (sellerId: string, action: SellerApplicationAction) => {
    const seller = sellersList.find((s) => s.id === sellerId);
    const name = seller?.business_name ?? "That maker";

    // Revoking an approved maker hides their whole store — require the
    // deliberate click a confirm dialog asks for. Other transitions are
    // reversible queue moves and stay one-click (like product review).
    if (action === "revoke" && !window.confirm(`Revoke ${name}'s approval? Their store and products are removed from the marketplace until the application is approved again.`)) {
      return;
    }

    try {
      const updated = await updateSellerApplication(sellerId, action);
      if (updated) {
        const st = getApplicationStatus(updated);
        const stLabel = st === "approved" ? "approved" : st === "rejected" ? "rejected" : "back in the pending queue";
        showToast(
          `Application of "${updated.business_name}" is now ${stLabel}.`,
          "success"
        );
        logConsoleAction({
          entity_type: "seller",
          entity_id: updated.id,
          entity_label: updated.business_name,
          action: `application_${action}`,
          summary:
            `Application status: ${seller ? getApplicationStatus(seller) : "unknown"} → ${st}` +
            (st === "approved"
              ? " — store is live with verified payout KYC"
              : st === "rejected"
                ? " — store not visible to buyers"
                : action === "revoke"
                  ? " — approval revoked, store withdrawn from the marketplace"
                  : " — awaiting moderation"),
        });
        loadModerationData();
      }
    } catch {
      showToast("Could not update the application. Try again.", "error");
    }
  };

  const [registeringVendorId, setRegisteringVendorId] = useState<string | null>(null);

  const handleRegisterVendor = async (sellerId: string) => {
    setRegisteringVendorId(sellerId);
    try {
      const updated = await registerSellerVendor(sellerId);
      if (updated) {
        showToast(
          `Onboarded "${updated.business_name}" as gateway vendor (${updated.payment_vendor_ref}).`,
          "success"
        );
        logConsoleAction({
          entity_type: "seller",
          entity_id: updated.id,
          entity_label: updated.business_name,
          action: "vendor_onboarded",
          summary: `Onboarded as gateway vendor: "${updated.payment_vendor_ref}" (KYC: ${updated.kyc_status}).`,
        });
        loadModerationData();
      } else {
        showToast("Vendor registration could not be completed.", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Vendor registration failed.";
      showToast(msg, "error");
    } finally {
      setRegisteringVendorId(null);
    }
  };


  // Hide/unhide — the moderation overlay (is_hidden + note). Explicit
  // cancel (prompt Escape) aborts the action; an empty note is fine.
  const handleSetProductHidden = async (productId: string, hideState: boolean) => {
    const product = products.find((p) => p.id === productId);
    const promptText = hideState
      ? `Why is "${product?.name}" being hidden from buyers? (Optional note, recorded for the maker and the audit log)`
      : `Any note for the maker while reinstating "${product?.name}"? (Optional)`;
    const note = window.prompt(promptText);
    if (note === null) return;

    try {
      const beforeHidden = product?.is_hidden ?? false;
      const updated = await setProductHidden(productId, hideState, note);
      if (updated) {
        showToast(
          hideState
            ? `Listing "${updated.name}" is hidden from the marketplace.`
            : `Listing "${updated.name}" is visible to buyers again.`,
          "success"
        );
        logConsoleAction({
          entity_type: "product",
          entity_id: updated.id,
          entity_label: updated.name,
          action: hideState ? "hidden" : "unhidden",
          summary:
            `Visibility: ${beforeHidden ? "hidden" : "visible"} → ${hideState ? "hidden" : "visible"}` +
            (note && note.trim() ? ` — note: "${note.trim()}"` : ""),
        });
        loadModerationData();
      }
    } catch {
      showToast("Could not update the listing's visibility. Try again.", "error");
    }
  };

  // Remove — permanent. Confirm first, then record the audit note (the
  // mock email stream carries it to the maker since the row won't exist
  // after this; the trail entry below is the durable keeper).
  const handleRemoveProduct = async (productId: string) => {
    const product = products.find((p) => p.id === productId);
    const confirmed = window.confirm(
      `Remove "${product?.name}" permanently? This cannot be undone and the maker is notified with the note below. Use Hide instead if the listing may come back.`
    );
    if (!confirmed) return;

    const note = window.prompt("Add an audit note for this removal (recorded with the moderation action and sent to the maker):");
    if (note === null) return;

    try {
      const removed = await deleteProduct(productId, undefined, note);
      if (removed) {
        showToast(
          `Listing "${product?.name}" was removed from MADETRUE.${note.trim() ? " Audit note recorded and emailed to the maker." : ""}`,
          "success"
        );
        logConsoleAction({
          entity_type: "product",
          entity_id: productId,
          entity_label: product?.name ?? productId,
          action: "removed",
          summary:
            "Listing permanently removed from MADETRUE" +
            (note && note.trim() ? ` — audit note: "${note.trim()}"` : "") +
            " — past orders keep their history",
        });
        loadModerationData();
      } else {
        showToast("That listing could not be found.", "error");
      }
    } catch {
      showToast("Could not remove the listing. Try again.", "error");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'pending' | 'accepted' | 'completed' | 'cancelled') => {
    try {
      const before = orders.find((o) => o.id === orderId);
      const updated = await updateOrderStatus(orderId, newStatus);
      if (updated) {
        showToast(`Order status updated to "${newStatus}"`, "success");
        logConsoleAction({
          entity_type: "order",
          entity_id: updated.id,
          entity_label: updated.product_name ?? updated.id,
          action: `order_${newStatus}`,
          summary: `Order status: ${before?.status ?? "unknown"} → ${newStatus} — ${updated.buyer_name ?? "buyer"}, qty ${updated.quantity}`,
        });
        loadModerationData();
      }
    } catch {
      showToast("Failed to update order status.", "error");
    }
  };

  const handleToggleWhatsappNotified = async (orderId: string, currentStatus: boolean) => {
    try {
      const before = orders.find((o) => o.id === orderId);
      const updated = await updateOrderWhatsappStatus(orderId, !currentStatus);
      if (updated) {
        showToast(
          updated.whatsapp_notified
            ? "WhatsApp notification sent successfully!"
            : "Reset WhatsApp notification status.",
          "success"
        );
        logConsoleAction({
          entity_type: "order",
          entity_id: updated.id,
          entity_label: updated.product_name ?? updated.id,
          action: "whatsapp_notified",
          summary:
            `WhatsApp flag: ${currentStatus ? "notified" : "not notified"} → ${updated.whatsapp_notified ? "notified" : "not notified"}` +
            (before?.buyer_phone ? ` (${before.buyer_phone})` : ""),
        });
        loadModerationData();
      }
    } catch {
      showToast("Failed to update WhatsApp notification status.", "error");
    }
  };

  // --- Category CRUD (Step 5) --------------------------------------------

  const openAddCategory = () => {
    setCategorySlugTouched(false);
    setCategoryDraft({ mode: "add", name: "", slug: "", icon: DEFAULT_CATEGORY_ICON });
  };

  const openEditCategory = (cat: Category) => {
    setCategorySlugTouched(true);
    setCategoryDraft({ mode: "edit", id: cat.id, name: cat.name, slug: cat.slug, icon: cat.icon });
  };

  const handleSaveCategory = async () => {
    if (!categoryDraft) return;

    const name = categoryDraft.name.trim();
    // The stored address is always a clean slug: whatever the moderator
    // typed in the name box fills the gaps (same rules as the database).
    const finalSlug = slugifyName(categoryDraft.slug.trim() || name);

    if (!name) {
      showToast("Give the category a name first.", "error");
      return;
    }
    if (!isValidSlug(finalSlug)) {
      showToast("The category address needs at least one letter or number.", "error");
      return;
    }

    const clash = categories.find((c) => c.slug === finalSlug && c.id !== categoryDraft.id);
    if (clash) {
      showToast(`"${clash.name}" already uses the address "${finalSlug}".`, "error");
      return;
    }

    // Renaming a slug changes the category's public web address — the
    // DB FK follows products along automatically, but ask once.
    const original = categories.find((c) => c.id === categoryDraft.id);
    if (
      categoryDraft.mode === "edit" &&
      original &&
      original.slug !== finalSlug &&
      !window.confirm(
        `Renaming changes this category's public address (from ?category=${original.slug} to ?category=${finalSlug}). Its products follow along. Continue?`
      )
    ) {
      return;
    }

    const icon: CategoryIcon = CATEGORY_ICONS.includes(categoryDraft.icon as CategoryIcon)
      ? (categoryDraft.icon as CategoryIcon)
      : DEFAULT_CATEGORY_ICON;

    try {
      const saved =
        categoryDraft.mode === "add"
          ? await addCategory(name, finalSlug, icon)
          : await updateCategory(categoryDraft.id as string, { name, slug: finalSlug, icon });
      if (saved) {
        showToast(
          categoryDraft.mode === "add"
            ? `Category "${saved.name}" is live for buyers.`
            : `Category "${saved.name}" updated.`,
          "success"
        );
        logConsoleAction({
          entity_type: "category",
          entity_id: saved.id,
          entity_label: saved.name,
          action: categoryDraft.mode === "add" ? "category_created" : "category_updated",
          summary:
            categoryDraft.mode === "add"
              ? `New buyer shelf "${saved.name}" created — address ?category=${saved.slug}, icon ${saved.icon}`
              : `Category details updated — ${original?.slug && original.slug !== finalSlug ? `address: ?category=${original.slug} → ?category=${finalSlug}; ` : `icon ${original?.icon ?? "?"} → ${saved.icon}`}`,
        });
        setCategoryDraft(null);
        setCategorySlugTouched(false);
        loadModerationData();
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not save the category.", "error");
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;

    // Local guard with the same words the server uses: deleting a slug
    // that holds products would bounce off the FK anyway.
    const inUse = products.filter((p) => p.category === cat.slug).length;
    if (inUse > 0) {
      showToast(`"${cat.name}" still holds ${inUse} product${inUse === 1 ? "" : "s"} — move or remove them first.`, "error");
      return;
    }

    if (!window.confirm(`Remove "${cat.name}" from MADETRUE? Its public links will disappear. This cannot be undone.`)) {
      return;
    }

    try {
      const removed = await deleteCategory(cat.id);
      if (removed) {
        showToast(`Category "${removed.name}" removed.`, "success");
        logConsoleAction({
          entity_type: "category",
          entity_id: cat.id,
          entity_label: cat.name,
          action: "category_removed",
          summary: `Category "${cat.name}" removed from the marketplace`,
        });
        loadModerationData();
      } else {
        showToast("That category could not be found.", "error");
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not remove the category.", "error");
    }
  };

  const toggleExpand = (productId: string) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId));
  };

  // Group data
  const pendingProducts = products.filter((p) => p.status === "pending");
  const approvedProducts = products.filter((p) => !p.status || p.status === "approved");
  const rejectedProducts = products.filter((p) => p.status === "rejected");

  // Moderation search (Step 3): name, maker store, category, audit note.
  // Case-insensitive and applied on top of the active queue.
  const query = productQuery.trim().toLowerCase();
  const matchesSearch = (p: Product) => {
    if (!query) return true;
    const seller = sellersMap[p.seller_id];
    return (
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      (p.moderation_note ?? "").toLowerCase().includes(query) ||
      (seller?.business_name ?? "").toLowerCase().includes(query)
    );
  };

  const currentProductsList =
    (activeTab === "pending"
      ? pendingProducts
      : activeTab === "approved"
        ? approvedProducts
        : rejectedProducts
    ).filter(matchesSearch);

  const filteredSellersList = sellersList.filter((s) => {
    if (sellerFilter === "all") return true;
    return getApplicationStatus(s) === sellerFilter;
  });

  // Order book list (Step 4): the status tab, delivery/payment filters and
  // the search box stack on top of each other; newest first by default.
  const orderNeedle = orderQuery.trim().toLowerCase();
  const matchesOrderSearch = (o: Order) => {
    if (!orderNeedle) return true;
    const maker = sellersMap[o.seller_id];
    return (
      o.id.toLowerCase().includes(orderNeedle) ||
      (o.buyer_name ?? "").toLowerCase().includes(orderNeedle) ||
      (o.buyer_phone ?? "").toLowerCase().includes(orderNeedle) ||
      (o.product_name ?? "").toLowerCase().includes(orderNeedle) ||
      (o.address ?? "").toLowerCase().includes(orderNeedle) ||
      (maker?.business_name ?? "").toLowerCase().includes(orderNeedle)
    );
  };

  const filteredOrdersList = orders
    .filter((o) => (orderFilter === "all" ? true : o.status === orderFilter))
    .filter((o) => (orderStageFilter === "all" ? true : o.delivery_type === orderStageFilter))
    .filter((o) => (orderPayFilter === "all" ? true : o.payment_method === orderPayFilter))
    .filter(matchesOrderSearch)
    .sort((a, b) =>
      orderSortDir === "newest"
        ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  const getProductCount = (tab: "pending" | "approved" | "rejected") => {
    if (tab === "pending") return pendingProducts.length;
    if (tab === "approved") return approvedProducts.length;
    if (tab === "rejected") return rejectedProducts.length;
    return 0;
  };

  const getSellerCount = (tab: "all" | "pending" | "approved" | "rejected") => {
    if (tab === "all") return sellersList.length;
    return sellersList.filter((s) => getApplicationStatus(s) === tab).length;
  };

  const getOrderCount = (tab: "all" | "pending" | "accepted" | "completed" | "cancelled") => {
    if (tab === "all") return orders.length;
    return orders.filter(o => o.status === tab).length;
  };

  // Analytics (Step 6): pure recomputation from the same loaded lists the
  // console renders (order book, moderation queue, maker registry,
  // categories) — no extra fetches, so the figures always agree with what
  // this console is showing. "Refresh" re-queries first, then recounts.
  const analytics = useMemo(
    () => computeAdminAnalytics(orders, products, sellersList, categories, getApplicationStatus),
    [orders, products, sellersList, categories]
  );

  // Check if lat/lng coords fall inside Ernakulam district (roughly lat: 9.77 to 10.30, lng: 76.16 to 77.09)
  const isCoordinatesInErnakulam = (lat?: number, lng?: number) => {
    if (!lat || !lng) return false;
    return lat >= 9.77 && lat <= 10.30 && lng >= 76.16 && lng <= 77.09;
  };

  if (checkingAuth || authLoading) {
    return (
      <div className="max-w-md mx-auto py-32 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-warm-brown">Verifying admin session credentials...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="bg-cream-bg min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-700 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-text-dark mb-2">
          Administrator Access Only
        </h2>
        <p className="text-sm text-text-dark/70 max-w-lg mb-6 leading-relaxed">
          {currentUser
            ? `You are signed in as a ${currentUser.role} (${currentUser.name}). The moderation console is restricted to verified MADETRUE platform moderators.`
            : "Administrator credentials are required to view the platform moderation console."}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/admin/login"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition"
          >
            Admin Sign In
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl border border-warm-brown/20 text-warm-brown hover:bg-white text-sm font-semibold transition"
          >
            Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream-bg min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Toast Notification Banner */}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-lg border text-sm font-semibold flex items-center space-x-2 transition duration-300 animate-slide-up ${
              toast.type === "success"
                ? "bg-primary-green/95 text-cream-bg border-primary-green"
                : "bg-red-800/95 text-cream-bg border-red-900"
            }`}
          >
            {toast.type === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Dashboard Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#FAF7F2] p-6 rounded-3xl border border-warm-brown/10 shadow-sm gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-green/10 text-primary-green rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-text-dark">Admin Control Panel</h1>
              <p className="text-xs text-text-dark/60">Moderate local goods, verify producer profiles, and coordinate hyperlocal orders.</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center px-4 py-2 border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-xl transition cursor-pointer self-start sm:self-center font-sans uppercase tracking-wider"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log Out
          </button>
        </div>

        {/* Primary Dashboard Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 bg-[#FAF7F2] p-2.5 rounded-2xl border border-warm-brown/10 shadow-sm max-w-3xl">
          <button
            onClick={() => setCurrentSection("products")}
            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer font-sans ${
              currentSection === "products"
                ? "bg-primary-green text-cream-bg shadow-sm"
                : "bg-white text-text-dark/70 border border-warm-brown/10 hover:border-warm-brown/30"
            }`}
          >
            <Tag className="h-4 w-4" /> Products
          </button>
          <button
            onClick={() => setCurrentSection("sellers")}
            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer font-sans ${
              currentSection === "sellers"
                ? "bg-primary-green text-cream-bg shadow-sm"
                : "bg-white text-text-dark/70 border border-warm-brown/10 hover:border-warm-brown/30"
            }`}
          >
            <Store className="h-4 w-4" /> Makers
          </button>
          <button
            onClick={() => setCurrentSection("categories")}
            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer font-sans ${
              currentSection === "categories"
                ? "bg-primary-green text-cream-bg shadow-sm"
                : "bg-white text-text-dark/70 border border-warm-brown/10 hover:border-warm-brown/30"
            }`}
          >
            <Layers className="h-4 w-4" /> Categories
          </button>
          <button
            onClick={() => setCurrentSection("analytics")}
            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer font-sans ${
              currentSection === "analytics"
                ? "bg-primary-green text-cream-bg shadow-sm"
                : "bg-white text-text-dark/70 border border-warm-brown/10 hover:border-warm-brown/30"
            }`}
          >
            <ChartColumn className="h-4 w-4" /> Analytics
          </button>
          <button
            onClick={() => setCurrentSection("orders")}
            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer font-sans ${
              currentSection === "orders"
                ? "bg-primary-green text-cream-bg shadow-sm"
                : "bg-white text-text-dark/70 border border-warm-brown/10 hover:border-warm-brown/30"
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> Orders
          </button>
          <button
            onClick={() => setCurrentSection("audit")}
            className={`px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer font-sans ${
              currentSection === "audit"
                ? "bg-primary-green text-cream-bg shadow-sm"
                : "bg-white text-text-dark/70 border border-warm-brown/10 hover:border-warm-brown/30"
            }`}
          >
            <History className="h-4 w-4" /> Audit
          </button>
        </div>

        {/* SECTION 1: PRODUCT LISTING MODERATION */}
        {currentSection === "products" && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Pending Review</span>
                  <p className="text-3xl font-serif font-bold text-amber-600">{pendingProducts.length}</p>
                </div>
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Clock className="h-5 w-5 animate-pulse" />
                </div>
              </div>

              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Approved Catalog</span>
                  <p className="text-3xl font-serif font-bold text-primary-green">{approvedProducts.length}</p>
                </div>
                <div className="w-10 h-10 bg-primary-green/10 text-primary-green rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Rejected Listings</span>
                  <p className="text-3xl font-serif font-bold text-red-600">{rejectedProducts.length}</p>
                </div>
                <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                  <X className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Moderation Search (Step 3) */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-warm-brown/60" />
              <input
                type="text"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Find a listing — search by product, maker store, category, or moderation note..."
                className="w-full pl-11 pr-4 py-3 bg-[#FAF7F2] border border-warm-brown/10 rounded-2xl text-sm text-text-dark placeholder:text-warm-brown/40 focus:border-primary-green focus:ring-0 focus:outline-none transition"
              />
              {productQuery && (
                <button
                  onClick={() => setProductQuery("")}
                  className="absolute right-3.5 top-3.5 text-warm-brown/50 hover:text-red-600 transition cursor-pointer"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sub Tabs */}
            <div className="flex border-b border-warm-brown/10">
              {(["pending", "approved", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-200 capitalize font-sans ${
                    activeTab === tab
                      ? "border-primary-green text-primary-green"
                      : "border-transparent text-text-dark/50 hover:text-text-dark"
                  }`}
                >
                  {tab === "pending" ? "Pending Approval" : tab === "approved" ? "Approved Catalog" : "Rejected Goods"} ({getProductCount(tab)})
                </button>
              ))}
            </div>

            {/* Product List */}
            {loading ? (
              <div className="text-center py-16 text-sm text-warm-brown font-semibold">
                Loading products for review...
              </div>
            ) : currentProductsList.length > 0 ? (
              <div className="space-y-6">
                {currentProductsList.map((product) => {
                  const seller = sellersMap[product.seller_id];
                  const isExpanded = expandedProductId === product.id;
                  const isHidden = Boolean(product.is_hidden);
                  return (
                    <div
                      key={product.id}
                      className={`bg-[#FAF7F2] rounded-3xl border overflow-hidden transition shadow-sm ${
                        isExpanded ? "border-primary-green/30 shadow-md" : "border-warm-brown/10 hover:border-primary-green/20"
                      }`}
                    >
                      {/* Product Header row */}
                      <div
                        className="flex flex-col md:flex-row cursor-pointer"
                        onClick={() => toggleExpand(product.id)}
                      >
                        <div className="relative w-full md:w-48 aspect-video md:aspect-square bg-primary-green/5 shrink-0 border-b md:border-b-0 md:border-r border-warm-brown/10">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 bg-cream-bg/95 border border-warm-brown/10 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-warm-brown shadow-sm font-sans font-semibold">
                            ₹{product.price}
                          </div>
                        </div>

                        <div className="p-5 flex-grow flex flex-col justify-between space-y-2">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center text-[10px] font-bold text-warm-brown bg-warm-brown/5 border border-warm-brown/10 px-2 py-0.5 rounded-md uppercase tracking-wider font-sans">
                                {product.category}
                              </span>
                              {isHidden && (
                                <span className="inline-flex items-center text-[9px] font-bold text-white bg-red-600/85 px-2 py-0.5 rounded-md uppercase tracking-wide font-sans">
                                  <EyeOff className="h-2.5 w-2.5 mr-1" /> Hidden from Marketplace
                                </span>
                              )}
                              {product.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center text-[9px] font-bold text-primary-green bg-primary-green/5 px-2 py-0.5 rounded-md uppercase tracking-wide font-sans"
                                >
                                  <Tag className="h-2 w-2 mr-1" /> {tag}
                                </span>
                              ))}
                            </div>

                            <div className="space-y-1">
                              <h3 className="font-serif text-lg font-bold text-text-dark">{product.name}</h3>
                              <div className="flex flex-wrap items-center text-xs font-semibold text-warm-brown gap-y-1 font-sans">
                                {seller && (
                                  <span className="flex items-center hover:text-primary-green transition">
                                    <Store className="h-3.5 w-3.5 mr-1 text-primary-green" /> {seller.business_name}
                                  </span>
                                )}
                                <span className="mx-2 text-warm-brown/30 hidden sm:inline">|</span>
                                <span className="flex items-center text-text-dark/50">
                                  <MapPin className="h-3 w-3 mr-1 text-primary-green" />
                                  {product.address
                                    ? product.address.split(",")[0]
                                    : seller
                                      ? seller.address.split(",")[0]
                                      : "Unknown Location"}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-text-dark/60 line-clamp-2 leading-relaxed">{product.description}</p>
                            {product.moderation_note && (
                              <p className="text-[10px] text-warm-brown bg-cream-bg border border-warm-brown/10 rounded-lg px-2.5 py-1.5 leading-relaxed">
                                <b>Moderation note:</b> {product.moderation_note}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-[10px] text-text-dark/40 font-bold uppercase font-sans">
                              Submitted: {new Date(product.created_at).toLocaleDateString()}
                            </span>
                            <span className="inline-flex items-center text-xs font-semibold text-primary-green font-sans">
                              {isExpanded ? (
                                <><ChevronUp className="h-4 w-4 mr-1" /> Collapse Details</>
                              ) : (
                                <><Eye className="h-4 w-4 mr-1" /> View Full Details</>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-warm-brown/10 bg-white/50 p-6 space-y-6 animate-fadeIn">
                          {product.images.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center font-sans">
                                <ImageIcon className="h-3.5 w-3.5 mr-1.5 text-primary-green" /> Product Images ({product.images.length})
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                                {product.images.map((img, idx) => (
                                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-warm-brown/10 bg-primary-green/5 group">
                                    <img src={img} alt={`${product.name} image ${idx + 1}`} className="w-full h-full object-cover transition group-hover:scale-105" />
                                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 text-[8px] bg-black/60 text-white rounded font-bold font-sans">#{idx + 1}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="space-y-1.5">
                                <span className="text-xs font-bold text-warm-brown uppercase tracking-wider block font-sans">Maker&apos;s Product Story</span>
                                <p className="text-xs text-text-dark/80 leading-relaxed bg-cream-bg p-3.5 rounded-xl border border-warm-brown/5 italic">
                                  &quot;{product.description}&quot;
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <span className="text-xs font-bold text-warm-brown uppercase tracking-wider block font-sans">Raw Origin & Sourcing Details</span>
                                <p className="text-xs text-text-dark/70 leading-relaxed bg-cream-bg p-3.5 rounded-xl border border-warm-brown/5">
                                  {product.origin_details}
                                </p>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-cream-bg p-3 rounded-xl border border-warm-brown/5 text-center">
                                  <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Price</span>
                                  <span className="text-sm font-bold text-primary-green font-sans">₹{product.price}</span>
                                </div>
                                <div className="bg-cream-bg p-3 rounded-xl border border-warm-brown/5 text-center">
                                  <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Stock</span>
                                  <span className="text-sm font-bold text-text-dark font-sans">{product.stock} units</span>
                                </div>
                                <div className="bg-cream-bg p-3 rounded-xl border border-warm-brown/5 text-center">
                                  <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Available</span>
                                  <span className={`text-sm font-bold font-sans ${product.is_available ? "text-primary-green" : "text-red-600"}`}>
                                    {product.is_available ? "Yes" : "No"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center font-sans">
                                  <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary-green" /> Sourcing Location & Coordinates
                                </span>
                                <div className="bg-cream-bg p-4 rounded-xl border border-warm-brown/5 space-y-3">
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] font-bold text-warm-brown/70 uppercase tracking-wider font-sans">Physical Address</span>
                                    <p className="text-xs text-text-dark font-semibold leading-relaxed">{product.address || "No address submitted"}</p>
                                  </div>
                                  {product.lat && product.lng ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                          <span className="text-[9px] font-bold text-warm-brown/70 uppercase tracking-wider font-sans">Coordinates</span>
                                          <p className="text-xs text-text-dark font-mono font-semibold">{product.lat.toFixed(6)}, {product.lng.toFixed(6)}</p>
                                        </div>
                                        <a
                                          href={`https://www.google.com/maps?q=${product.lat},${product.lng}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center px-3 py-1.5 bg-primary-green/10 text-primary-green text-[10px] font-bold rounded-lg hover:bg-primary-green/20 transition uppercase tracking-wider font-sans"
                                        >
                                          <Navigation className="h-3 w-3 mr-1" /> View on Maps
                                        </a>
                                      </div>

                                      {isCoordinatesInErnakulam(product.lat, product.lng) ? (
                                        <div className="flex items-center text-[10px] font-bold text-primary-green bg-primary-green/10 border border-primary-green/20 px-3 py-1.5 rounded-lg font-sans">
                                          <CheckCircle className="h-3 w-3 mr-1.5" /> Inside Ernakulam District (Deliverable Boundary)
                                        </div>
                                      ) : (
                                        <div className="flex items-center text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg font-sans">
                                          <AlertTriangle className="h-3 w-3 mr-1.5" /> Outside Ernakulam Boundary (Validation Alert)
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-sans">
                                      <AlertTriangle className="h-3 w-3 mr-1.5" /> No physical coordinates submitted
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Document Proofs */}
                              <div className="space-y-2">
                                <span className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center font-sans">
                                  <FileText className="h-3.5 w-3.5 mr-1.5 text-primary-green" /> Verification Proof Documents ({product.documents?.length || 0})
                                </span>
                                {product.documents && product.documents.length > 0 ? (
                                  <div className="space-y-2">
                                    {product.documents.map((doc, idx) => (
                                      <div key={idx} className="bg-cream-bg border border-warm-brown/10 rounded-xl overflow-hidden p-3 flex justify-between items-center">
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                          <FileText className="h-4 w-4 text-primary-green" />
                                          <span className="text-xs font-semibold text-text-dark truncate max-w-[200px]">{doc.name}</span>
                                        </div>
                                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1 bg-primary-green/10 text-primary-green text-[10px] font-bold rounded-lg hover:bg-primary-green/20 transition uppercase tracking-wider font-sans">Open</a>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="bg-cream-bg border border-amber-200 rounded-xl p-3 text-xs text-amber-700 flex items-center gap-1.5 font-sans">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span>No regulatory certificates submitted. Review is required.</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-warm-brown/10 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[9px] text-text-dark/40 font-bold uppercase font-sans">Product ID: {product.id}</span>
                            <div className="flex items-center space-x-2 flex-wrap">
                              {activeTab !== "approved" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleApproval(product.id, "approved"); }}
                                  className="inline-flex items-center justify-center px-4 py-2 bg-primary-green hover:bg-[#224f3b] text-cream-bg text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" /> Approve Listing
                                </button>
                              )}
                              {activeTab !== "rejected" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleApproval(product.id, "rejected"); }}
                                  className="inline-flex items-center justify-center px-4 py-2 border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-xl transition cursor-pointer font-sans"
                                >
                                  <X className="h-3.5 w-3.5 mr-1" /> Reject Listing
                                </button>
                              )}
                              {activeTab === "rejected" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleApproval(product.id, "pending"); }}
                                  className="inline-flex items-center justify-center px-4 py-2 border border-warm-brown/30 hover:bg-warm-brown/5 text-xs font-bold text-warm-brown rounded-xl transition cursor-pointer font-sans"
                                >
                                  <Clock className="h-3.5 w-3.5 mr-1" /> Send to Re-review
                                </button>
                              )}
                              {/* Moderation overlay controls (Step 3) */}
                              {product.status === "approved" && !isHidden && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSetProductHidden(product.id, true); }}
                                  className="inline-flex items-center justify-center px-4 py-2 border border-amber-200 hover:bg-amber-50 text-xs font-bold text-amber-700 rounded-xl transition cursor-pointer font-sans"
                                >
                                  <EyeOff className="h-3.5 w-3.5 mr-1" /> Hide
                                </button>
                              )}
                              {isHidden && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleSetProductHidden(product.id, false); }}
                                  className="inline-flex items-center justify-center px-4 py-2 border border-primary-green/30 hover:bg-primary-green/5 text-xs font-bold text-primary-green rounded-xl transition cursor-pointer font-sans"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" /> Unhide
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveProduct(product.id); }}
                                className="inline-flex items-center justify-center px-4 py-2 border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-xl transition cursor-pointer font-sans"
                                title="Permanently remove this listing"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#FAF7F2] border border-warm-brown/10 rounded-3xl space-y-4">
                <Inbox className="h-12 w-12 text-warm-brown/40 mx-auto" />
                <h3 className="font-serif text-lg font-bold text-text-dark">
                  {productQuery ? "No Listings Matched Your Search" : "Approval Queue is Empty"}
                </h3>
                <p className="text-xs text-text-dark/60 max-w-xs mx-auto leading-relaxed">
                  {productQuery
                    ? "Try a different name, maker store, or category — nothing in this queue matches right now."
                    : "No products matched this queue."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: PRODUCER (SELLER) VERIFICATION */}
        {currentSection === "sellers" && (
          <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex border-b border-warm-brown/10 overflow-x-auto whitespace-nowrap scrollbar-none">
              {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSellerFilter(tab)}
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-200 capitalize font-sans ${
                    sellerFilter === tab
                      ? "border-primary-green text-primary-green"
                      : "border-transparent text-text-dark/50 hover:text-text-dark"
                  }`}
                >
                  {tab === "all" ? "All Makers" : tab === "pending" ? "Pending Review" : `${tab} Makers`} ({getSellerCount(tab)})
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-16 text-sm text-warm-brown font-semibold">
                Loading maker profile registries...
              </div>
            ) : filteredSellersList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredSellersList.map((seller) => {
                  const makerProducts = products.filter((p) => p.seller_id === seller.id);
                  const inErnakulam = isCoordinatesInErnakulam(seller.lat, seller.lng);
                  const applicationStatus = getApplicationStatus(seller);
                  const payout = payoutsMap[seller.id] ?? {};
                  return (
                    <div key={seller.id} className="bg-[#FAF7F2] rounded-3xl border border-warm-brown/10 p-6 space-y-5 shadow-sm hover:border-primary-green/20 transition">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-primary-green/10 text-primary-green font-serif text-xl font-bold flex items-center justify-center shrink-0">
                          {seller.profile_photo_url ? (
                            <img src={seller.profile_photo_url} alt={seller.business_name} className="w-full h-full object-cover" />
                          ) : (
                            seller.business_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 flex-grow">
                          <h3 className="font-serif text-lg font-bold text-text-dark truncate flex items-center gap-1.5">
                            {seller.business_name}
                            {applicationStatus === "approved" && seller.is_verified && <Award className="h-4.5 w-4.5 text-primary-green fill-primary-green/10" />}
                          </h3>
                          <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-sans ${
                            applicationStatus === "approved"
                              ? "bg-primary-green/15 text-primary-green"
                              : applicationStatus === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                          }`}>
                            {applicationStatus === "approved"
                              ? "Approved Maker"
                              : applicationStatus === "rejected"
                                ? "Application Rejected"
                                : "Pending Review"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Maker&apos;s Story / Profile Summary</span>
                        <p className="text-xs text-text-dark/80 leading-relaxed italic">&quot;{seller.story}&quot;</p>
                      </div>

                      <div className="bg-cream-bg p-4 rounded-2xl border border-warm-brown/5 space-y-2">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-warm-brown/60 uppercase tracking-wider font-sans">Registered Coordinates & Address</span>
                          <p className="text-xs text-text-dark font-semibold leading-relaxed">{seller.address}</p>
                          <div className="flex items-center justify-between text-[10px] text-text-dark/50 pt-1.5 font-sans">
                            <span className="font-mono">{seller.lat.toFixed(5)}, {seller.lng.toFixed(5)}</span>
                            <a 
                              href={`https://www.google.com/maps?q=${seller.lat},${seller.lng}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary-green hover:underline inline-flex items-center"
                            >
                              Open Maps <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                            </a>
                          </div>
                        </div>

                        {inErnakulam ? (
                          <div className="flex items-center text-[9.5px] font-bold text-primary-green font-sans">
                            <CheckCircle className="h-3 w-3 mr-1" /> Maker Registry is within Ernakulam district boundary
                          </div>
                        ) : (
                          <div className="flex items-center text-[9.5px] font-bold text-red-600 font-sans">
                            <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Warning: Maker location is outside Ernakulam district
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-warm-brown/5">
                        <div className="text-[10px] font-bold text-warm-brown/70 font-sans font-semibold">
                          Products Listed: <span className="text-text-dark font-bold">{makerProducts.length}</span>
                        </div>
                        <a 
                          href={`https://wa.me/91${seller.whatsapp_number.replace(/\D/g, "")}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] font-bold text-primary-green hover:underline font-sans"
                        >
                          WhatsApp Contact: +91 {seller.whatsapp_number}
                        </a>
                      </div>

                      {/* Payout KYC Details (Cashfree Easy Split) — hydrated
                          from the private seller_payout_kyc table */}
                      <div className="bg-cream-bg p-3.5 rounded-2xl border border-warm-brown/5 space-y-1.5 font-sans">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider flex items-center">
                            <CreditCard className="h-3 w-3 mr-1 text-primary-green" /> Payout KYC Details
                          </span>
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            seller.kyc_status === "verified"
                              ? "bg-primary-green/15 text-primary-green"
                              : seller.kyc_status === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-800"
                          }`}>
                            KYC: {seller.kyc_status || (applicationStatus === "approved" ? "verified" : "pending")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          <div>
                            <span className="text-[8px] font-bold text-warm-brown/60 uppercase block">PAN</span>
                            <span className="font-mono font-bold text-text-dark">{payout.pan || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-warm-brown/60 uppercase block">Bank Account</span>
                            <span className="font-mono font-bold text-text-dark">
                              {payout.bank_account_number ? `••••${payout.bank_account_number.slice(-4)}` : "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-warm-brown/60 uppercase block">IFSC</span>
                            <span className="font-mono font-bold text-text-dark">{payout.bank_ifsc || "—"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] font-bold text-warm-brown/60 uppercase block">Holder</span>
                            <span className="font-medium text-text-dark truncate block" title={payout.bank_account_holder}>
                              {payout.bank_account_holder || seller.business_name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-warm-brown/5">
                          <span className="text-warm-brown/70 font-semibold">Easy Split Vendor ID:</span>
                          <span className="font-mono font-bold text-text-dark">
                            {seller.payment_vendor_ref || "Not registered yet"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2 pt-2.5">
                        {applicationStatus === "approved" && (
                          <>
                            <button
                              onClick={() => handleRegisterVendor(seller.id)}
                              disabled={registeringVendorId === seller.id}
                              className="px-3.5 py-2 bg-warm-brown/10 hover:bg-warm-brown/15 text-warm-brown text-xs font-bold rounded-xl transition cursor-pointer font-sans disabled:opacity-50"
                            >
                              {registeringVendorId === seller.id
                                ? "Registering..."
                                : seller.kyc_status === "failed"
                                  ? "Retry Gateway Onboarding"
                                  : seller.payment_vendor_ref
                                    ? "Sync Gateway Vendor"
                                    : "Register Gateway Vendor"}
                            </button>
                            <button
                              onClick={() => handleSellerApplication(seller.id, "revoke")}
                              className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                            >
                              Revoke Approval
                            </button>
                          </>
                        )}
                        {applicationStatus === "rejected" && (
                          <button
                            onClick={() => handleSellerApplication(seller.id, "reopen")}
                            className="px-4 py-2 border border-warm-brown/20 hover:bg-warm-brown/5 text-warm-brown text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                          >
                            Reopen (Back to Pending)
                          </button>
                        )}
                        {applicationStatus === "pending" && (
                          <>
                            <button
                              onClick={() => handleSellerApplication(seller.id, "reject")}
                              className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                            >
                              Reject Application
                            </button>
                            <button
                              onClick={() => handleSellerApplication(seller.id, "approve")}
                              className="px-4 py-2 bg-primary-green hover:bg-[#224f3b] text-cream-bg text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                            >
                              Approve Maker
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#FAF7F2] border border-warm-brown/10 rounded-3xl space-y-4">
                <Users className="h-12 w-12 text-warm-brown/40 mx-auto" />
                <h3 className="font-serif text-lg font-bold text-text-dark">No Producers Registered</h3>
                <p className="text-xs text-text-dark/60 max-w-xs mx-auto leading-relaxed">No maker profiles found matching this query.</p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: CATEGORY MANAGEMENT (Step 5) */}
        {currentSection === "categories" && (
          <div className="space-y-6">
            {/* Header + Add CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] p-5 rounded-3xl border border-warm-brown/10 shadow-sm">
              <div className="space-y-1">
                <h2 className="font-serif text-lg font-bold text-text-dark">Marketplace Categories</h2>
                <p className="text-xs text-text-dark/60 leading-relaxed max-w-lg">
                  Buyers browse by these tiles. The homepage, listing filters, and footer links all follow the names and web addresses kept here — they update everywhere the moment you save.
                </p>
              </div>
              <button
                onClick={openAddCategory}
                disabled={!!categoryDraft}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-green hover:bg-[#224f3b] disabled:opacity-50 text-cream-bg text-xs font-bold rounded-xl transition cursor-pointer font-sans shrink-0 self-start"
              >
                <Layers className="h-3.5 w-3.5" /> Add a Category
              </button>
            </div>

            {/* Add / Edit draft form */}
            {categoryDraft && (
              <div className="bg-white/60 border border-primary-green/25 rounded-3xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-text-dark">
                    {categoryDraft.mode === "add"
                      ? "Introduce a New Category"
                      : `Editing "${categoryDraft.name}"`}
                  </h3>
                  <button
                    onClick={() => setCategoryDraft(null)}
                    className="text-warm-brown/50 hover:text-red-600 transition cursor-pointer p-1"
                    title="Discard changes"
                    aria-label="Discard category form"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label htmlFor="category-name" className="block space-y-1.5">
                    <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider font-sans">Category Name</span>
                    <input
                      id="category-name"
                      type="text"
                      value={categoryDraft.name}
                      onChange={(e) =>
                        setCategoryDraft((prev) =>
                          prev
                            ? { ...prev, name: e.target.value, slug: categorySlugTouched ? prev.slug : slugifyName(e.target.value) }
                            : prev
                        )
                      }
                      placeholder="e.g. Handwoven Textiles"
                      className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-warm-brown/10 rounded-xl text-sm text-text-dark placeholder:text-warm-brown/40 focus:border-primary-green focus:outline-none transition"
                    />
                  </label>
                  <label htmlFor="category-slug" className="block space-y-1.5">
                    <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider font-sans">Web Address (Slug)</span>
                    <input
                      id="category-slug"
                      type="text"
                      value={categoryDraft.slug}
                      onChange={(e) => {
                        setCategorySlugTouched(true);
                        setCategoryDraft((prev) => (prev ? { ...prev, slug: e.target.value } : prev));
                      }}
                      placeholder="handwoven-textiles"
                      className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-warm-brown/10 rounded-xl text-sm font-mono text-text-dark placeholder:text-warm-brown/40 focus:border-primary-green focus:outline-none transition"
                    />
                    <span className="text-[8px] text-text-dark/40 font-mono block">/products?category={categoryDraft.slug || "…"}</span>
                  </label>
                  <label htmlFor="category-icon" className="block space-y-1.5">
                    <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider font-sans">Tile Icon</span>
                    <select
                      id="category-icon"
                      value={categoryDraft.icon}
                      onChange={(e) =>
                        setCategoryDraft((prev) => (prev ? { ...prev, icon: e.target.value } : prev))
                      }
                      className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-warm-brown/10 rounded-xl text-sm text-text-dark cursor-pointer focus:border-primary-green focus:outline-none transition"
                    >
                      {CATEGORY_ICONS.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <span className="flex items-center gap-1.5 text-[9px] text-warm-brown/70 font-sans">
                      <span className="w-5 h-5 bg-primary-green/10 text-primary-green rounded-md flex items-center justify-center">
                        {(() => {
                          const DraftIcon = CATEGORY_ICON_COMPONENTS[categoryDraft.icon] || CATEGORY_ICON_COMPONENTS.Leaf;
                          return <DraftIcon className="h-3 w-3" />;
                        })()}
                      </span>
                      Preview on the buyer tiles
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setCategoryDraft(null)}
                    className="px-4 py-2 border border-warm-brown/20 hover:bg-warm-brown/5 text-warm-brown text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCategory}
                    className="px-5 py-2 bg-primary-green hover:bg-[#224f3b] text-cream-bg text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                  >
                    {categoryDraft.mode === "add" ? "Create Category" : "Save Changes"}
                  </button>
                </div>
              </div>
            )}

            {/* Category list */}
            {loading ? (
              <div className="text-center py-16 text-sm text-warm-brown font-semibold">
                Loading the category shelves...
              </div>
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const inUse = products.filter((p) => p.category === cat.slug).length;
                  const IconComponent = CATEGORY_ICON_COMPONENTS[cat.icon] || Leaf;
                  return (
                    <div
                      key={cat.id}
                      className="bg-[#FAF7F2] rounded-3xl border border-warm-brown/10 p-5 space-y-4 shadow-sm hover:border-primary-green/20 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 bg-primary-green/10 text-primary-green rounded-xl flex items-center justify-center shrink-0">
                          <IconComponent className="h-5 w-5" />
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full font-sans ${
                            inUse > 0
                              ? "bg-primary-green/10 text-primary-green"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {inUse === 0 ? "No products yet" : `${inUse} product${inUse === 1 ? "" : "s"}`}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif text-base font-bold text-text-dark">{cat.name}</h3>
                        <p className="text-[10px] font-mono text-text-dark/50 truncate" title={`/products?category=${cat.slug}`}>
                          /products?category={cat.slug}
                        </p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-warm-brown/5">
                        <span className="text-[9px] text-text-dark/40 font-bold uppercase font-sans">
                          ID: <span className="font-mono">{cat.id}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditCategory(cat)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-warm-brown/20 hover:bg-warm-brown/5 text-warm-brown text-[10px] font-bold rounded-lg transition cursor-pointer font-sans"
                          >
                            <PenLine className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-[10px] font-bold rounded-lg transition cursor-pointer font-sans"
                          >
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#FAF7F2] border border-warm-brown/10 rounded-3xl space-y-4">
                <Inbox className="h-12 w-12 text-warm-brown/40 mx-auto" />
                <h3 className="font-serif text-lg font-bold text-text-dark">No Categories Yet</h3>
                <p className="text-xs text-text-dark/60 max-w-xs mx-auto leading-relaxed">
                  The homepage wants its shelves — introduce the first category so buyers have somewhere to wander.
                </p>
                <button
                  onClick={openAddCategory}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-green hover:bg-[#224f3b] text-cream-bg text-xs font-bold rounded-xl transition cursor-pointer font-sans"
                >
                  <Layers className="h-3.5 w-3.5" /> Add a Category
                </button>
              </div>
            )}
          </div>
        )}

        {/* SECTION 5: PLATFORM ANALYTICS (Step 6) */}
        {currentSection === "analytics" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] p-5 rounded-3xl border border-warm-brown/10 shadow-sm">
              <div className="space-y-1">
                <h2 className="font-serif text-lg font-bold text-text-dark">Platform Analytics</h2>
                <p className="text-xs text-text-dark/60 leading-relaxed max-w-lg">
                  Counted straight from the order book, moderation queues, and maker registry loaded for this console — the same lists these tabs show. Cancelled orders never enter the money figures.
                </p>
              </div>
              <button
                onClick={loadModerationData}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-green hover:bg-[#224f3b] disabled:opacity-50 text-cream-bg text-xs font-bold rounded-xl transition cursor-pointer font-sans shrink-0 self-start"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Figures
              </button>
            </div>

            {/* Platform money */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Gross Marketplace Value</span>
                  <p className="text-3xl font-serif font-bold text-primary-green">₹{analytics.gmv}</p>
                  <span className="text-[9px] text-text-dark/40 font-sans font-semibold block">items + delivery, cancels excluded</span>
                </div>
                <div className="w-10 h-10 bg-primary-green/10 text-primary-green rounded-xl flex items-center justify-center shrink-0">
                  <ChartColumn className="h-5 w-5" />
                </div>
              </div>
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Platform Commission</span>
                  <p className="text-3xl font-serif font-bold text-accent-gold">₹{analytics.commission}</p>
                  <span className="text-[9px] text-text-dark/40 font-sans font-semibold block">per-unit commission × quantity</span>
                </div>
                <div className="w-10 h-10 bg-accent-gold/10 text-accent-gold rounded-xl flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Delivery Fees Collected</span>
                  <p className="text-3xl font-serif font-bold text-warm-brown">₹{analytics.deliveryRevenue}</p>
                  <span className="text-[9px] text-text-dark/40 font-sans font-semibold block">₹49 per delivery basket, once</span>
                </div>
                <div className="w-10 h-10 bg-warm-brown/10 text-warm-brown rounded-xl flex items-center justify-center shrink-0">
                  <Navigation className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Order + listing pulse */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm space-y-1">
                <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Orders Today</span>
                <p className="text-2xl font-serif font-bold text-text-dark">{analytics.todayOrders}</p>
                <span className="text-[9px] text-text-dark/40 font-sans font-semibold block">your local day</span>
              </div>
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm space-y-1">
                <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Awaiting Action</span>
                <p className="text-2xl font-serif font-bold text-amber-600">{analytics.pendingOrders}</p>
                <span className="text-[9px] text-text-dark/40 font-sans font-semibold block">{analytics.acceptedOrders} accepted in progress</span>
              </div>
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm space-y-1">
                <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Listings In Review</span>
                <p className="text-2xl font-serif font-bold text-amber-600">{analytics.pendingListings}</p>
                <span className="text-[9px] text-text-dark/40 font-sans font-semibold block">{analytics.rejectedListings} rejected · {analytics.pendingApplications} maker reviews open</span>
              </div>
              <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm space-y-1">
                <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Hidden Listings</span>
                <p className="text-2xl font-serif font-bold text-red-600">{analytics.hiddenListings}</p>
                <span className="text-[9px] text-text-dark/40 font-sans font-semibold block">{analytics.approvedListings} approved &amp; visible</span>
              </div>
            </div>

            {/* Snapshot strip */}
            <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-warm-brown/10 shadow-sm flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs font-semibold text-text-dark/70 font-sans">
              <span className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5 text-primary-green" /> {analytics.approvedMakers} approved makers</span>
              <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5 text-primary-green" /> {analytics.totalListings} listings registered</span>
              <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-primary-green" /> {analytics.categories} categories live</span>
              <span className="flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5 text-primary-green" /> {analytics.totalOrders} orders on file ({analytics.completedOrders} completed · {analytics.cancelledOrders} cancelled)</span>
            </div>

            {/* Top makers */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center font-sans">
                <Award className="h-3.5 w-3.5 mr-1.5 text-accent-gold" /> Top Makers This Marketplace Runs On
              </h3>

              <div className="hidden lg:grid grid-cols-[3rem,2fr,1fr,1fr,1.2fr,1.2fr] gap-3 px-5 text-[9px] font-bold uppercase tracking-wider text-warm-brown/60 font-sans">
                <span>#</span><span>Maker</span><span>Listings</span><span>Orders</span><span>Maker Revenue</span><span>Commission</span>
              </div>

              {analytics.leaders.map((leader: MakerLeaderRow, index) => (
                <div
                  key={leader.sellerId}
                  className={`bg-[#FAF7F2] rounded-2xl border p-4 lg:px-5 lg:py-3 shadow-sm grid grid-cols-2 sm:grid-cols-[3rem,2fr,1fr,1fr,1.2fr,1.2fr] gap-2 lg:gap-3 lg:items-center ${
                    index === 0 ? "border-accent-gold/40" : "border-warm-brown/10"
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-serif font-bold ${
                    index === 0 ? "bg-accent-gold text-white" : "bg-warm-brown/10 text-warm-brown"
                  }`}>
                    {index + 1}
                  </span>
                  <div className="col-span-1 min-w-0">
                    <p className="text-sm font-bold text-text-dark font-sans truncate" title={leader.name}>{leader.name}</p>
                    <p className="text-[9px] text-text-dark/40 font-mono truncate sm:block hidden">{leader.sellerId}</p>
                  </div>
                  {([
                    { label: "Listings", value: leader.products },
                    { label: "Orders", value: leader.orders },
                    { label: "Revenue", value: `₹${leader.revenue}` },
                    { label: "Commission", value: `₹${leader.commission}` },
                  ] as const).map((cell) => (
                    <div key={cell.label} className="space-y-0.5">
                      <span className="lg:hidden text-[8px] font-bold text-warm-brown/60 uppercase tracking-wider font-sans block">{cell.label}</span>
                      <span className="text-sm font-bold text-text-dark font-sans">{cell.value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: HYPERLOCAL ORDER & DELIVERY MONITORING */}
        {currentSection === "orders" && (
          <div className="space-y-6">
            {/* Sub Tabs */}
            <div className="flex border-b border-warm-brown/10 overflow-x-auto whitespace-nowrap scrollbar-none">
              {(["all", "pending", "accepted", "completed", "cancelled"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setOrderFilter(tab)}
                  className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-200 capitalize font-sans ${
                    orderFilter === tab
                      ? "border-primary-green text-primary-green"
                      : "border-transparent text-text-dark/50 hover:text-text-dark"
                  }`}
                >
                  {tab === "all" ? "All Orders" : `${tab} orders`} ({getOrderCount(tab)})
                </button>
              ))}
            </div>

            {/* Order book search + filters (Step 4): stacked on top of the
                active status tab — the tab counts stay unfiltered and honest. */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-warm-brown/60" />
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Search the order book — buyer, phone, item, maker store, address, or order ID..."
                  className="w-full pl-11 pr-4 py-3 bg-[#FAF7F2] border border-warm-brown/10 rounded-2xl text-sm text-text-dark placeholder:text-warm-brown/40 focus:border-primary-green focus:ring-0 focus:outline-none transition"
                />
                {orderQuery && (
                  <button
                    onClick={() => setOrderQuery("")}
                    className="absolute right-3.5 top-3.5 text-warm-brown/50 hover:text-red-600 transition cursor-pointer"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <select
                  aria-label="Filter orders by fulfillment type"
                  value={orderStageFilter}
                  onChange={(e) => setOrderStageFilter(e.target.value as typeof orderStageFilter)}
                  className="py-3 px-4 bg-[#FAF7F2] border border-warm-brown/10 rounded-2xl text-xs font-semibold text-text-dark cursor-pointer focus:border-primary-green focus:outline-none transition"
                >
                  <option value="all">All fulfillment types</option>
                  <option value="delivery">Delivery orders</option>
                  <option value="pickup">Pickup orders</option>
                </select>
                <select
                  aria-label="Filter orders by payment method"
                  value={orderPayFilter}
                  onChange={(e) => setOrderPayFilter(e.target.value as typeof orderPayFilter)}
                  className="py-3 px-4 bg-[#FAF7F2] border border-warm-brown/10 rounded-2xl text-xs font-semibold text-text-dark cursor-pointer focus:border-primary-green focus:outline-none transition"
                >
                  <option value="all">All payment methods</option>
                  <option value="upi">UPI / Online</option>
                  <option value="cod">Cash on Delivery</option>
                </select>
                <button
                  onClick={() => setOrderSortDir((prev) => (prev === "newest" ? "oldest" : "newest"))}
                  className="inline-flex items-center gap-1.5 py-3 px-4 bg-[#FAF7F2] border border-warm-brown/10 rounded-2xl text-xs font-semibold text-warm-brown hover:border-primary-green/30 hover:text-primary-green transition cursor-pointer font-sans"
                  title="Flip the sort direction of the order list"
                >
                  <ArrowDownUp className="h-3.5 w-3.5" />
                  {orderSortDir === "newest" ? "Newest first" : "Oldest first"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16 text-sm text-warm-brown font-semibold">
                Loading community order journals...
              </div>
            ) : filteredOrdersList.length > 0 ? (
              <div className="space-y-4">
                {filteredOrdersList.map((order) => {
                  const cleanPhone = (order.buyer_phone ?? "").replace(/\D/g, "");
                  const isDestinationValid = isCoordinatesInErnakulam(order.lat, order.lng);
                  const isExpanded = expandedOrderId === order.id;
                  const money = orderMoney(order);
                  const statusColors = {
                    pending: "bg-amber-100 text-amber-800 border-amber-200",
                    accepted: "bg-blue-100 text-blue-800 border-blue-200",
                    completed: "bg-primary-green/15 text-primary-green border-primary-green/20",
                    cancelled: "bg-red-50 text-red-600 border-red-100"
                  };
                  return (
                    <div key={order.id} className={`bg-[#FAF7F2] rounded-3xl border p-5 sm:p-6 shadow-sm transition space-y-4 ${isExpanded ? "border-primary-green/30 shadow-md" : "border-warm-brown/10 hover:border-primary-green/20"}`}>
                      {/* Collapsed order-book row (Step 4) */}
                      <div
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                        onClick={() => setExpandedOrderId((prev) => (prev === order.id ? null : order.id))}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border font-sans ${statusColors[order.status as keyof typeof statusColors] || "bg-warm-brown/5 text-warm-brown"}`}>
                              {order.status}
                            </span>
                            <span className="font-mono text-[10px] text-text-dark/40 truncate max-w-[13rem]" title={order.id}>{order.id}</span>
                          </div>
                          <h3 className="font-serif text-base font-bold text-text-dark truncate">
                            {order.product_name ?? "Custom basket"}
                          </h3>
                          <p className="text-[11px] text-text-dark/60 font-sans font-semibold truncate">
                            {sellersMap[order.seller_id]?.business_name ?? order.seller_id} → {order.buyer_name ?? "Guest buyer"}
                          </p>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 shrink-0">
                          <span className="text-lg font-serif font-bold text-primary-green">₹{money.total}</span>
                          <span className="text-[10px] text-text-dark/50 font-semibold font-sans flex items-center">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            {new Date(order.created_at).toLocaleString()}
                          </span>
                          <span className="inline-flex items-center text-xs font-semibold text-primary-green font-sans">
                            {isExpanded ? (
                              <><ChevronUp className="h-4 w-4 mr-1" /> Collapse Details</>
                            ) : (
                              <><Eye className="h-4 w-4 mr-1" /> View Full Details</>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (<>

                      {/* Main grids */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 1. Buyer & Product Details */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Consumer (Buyer)</span>
                            <p className="text-xs text-text-dark font-bold">{order.buyer_name ?? "Guest buyer"}</p>
                            <p className="text-[9px] text-text-dark/40 font-mono truncate" title={order.buyer_id}>Buyer: {order.buyer_id}</p>
                            <a 
                              href={`https://wa.me/91${cleanPhone}?text=Hello%20${encodeURIComponent(order.buyer_name ?? "")},%20this%20is%20MADETRUE%20Admin%20regarding%20your%20order%20${order.id}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10.5px] font-semibold text-primary-green hover:underline block font-sans"
                            >
                              WhatsApp Contact: +91 {order.buyer_phone}
                            </a>
                          </div>

                          <div className="space-y-1 pt-1.5 border-t border-warm-brown/5">
                            <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Item Details</span>
                            <p className="text-xs font-bold text-text-dark leading-tight">{order.product_name ?? "Custom basket"}</p>
                            <p className="text-[9px] text-text-dark/40 font-mono truncate" title={order.product_id}>Product: {order.product_id}</p>
                            <div className="text-[11px] text-text-dark/60 font-sans">
                              Quantity: <span className="font-bold text-text-dark">{order.quantity}</span> | Price: ₹{order.price ?? 0}
                            </div>
                            <div className="text-[10px] text-text-dark/70 font-sans border-t border-dashed border-warm-brown/10 pt-1 mt-1 space-y-0.5">
                              <div>Item Subtotal: ₹{money.subtotal}</div>
                              <div>Seller Share: ₹{money.sellerShare}</div>
                              <div>Admin Commission: ₹{money.commission}</div>
                              <div>Delivery Fee: {order.delivery_type === "delivery" ? `₹${money.deliveryFee}` : "Free (pickup)"}</div>
                            </div>
                            <div className="text-xs font-bold text-primary-green font-sans">
                              Order Total: ₹{money.total}
                            </div>
                          </div>
                        </div>

                        {/* 2. Sourcing Maker & Destination Coordinates */}
                        <div className="space-y-3 md:border-l md:border-r border-warm-brown/5 md:px-6">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Registered Maker ID</span>
                            <span className="text-xs text-text-dark/70 font-mono block truncate">{order.seller_id}</span>
                            {sellersMap[order.seller_id] && (
                              <p className="text-xs text-text-dark font-bold mt-1 font-sans font-semibold">
                                Producer: <span className="text-primary-green">{sellersMap[order.seller_id].business_name}</span>
                              </p>
                            )}
                          </div>

                          <div className="space-y-1 pt-1.5 border-t border-warm-brown/5">
                            <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Fulfillment Parameters</span>
                            <div className="text-xs font-bold text-text-dark capitalize font-sans font-semibold">Method: {order.delivery_type}</div>
                            <div className="text-[11px] text-text-dark/60 font-sans">Method: {order.payment_method === "cod" ? "Cash on Delivery" : "UPI / Scan & Pay"}</div>
                          </div>
                        </div>

                        {/* 3. Delivery Coordinate Boundary and Location Map */}
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block font-sans">Shipping Destination Address</span>
                            <p className="text-xs text-text-dark font-semibold leading-relaxed line-clamp-2">{order.address}</p>
                            {order.lat && order.lng && (
                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] font-mono text-text-dark/50">{order.lat.toFixed(5)}, {order.lng.toFixed(5)}</span>
                                <a 
                                  href={`https://www.google.com/maps?q=${order.lat},${order.lng}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] font-bold text-primary-green hover:underline inline-flex items-center font-sans"
                                >
                                  Pin on Maps <Navigation className="h-3 w-3 ml-0.5" />
                                </a>
                              </div>
                            )}
                          </div>

                          {order.delivery_type === "delivery" && (
                            <div className="pt-1">
                              {isDestinationValid ? (
                                <div className="inline-flex items-center text-[9.5px] font-bold text-primary-green bg-primary-green/10 border border-primary-green/20 px-2 py-1 rounded-md font-sans">
                                  <CheckCircle className="h-3 w-3 mr-1" /> Destination in Ernakulam Boundary
                                </div>
                              ) : (
                                <div className="inline-flex items-center text-[9.5px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-md font-sans">
                                  <ShieldAlert className="h-3.5 w-3.5 mr-1" /> Outside Ernakulam Region Alert
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom row: status changes and WhatsApp notifier */}
                      <div className="pt-3 border-t border-warm-brown/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
                        {/* WhatsApp dispatch toggle */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleToggleWhatsappNotified(order.id, order.whatsapp_notified)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              order.whatsapp_notified
                                ? "bg-primary-green/15 text-primary-green border-primary-green/30"
                                : "bg-white text-text-dark/50 border-warm-brown/15 hover:border-warm-brown/30"
                            }`}
                            title="Toggle WhatsApp update state"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-[11px] font-semibold text-text-dark/70">
                            {order.whatsapp_notified ? (
                              <span className="text-primary-green font-bold">WhatsApp Alert Dispatched</span>
                            ) : (
                              <span>Simulate WhatsApp Dispatch</span>
                            )}
                          </span>
                        </div>

                        {/* Status update buttons */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {order.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "accepted")}
                                className="px-3.5 py-1.5 bg-primary-green hover:bg-[#224f3b] text-cream-bg text-[10px] font-bold rounded-lg transition cursor-pointer uppercase tracking-wider"
                              >
                                Accept Order
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                className="px-3.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-[10px] font-bold rounded-lg transition cursor-pointer uppercase tracking-wider"
                              >
                                Cancel Order
                              </button>
                            </>
                          )}
                          {order.status === "accepted" && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "completed")}
                                className="px-3.5 py-1.5 bg-primary-green hover:bg-[#224f3b] text-cream-bg text-[10px] font-bold rounded-lg transition cursor-pointer uppercase tracking-wider"
                              >
                                Mark Completed
                              </button>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, "cancelled")}
                                className="px-3.5 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 text-[10px] font-bold rounded-lg transition cursor-pointer uppercase tracking-wider"
                              >
                                Cancel Order
                              </button>
                            </>
                          )}
                          {(order.status === "completed" || order.status === "cancelled") && (
                            <span className="text-[10px] font-bold text-text-dark/40 uppercase tracking-widest bg-warm-brown/5 px-2.5 py-1 rounded-md border border-warm-brown/10">Fulfillment Archived</span>
                          )}
                        </div>
                      </div>
                      </>)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 bg-[#FAF7F2] border border-warm-brown/10 rounded-3xl space-y-4">
                <ShoppingBag className="h-12 w-12 text-warm-brown/40 mx-auto" />
                <h3 className="font-serif text-lg font-bold text-text-dark">
                  {orderNeedle ? "No Orders Matched Your Search" : "Order Book is Empty"}
                </h3>
                <p className="text-xs text-text-dark/60 max-w-xs mx-auto leading-relaxed">
                  {orderNeedle || orderStageFilter !== "all" || orderPayFilter !== "all"
                    ? "Try another buyer, item, maker, or widen the filters above — nothing in the order book matches right now."
                    : "No orders matched this status query."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* SECTION 6: MODERATION AUDIT TRAIL (Step 7) */}
        {currentSection === "audit" && (
          <div className="space-y-6">
            {/* Header + Search/Filter */}
            <div className="bg-[#FAF7F2] p-6 rounded-3xl border border-warm-brown/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-serif text-xl font-bold text-text-dark flex items-center gap-2">
                    <History className="h-5 w-5 text-primary-green" /> Moderation Audit Trail
                  </h2>
                  <p className="text-xs text-text-dark/60 mt-1 max-w-xl">
                    Every moderation action taken in this console is permanently recorded here — who made the change, which listing, maker, category, or order was modified, and what changed.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className="text-xs font-semibold text-text-dark/60 bg-white px-3 py-1.5 rounded-full border border-warm-brown/10 shadow-xs">
                    {auditLog.length} {auditLog.length === 1 ? "entry" : "entries"} recorded
                  </span>
                </div>
              </div>

              {/* Filter search box */}
              <div className="relative">
                <Search className="h-4 w-4 text-warm-brown/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by moderator, entity, action, or summary..."
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-warm-brown/15 rounded-xl text-xs text-text-dark focus:outline-none focus:border-primary-green transition font-sans shadow-xs"
                />
                {auditFilter && (
                  <button
                    onClick={() => setAuditFilter("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-dark/40 hover:text-text-dark cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Audit Feed */}
            {(() => {
              const auditNeedle = auditFilter.trim().toLowerCase();
              const filteredLog = auditLog.filter((entry) => {
                if (!auditNeedle) return true;
                return (
                  entry.actor_name.toLowerCase().includes(auditNeedle) ||
                  entry.actor_email.toLowerCase().includes(auditNeedle) ||
                  entry.entity_label.toLowerCase().includes(auditNeedle) ||
                  entry.entity_type.toLowerCase().includes(auditNeedle) ||
                  entry.action.toLowerCase().includes(auditNeedle) ||
                  entry.summary.toLowerCase().includes(auditNeedle)
                );
              });

              if (filteredLog.length === 0) {
                return (
                  <div className="text-center py-20 bg-[#FAF7F2] border border-warm-brown/10 rounded-3xl space-y-4">
                    <History className="h-12 w-12 text-warm-brown/40 mx-auto" />
                    <h3 className="font-serif text-lg font-bold text-text-dark">
                      {auditNeedle ? "No Audit Entries Matched" : "No Moderation Actions Recorded Yet"}
                    </h3>
                    <p className="text-xs text-text-dark/60 max-w-sm mx-auto leading-relaxed">
                      {auditNeedle
                        ? "Try widening your search terms — no audit records match the current filter."
                        : "Every product review, maker application decision, visibility toggle, order state transition, or category edit will appear here in chronological order."}
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {filteredLog.map((entry) => {
                    const entityColors: Record<string, string> = {
                      product: "bg-primary-green/10 text-primary-green border-primary-green/20",
                      seller: "bg-accent-gold/15 text-[#8b5a1b] border-accent-gold/30",
                      order: "bg-blue-50 text-blue-700 border-blue-200",
                      category: "bg-purple-50 text-purple-700 border-purple-200",
                    };

                    const chipStyle = entityColors[entry.entity_type] || "bg-warm-brown/10 text-warm-brown border-warm-brown/20";

                    return (
                      <div
                        key={entry.id}
                        className="bg-[#FAF7F2] p-4 sm:p-5 rounded-2xl border border-warm-brown/10 shadow-xs hover:border-warm-brown/25 transition space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-brown/5 pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${chipStyle}`}>
                              {entry.entity_type}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-warm-brown/10 text-text-dark/70">
                              {entry.action}
                            </span>
                            <span className="font-serif font-bold text-sm text-text-dark">
                              {entry.entity_label || entry.entity_id}
                            </span>
                          </div>
                          <div className="text-[11px] text-text-dark/50 flex items-center gap-1 self-start sm:self-center font-sans">
                            <Calendar className="h-3 w-3 text-warm-brown/40" />
                            {new Date(entry.created_at).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </div>
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-warm-brown/10 text-xs text-text-dark leading-relaxed font-sans">
                          {entry.summary}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-text-dark/50 pt-0.5">
                          <div>
                            <span className="font-semibold text-text-dark/70">Moderator:</span>{" "}
                            {entry.actor_name || entry.actor_email || "System"}
                            {entry.actor_email && entry.actor_name && entry.actor_name !== entry.actor_email && (
                              <span className="text-text-dark/40"> ({entry.actor_email})</span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-text-dark/40">
                            entity id: {entry.entity_id}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
