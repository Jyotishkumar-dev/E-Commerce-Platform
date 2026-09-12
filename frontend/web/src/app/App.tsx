import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, messageOf, Order, Product, User } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../hooks/useCart';
import { useWishlist } from '../hooks/useWishlist';
import { useCatalogParams } from '../hooks/useCatalogParams';
import { CatalogFilters } from '../components/CatalogFilters';
import { ProductGrid } from '../components/ProductGrid';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { formatMoney } from '../components/ProductCard';
import { CartDrawer } from '../components/CartDrawer';
import { CartPage } from '../components/CartPage';
import { WishlistPage } from '../components/WishlistPage';
import { CheckoutPage } from '../components/CheckoutPage';
import { OrderConfirmationPage } from '../components/OrderConfirmationPage';
import { OrderDetailsPage } from '../components/OrderDetailsPage';
import { OrderHistoryPage } from '../components/OrderHistoryPage';
import { AddressList } from '../components/AddressList';
import { AddressForm } from '../components/AddressForm';
import { ShopvibeLogo } from '../components/ShopvibeLogo';
import { AdminDashboard } from '../components/AdminDashboard';
import { AdminProductsPage } from '../components/AdminProductsPage';
import { AdminOrdersPage } from '../components/AdminOrdersPage';
import { AdminCustomersPage } from '../components/AdminCustomersPage';
import { AdminCategoriesPage } from '../components/AdminCategoriesPage';
import { AdminCouponsPage } from '../components/AdminCouponsPage';
import { PAGE_TITLES, setDocumentTitle } from '../lib/title';

export function App() {
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();
  const {
    items: cartItems,
    itemCount: cartCount,
    subtotalCents,
    hasUnavailableItems,
    addItem,
    updateQuantity,
    removeItem,
    moveToWishlist: moveCartItemToWishlist,
  } = useCart();

  const {
    items: wishlistItems,
    wishlistIds,
    wishlistCount,
    toggleWishlist: toggleWishlistHook,
    removeFromWishlist,
    moveToCart: moveWishlistItemToCart,
  } = useWishlist();

  const [page, setPage] = useState<'shop' | 'cart' | 'wishlist' | 'order-history' | 'order-detail' | 'admin' | 'checkout' | 'confirmation' | 'admin-dashboard' | 'admin-products' | 'admin-orders' | 'admin-customers' | 'admin-categories' | 'admin-coupons'>('shop');
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmationOrderId, setConfirmationOrderId] = useState<string | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [addressModal, setAddressModal] = useState<{ mode: 'manage' | 'add'; editingId?: string } | null>(null);

  useEffect(() => {
    if (page === 'shop') setDocumentTitle(PAGE_TITLES.HOME);
    else if (page === 'cart') setDocumentTitle(PAGE_TITLES.CART);
    else if (page === 'wishlist') setDocumentTitle(PAGE_TITLES.WISHLIST);
    else if (page === 'order-history') setDocumentTitle(PAGE_TITLES.ORDERS);
    else if (page === 'admin' || page.startsWith('admin-')) setDocumentTitle(PAGE_TITLES.ADMIN);
    else if (page === 'checkout') setDocumentTitle('Checkout');
    else if (page === 'confirmation') setDocumentTitle('Order Confirmed');
    else if (page === 'order-detail') setDocumentTitle('Order Details');
  }, [page]);

  const add = async (productId: string, quantity = 1) => {
    if (!user) return setAuth('login');
    try {
      await addItem(productId, quantity);
      setCartOpen(true);
      setNotice('Item added to your shopping bag.');
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    try {
      await updateQuantity(productId, quantity);
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const handleRemoveItem = async (productId: string) => {
    try {
      await removeItem(productId);
      setNotice('Item removed from your bag.');
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const handleMoveToWishlist = async (productId: string) => {
    if (!user) return setAuth('login');
    try {
      await moveCartItemToWishlist(productId);
      setNotice('Item moved to your wishlist.');
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) return setAuth('login');
    try {
      await toggleWishlistHook(productId);
      if (wishlistIds.has(productId)) {
        setNotice('Item removed from wishlist.');
      } else {
        setNotice('Item saved to wishlist.');
      }
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const handleMoveToCart = async (productId: string) => {
    if (!user) return setAuth('login');
    try {
      await moveWishlistItemToCart(productId);
      setNotice('Item moved to your bag.');
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const checkout = async () => {
    if (!user) return setAuth('login');
    if (hasUnavailableItems) {
      setNotice('Please remove unavailable or out-of-stock items before checking out.');
      return;
    }
    setPage('checkout');
  };

  const handleOrderComplete = (order: Order) => {
    setConfirmationOrderId(order.id);
    setPage('confirmation');
    setCartOpen(false);
  };

  const handleViewOrderDetail = (orderId: string) => {
    setDetailOrderId(orderId);
    setPage('order-detail');
  };

  const handleBackToOrders = () => {
    setDetailOrderId(null);
    setPage('order-history');
  };

  const handleContinueShopping = () => {
    setConfirmationOrderId(null);
    setPage('shop');
  };

  const closeAddressManager = () => {
    setAddressModal(null);
  };

  return (
    <div className="app-shell">
      <header className="nav">
        <button className="brand" onClick={() => setPage('shop')} aria-label="Go to homepage">
          <ShopvibeLogo size="md" variant="full" />
        </button>

        <nav>
          <button
            className={page === 'shop' ? 'font-semibold text-neutral-900' : ''}
            onClick={() => setPage('shop')}
          >
            Explore
          </button>
          <button
            className={page === 'wishlist' ? 'font-semibold text-neutral-900' : ''}
            onClick={() => {
              if (!user) setAuth('login');
              else setPage('wishlist');
            }}
          >
            Wishlist {user && wishlistCount > 0 && <span className="nav-badge">{wishlistCount}</span>}
          </button>
          <button
            disabled={!user}
            className={page === 'order-history' ? 'font-semibold text-neutral-900' : ''}
            onClick={() => setPage('order-history')}
          >
            My Orders
          </button>
          {user?.role === 'ADMIN' && (
            <button
              className={page === 'admin-dashboard' ? 'font-semibold text-neutral-900' : ''}
              onClick={() => setPage('admin-dashboard')}
            >
              Admin Dashboard
            </button>
          )}
        </nav>

        <div>
          {user ? (
            <button
              className="plain"
              onClick={async () => {
                await logout();
                queryClient.clear();
                setPage('shop');
              }}
            >
              Hi, {user.name?.split(' ')[0] ?? 'there'} · Sign out
            </button>
          ) : (
            <button className="plain" onClick={() => setAuth('login')}>
              Sign in
            </button>
          )}
          <button className="bag" onClick={() => setCartOpen(true)} aria-label="Open Shopping Bag">
            Bag <i>{cartCount}</i>
          </button>
        </div>
      </header>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Close notification">
            ×
          </button>
        </div>
      )}

      {page === 'shop' && (
        <Shop
          onAdd={add}
          onToggleWishlist={toggleWishlist}
          wishlistedIds={wishlistIds}
        />
      )}

      {page === 'cart' && (
        <CartPage
          items={cartItems}
          itemCount={cartCount}
          subtotalCents={subtotalCents}
          hasUnavailableItems={hasUnavailableItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onMoveToWishlist={handleMoveToWishlist}
          onContinueShopping={() => setPage('shop')}
          onCheckout={checkout}
        />
      )}

      {page === 'wishlist' && (
        <WishlistPage
          items={wishlistItems}
          onMoveToCart={handleMoveToCart}
          onRemoveFromWishlist={removeFromWishlist}
          onContinueShopping={() => setPage('shop')}
        />
      )}

      {page === 'order-history' && <OrderHistoryPage />}
      {page === 'admin-dashboard' && (
        <AdminDashboard />
      )}
      {page === 'admin-products' && (
        <AdminProductsPage onNavigate={() => setPage('admin-dashboard')} />
      )}
      {page === 'admin-orders' && (
        <AdminOrdersPage onBack={() => setPage('admin-dashboard')} />
      )}
      {page === 'admin-customers' && (
        <AdminCustomersPage onBack={() => setPage('admin-dashboard')} />
      )}
      {page === 'admin-categories' && (
        <AdminCategoriesPage onBack={() => setPage('admin-dashboard')} />
      )}
      {page === 'admin-coupons' && (
        <AdminCouponsPage onBack={() => setPage('admin-dashboard')} />
      )}

      {page === 'checkout' && (
        <CheckoutPage onClose={() => setPage('cart')} onOrderComplete={handleOrderComplete} />
      )}

      {page === 'confirmation' && confirmationOrderId && (
        <OrderConfirmationPage
          orderId={confirmationOrderId}
          onContinueShopping={handleContinueShopping}
          onViewOrder={() => {
            handleViewOrderDetail(confirmationOrderId);
            setConfirmationOrderId(null);
          }}
        />
      )}

      {page === 'order-detail' && detailOrderId && (
        <OrderDetailsPage orderId={detailOrderId} onBack={handleBackToOrders} />
      )}

      <footer>
        <ShopvibeLogo size="sm" variant="full" />
        <p>Thoughtfully curated products for modern living. Built with precision and trust.</p>
        <small>© {new Date().getFullYear()} Shopvibe.store. All rights reserved.</small>
      </footer>

      <CartDrawer
        isOpen={cartOpen}
        items={cartItems}
        itemCount={cartCount}
        subtotalCents={subtotalCents}
        hasUnavailableItems={hasUnavailableItems}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onMoveToWishlist={handleMoveToWishlist}
        onViewCart={() => setPage('cart')}
        onCheckout={checkout}
      />


      {auth && (
        <Auth
          mode={auth}
          close={() => setAuth(null)}
          toggle={() => setAuth(auth === 'login' ? 'register' : 'login')}
          success={() => {
            setAuth(null);
          }}
        />
      )}

      {addressModal && (
        <div className="modal" onMouseDown={closeAddressManager} role="dialog" aria-modal="true">
          <AddressList
            mode={addressModal.mode === 'manage' ? 'manage' : 'select'}
            showActions={addressModal.mode === 'manage'}
            onClose={closeAddressManager}
          />
        </div>
      )}
    </div>
  );
}

function Shop({
  onAdd,
  onToggleWishlist,
  wishlistedIds,
}: {
  onAdd: (id: string, quantity?: number) => void;
  onToggleWishlist: (id: string) => void;
  wishlistedIds: Set<string>;
}) {
  const { filters, updateFilters, resetFilters } = useCatalogParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchCatalog = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        api.get('/products', {
          params: {
            search: filters.search || undefined,
            category: filters.category === 'All' ? undefined : filters.category,
            minPrice: filters.minPrice,
            maxPrice: filters.maxPrice,
            inStock: filters.inStock || undefined,
            sort: filters.sort,
            page: filters.page,
            limit: 24,
          },
        }),
        api.get('/categories'),
      ]);

      const fetchedProducts = productsRes.data?.data?.products ?? [];
      const fetchedTotal = productsRes.data?.data?.pagination?.total ?? fetchedProducts.length;
      const fetchedCategories = productsRes.data?.data?.categories ?? [];
      const categoryData = categoriesRes.data?.data?.categories ?? [];

      const counts: Record<string, number> = {};
      let allTotal = 0;
      for (const cat of categoryData) {
        counts[cat.name] = cat._count?.products ?? 0;
        allTotal += cat._count?.products ?? 0;
      }
      counts['All'] = allTotal;

      setProducts(fetchedProducts);
      setTotalResults(fetchedTotal);
      setCategories(fetchedCategories.length > 0 ? fetchedCategories : ['Audio', 'Workspace', 'Home', 'Travel']);
      setCategoryCounts(counts);
    } catch {
      setProducts([]);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">CURATED FOR MODERN LIVING</p>
        <h1>
          Shop Better.<br />
          <em>Live Better.</em>
        </h1>
        <p>
          A refined selection of essential workspace, audio, home, and travel gear designed for longevity and everyday brilliance.
        </p>
        <div>
          <a href="#catalog" className="primary">
            Explore Collection →
          </a>
        </div>
        <div className="orb">
          Shopvibe
          <small>CURATED</small>
        </div>
      </section>

      <section id="catalog" className="catalog">
        <div className="heading">
          <div>
            <p className="eyebrow">THE COLLECTION</p>
            <h2>Thoughtful products, crafted to endure.</h2>
          </div>
        </div>

        {/* Discovery & Filtering Controls */}
        <CatalogFilters
          categories={categories}
          categoryCounts={categoryCounts}
          filters={filters}
          totalResults={totalResults}
          onUpdateFilters={updateFilters}
          onResetFilters={resetFilters}
        />

        {/* Product Grid */}
        <ProductGrid
          products={products}
          isLoading={isLoading}
          searchTerm={filters.search}
          category={filters.category}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onAddToCart={(id) => onAdd(id, 1)}
          onToggleWishlist={onToggleWishlist}
          onResetFilters={resetFilters}
          wishlistedIds={wishlistedIds}
        />
      </section>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAdd={(id, qty) => onAdd(id, qty)}
        onToggleWishlist={onToggleWishlist}
        isWishlisted={selectedProduct ? wishlistedIds.has(selectedProduct.id) : false}
      />

      <section className="promise">
        <p className="eyebrow">OUR PHILOSOPHY</p>
        <h2>Integrity in every detail.</h2>
        <p>
          We curate fewer, better products. Clear specifications, honest pricing, and quality craftsmanship.
        </p>
        <div>
          {[
            ['01', 'Considered Curation', 'Handpicked products that solve real needs without unnecessary fluff.'],
            ['02', 'Transparent & Fair', 'Honest specifications, clear pricing in INR, no hidden surprises.'],
            ['03', 'Fast & Reliable Delivery', 'Direct fulfillment across major metropolitan and Tier-2 hubs in India.'],
          ].map(([n, h, p]) => (
            <article key={n}>
              <b>{n}</b>
              <h3>{h}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}



function Auth({
  mode,
  close,
  toggle,
  success,
}: {
  mode: 'login' | 'register';
  close: () => void;
  toggle: () => void;
  success: () => void;
}) {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, name });
      }
      success();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal" onMouseDown={close}>
      <form onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="close" onClick={close} aria-label="Close modal">
          ×
        </button>
        <p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'CREATE ACCOUNT'}</p>
        <h2>{mode === 'login' ? 'Sign in to Shopvibe' : 'Join Shopvibe.store'}</h2>
        <p>Save your favorite items, manage addresses, and track your shipments.</p>

        {mode === 'register' && (
          <label>
            Full Name
            <input
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya Sharma"
            />
          </label>
        )}

        <label>
          Email Address
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </label>

        <label>
          Password
          <input
            required
            minLength={8}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="primary full" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>

        <p className="switch">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button type="button" onClick={toggle}>
            {mode === 'login' ? 'Create one' : 'Sign in'}
          </button>
        </p>

        <small>Demo Admin: admin@shopvibe.store / Password123!</small>
      </form>
    </div>
  );
}
