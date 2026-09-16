import { useAuth } from '../context/AuthContext';
import { ShopvibeLogo } from './ShopvibeLogo';

interface AdminSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const NAV_ITEMS = [
  { key: 'admin-dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'admin-products', label: 'Products', icon: '📦' },
  { key: 'admin-categories', label: 'Categories', icon: '🏷️' },
  { key: 'admin-orders', label: 'Orders', icon: '📋' },
  { key: 'admin-customers', label: 'Customers', icon: '👥' },
  { key: 'admin-inventory', label: 'Inventory', icon: '📦' },
  { key: 'admin-coupons', label: 'Coupons', icon: '🎟️' },
  { key: 'admin-analytics', label: 'Analytics', icon: '📈' },
];

export function AdminSidebar({ currentPage, onNavigate }: AdminSidebarProps) {
  const { user, logout } = useAuth();

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <ShopvibeLogo size="sm" variant="full" />
        <span className="admin-sidebar-title">Shopvibe.store</span>
        <span className="admin-sidebar-subtitle">Admin Panel</span>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`admin-sidebar-link ${currentPage === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
            aria-current={currentPage === item.key ? 'page' : undefined}
          >
            <span className="admin-sidebar-icon">{item.icon}</span>
            <span className="admin-sidebar-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-user-info">
          <span className="admin-user-avatar">
            {(user?.name ?? 'A').charAt(0).toUpperCase()}
          </span>
          <div className="admin-user-details">
            <span className="admin-user-name">{user?.name ?? 'Admin'}</span>
            <span className="admin-user-role">{user?.role}</span>
          </div>
        </div>
        <button type="button" className="admin-logout" onClick={logout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
