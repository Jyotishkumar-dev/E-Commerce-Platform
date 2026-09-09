import { useState } from 'react';
import { useAddresses } from '../hooks/useAddresses';
import { AddressForm } from './AddressForm';
import type { Address } from '../lib/api';

interface AddressListProps {
  addresses?: Address[];
  onSelectAddress?: (address: Address) => void;
  selectedAddressId?: string;
  showActions?: boolean;
  mode?: 'manage' | 'select';
}

export function AddressList({
  addresses: propAddresses,
  onSelectAddress,
  selectedAddressId,
  showActions = true,
  mode = 'manage',
}: AddressListProps) {
  const { addresses: hookAddresses, isLoading, refetch, deleteAddress, setDefaultAddress, isDeleting, isSettingDefault } =
    useAddresses();
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);

  const addresses = propAddresses ?? hookAddresses;
  const loading = propAddresses ? false : isLoading;

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
  };

  const handleDelete = async (address: Address) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await deleteAddress(address.id);
    } catch (e) {
      console.error('Failed to delete address:', e);
    }
  };

  const handleSetDefault = async (address: Address) => {
    try {
      await setDefaultAddress(address.id);
    } catch (e) {
      console.error('Failed to set default address:', e);
    }
  };

  const handleSelect = (address: Address) => {
    onSelectAddress?.(address);
  };

  const handleFormSuccess = () => {
    setEditingAddress(null);
    setAddingAddress(false);
    if (!propAddresses) void refetch();
  };

  if (isLoading) {
    return (
      <div className="addresses-loading">
        <div className="skeleton-card" aria-hidden="true"></div>
        <div className="skeleton-card" aria-hidden="true"></div>
        <div className="skeleton-card" aria-hidden="true"></div>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <section className="addresses-empty" aria-label="No addresses">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">📍</span>
          <h3>No saved addresses</h3>
          <p>Add a delivery address to speed up checkout.</p>
          <button
            type="button"
            className="primary"
            onClick={() => setAddingAddress(true)}
          >
            Add Address →
          </button>
        </div>
        {addingAddress && (
          <AddressForm onClose={() => setAddingAddress(false)} onSuccess={handleFormSuccess} />
        )}
      </section>
    );
  }

  return (
    <section className="addresses-list" aria-label={mode === 'select' ? 'Select delivery address' : 'Your addresses'}>
      {mode === 'manage' && (
        <div className="addresses-header">
          <h2>My Addresses</h2>
          <button
            type="button"
            className="primary"
            onClick={() => setAddingAddress(true)}
          >
            + Add New Address
          </button>
        </div>
      )}

      <div className="addresses-grid" role="list">
        {addresses.map((address) => (
          <article
            key={address.id}
            className={`address-card ${address.isDefault ? 'is-default' : ''} ${
              selectedAddressId === address.id ? 'selected' : ''
            }`}
            role="listitem"
          >
            <div className="address-content">
              {address.isDefault && <span className="default-badge">Default</span>}

              <address className="address-details">
                <strong>{address.fullName}</strong>
                <span>{address.phone}</span>
                <span>{address.addressLine1}</span>
                {address.addressLine2 && <span>{address.addressLine2}</span>}
                <span>
                  {address.city}, {address.state} {address.postalCode}
                </span>
                <span>{address.country}</span>
              </address>
            </div>

            <div className="address-actions">
              {mode === 'select' && (
                <button
                  type="button"
                  className={selectedAddressId === address.id ? 'primary selected' : 'plain'}
                  onClick={() => handleSelect(address)}
                  disabled={selectedAddressId === address.id}
                >
                  {selectedAddressId === address.id ? '✓ Selected' : 'Deliver Here'}
                </button>
              )}

              {showActions && mode === 'manage' && (
                <>
                  <button
                    type="button"
                    className="plain icon-btn"
                    onClick={() => handleEdit(address)}
                    aria-label={`Edit ${address.fullName}'s address`}
                    disabled={isDeleting || isSettingDefault}
                  >
                    ✏️
                  </button>
                  {!address.isDefault && (
                    <button
                      type="button"
                      className="plain icon-btn"
                      onClick={() => handleSetDefault(address)}
                      aria-label={`Set ${address.fullName}'s address as default`}
                      disabled={isDeleting || isSettingDefault}
                    >
                      ⭐
                    </button>
                  )}
                  <button
                    type="button"
                    className="plain icon-btn danger"
                    onClick={() => handleDelete(address)}
                    aria-label={`Delete ${address.fullName}'s address`}
                    disabled={isDeleting || isSettingDefault}
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>

      {addingAddress && (
        <AddressForm onClose={() => setAddingAddress(false)} onSuccess={handleFormSuccess} />
      )}

      {editingAddress && (
        <AddressForm
          initialData={editingAddress}
          onClose={() => setEditingAddress(null)}
          onSuccess={handleFormSuccess}
        />
      )}
    </section>
  );
}