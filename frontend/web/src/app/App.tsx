import { FormEvent, useEffect, useState } from 'react';
import { api, CartItem, messageOf, Order, Product, setAccessToken, User } from '../lib/api';
import { ShopvibeLogo } from '../components/ShopvibeLogo';
import { PAGE_TITLES, setDocumentTitle } from '../lib/title';

const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount / 100);

const categoryGlyphs: Record<string, string> = {
  Audio: '🎧',
  Home: '🛋️',
  Travel: '🧳',
  Workspace: '⌨️',
};

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<'shop' | 'orders' | 'admin'>('shop');
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (page === 'shop') setDocumentTitle(PAGE_TITLES.HOME);
    else if (page === 'orders') setDocumentTitle(PAGE_TITLES.ORDERS);
    else if (page === 'admin') setDocumentTitle(PAGE_TITLES.ADMIN);
  }, [page]);

  const loadProducts = async (q = search, c = category) => {
    try {
      const { data } = await api.get('/products', {
        params: { search: q || undefined, category: c === 'All' ? undefined : c },
      });
      setProducts(data.data.products);
      setCategories(data.data.categories);
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const loadCart = async () => {
    if (!user) return setCart([]);
    try {
      const { data } = await api.get('/cart');
      setCart(data.data.cart.items);
    } catch {
      setCart([]);
    }
  };

  useEffect(() => {
    void loadProducts('', 'All');
  }, []);

  useEffect(() => {
    void loadCart();
  }, [user]);

  const add = async (productId: string) => {
    if (!user) return setAuth('login');
    try {
      await api.post('/cart/items', { productId, quantity: 1 });
      await loadCart();
      setCartOpen(true);
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const update = async (productId: string, quantity: number) => {
    try {
      await api.patch(`/cart/items/${productId}`, { quantity });
      await loadCart();
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const checkout = async () => {
    try {
      const { data } = await api.post('/orders');
      setCart([]);
      setCartOpen(false);
      setPage('orders');
      setNotice(`Order #${data.data.order.id.slice(-8).toUpperCase()} confirmed successfully.`);
    } catch (e) {
      setNotice(messageOf(e));
    }
  };

  const cartCount = cart.reduce((n, item) => n + item.quantity, 0);

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
            disabled={!user}
            className={page === 'orders' ? 'font-semibold text-neutral-900' : ''}
            onClick={() => setPage('orders')}
          >
            My Orders
          </button>
          {user?.role === 'ADMIN' && (
            <button
              className={page === 'admin' ? 'font-semibold text-neutral-900' : ''}
              onClick={() => setPage('admin')}
            >
              Admin Dashboard
            </button>
          )}
        </nav>

        <div>
          {user ? (
            <button
              className="plain"
              onClick={() => {
                setUser(null);
                setAccessToken();
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
          products={products}
          categories={categories}
          search={search}
          category={category}
          onSearch={(v) => {
            setSearch(v);
            void loadProducts(v, category);
          }}
          onCategory={(v) => {
            setCategory(v);
            void loadProducts(search, v);
          }}
          onAdd={add}
        />
      )}

      {page === 'orders' && <Orders user={user} signIn={() => setAuth('login')} />}
      {page === 'admin' && <Admin user={user} />}

      <footer>
        <ShopvibeLogo size="sm" variant="full" />
        <p>Thoughtfully curated products for modern living. Built with precision and trust.</p>
        <small>© {new Date().getFullYear()} Shopvibe.store. All rights reserved.</small>
      </footer>

      {cartOpen && (
        <Cart
          items={cart}
          close={() => setCartOpen(false)}
          update={update}
          checkout={checkout}
        />
      )}

      {auth && (
        <Auth
          mode={auth}
          close={() => setAuth(null)}
          toggle={() => setAuth(auth === 'login' ? 'register' : 'login')}
          success={(u, t) => {
            setAccessToken(t);
            setUser(u);
            setAuth(null);
          }}
        />
      )}
    </div>
  );
}

function Shop({
  products,
  categories,
  search,
  category,
  onSearch,
  onCategory,
  onAdd,
}: {
  products: Product[];
  categories: string[];
  search: string;
  category: string;
  onSearch: (v: string) => void;
  onCategory: (v: string) => void;
  onAdd: (id: string) => void;
}) {
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
          <label className="search" aria-label="Search collection">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search by product or keyword"
            />
          </label>
        </div>

        <div className="filters" role="tablist">
          <button
            className={category === 'All' ? 'active' : ''}
            onClick={() => onCategory('All')}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              className={category === c ? 'active' : ''}
              onClick={() => onCategory(c)}
              key={c}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="products">
          {products.map((product, index) => (
            <article className="product" key={product.id}>
              <div className={`art art-${index % 4}`}>
                <span>{categoryGlyphs[product.category] ?? '✦'}</span>
                <i>{product.category}</i>
              </div>
              <div className="product-copy">
                <p className="eyebrow">{product.category}</p>
                <h3>{product.title}</h3>
                <p>{product.description}</p>
                <div>
                  <strong>{money(product.priceCents)}</strong>
                  <button onClick={() => onAdd(product.id)} disabled={!product.stock}>
                    {product.stock ? 'Add to Bag +' : 'Out of stock'}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!products.length && (
          <div className="empty">No products matched your search. Try adjusting your query.</div>
        )}
      </section>

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

function Cart({
  items,
  close,
  update,
  checkout,
}: {
  items: CartItem[];
  close: () => void;
  update: (id: string, q: number) => void;
  checkout: () => void;
}) {
  const total = items.reduce((n, item) => n + item.product.priceCents * item.quantity, 0);

  return (
    <div className="overlay" onMouseDown={close}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">YOUR BAG</p>
            <h2>Selected Items</h2>
          </div>
          <button onClick={close} aria-label="Close Bag">
            ×
          </button>
        </header>

        {items.length ? (
          <>
            <div className="cart-list">
              {items.map((item, i) => (
                <article key={item.id}>
                  <div className={`mini art-${i % 4}`}>
                    {categoryGlyphs[item.product.category] ?? '✦'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3>{item.product.title}</h3>
                    <p>{money(item.product.priceCents)}</p>
                    <div className="quantity">
                      <button
                        onClick={() => update(item.product.id, item.quantity - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => update(item.product.id, item.quantity + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="total">
              <p>
                <span>Subtotal</span>
                <strong>{money(total)}</strong>
              </p>
              <small>All taxes included. Free standard shipping across India.</small>
              <button className="primary full" onClick={checkout}>
                Proceed to Checkout →
              </button>
            </div>
          </>
        ) : (
          <div className="empty">Your shopping bag is currently empty.</div>
        )}
      </aside>
    </div>
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
  success: (u: User, t: string) => void;
}) {
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
      const { data } = await api.post(`/auth/${mode}`, {
        email,
        password,
        ...(mode === 'register' ? { name } : {}),
      });
      success(data.data.user, data.data.accessToken);
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

function Orders({ user, signIn }: { user: User | null; signIn: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (user) {
      void api.get('/orders').then(({ data }) => setOrders(data.data.orders));
    }
  }, [user]);

  if (!user) {
    return (
      <main className="message">
        <p className="eyebrow">YOUR ORDERS</p>
        <h1>Track your recent orders.</h1>
        <p>Sign in to view your active deliveries, invoices, and purchase history.</p>
        <div>
          <button className="primary" onClick={signIn}>
            Sign in to view orders →
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="account">
      <p className="eyebrow">ORDER HISTORY</p>
      <h1>Your Purchases</h1>
      {orders.length ? (
        <div className="orders">
          {orders.map((order) => (
            <article key={order.id}>
              <div>
                <p className="eyebrow">ORDER #{order.id.slice(-8).toUpperCase()}</p>
                <h3>
                  {new Date(order.createdAt).toLocaleDateString('en-IN', {
                    dateStyle: 'long',
                  })}
                </h3>
                <p>
                  {order.items
                    .map((item) => `${item.productTitle} × ${item.quantity}`)
                    .join(' · ')}
                </p>
              </div>
              <div>
                <span>{order.status}</span>
                <strong>{money(order.totalCents)}</strong>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">You have no previous orders. Explore our collection to get started.</div>
      )}
    </main>
  );
}

function Admin({ user }: { user: User | null }) {
  const [metrics, setMetrics] = useState<{
    users: number;
    products: number;
    orders: number;
    revenueCents: number;
  } | null>(null);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      void api.get('/admin/overview').then(({ data }) => setMetrics(data.data));
    }
  }, [user]);

  if (user?.role !== 'ADMIN') {
    return (
      <main className="message">
        <p className="eyebrow">ADMINISTRATOR PORTAL</p>
        <h1>Access Restricted</h1>
        <p>This section is strictly reserved for platform administrators.</p>
      </main>
    );
  }

  return (
    <main className="account">
      <p className="eyebrow">PLATFORM OVERVIEW</p>
      <h1>Shopvibe.store Admin</h1>
      {metrics ? (
        <div className="metrics">
          {[
            ['Registered Users', metrics.users],
            ['Active Products', metrics.products],
            ['Confirmed Orders', metrics.orders],
            ['Gross Merchandise Value', money(metrics.revenueCents)],
          ].map(([label, value]) => (
            <article key={String(label)}>
              <small>{label}</small>
              <b>{value}</b>
            </article>
          ))}
        </div>
      ) : (
        <p>Loading metrics…</p>
      )}
    </main>
  );
}
