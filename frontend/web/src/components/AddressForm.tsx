import { FormEvent, useEffect, useState } from 'react';
import { useAddresses } from '../hooks/useAddresses';
import type { Address } from '../lib/api';

interface AddressFormProps {
  initialData?: Address | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export function AddressForm({ initialData, onClose, onSuccess }: AddressFormProps) {
  const { createAddress, updateAddress, isCreating, isUpdating } = useAddresses();
  const isEditing = Boolean(initialData);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    isDefault: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        fullName: initialData.fullName,
        phone: initialData.phone,
        addressLine1: initialData.addressLine1,
        addressLine2: initialData.addressLine2 ?? '',
        city: initialData.city,
        state: initialData.state,
        postalCode: initialData.postalCode,
        country: initialData.country,
        isDefault: initialData.isDefault,
      });
    }
  }, [initialData]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required.';
        if (value.trim().length < 2) return 'Full name must be at least 2 characters.';
        break;
      case 'phone':
        if (!value.trim()) return 'Mobile number is required.';
        if (!/^[+]?[0-9]{10,14}$/.test(value.trim())) return 'Please enter a valid 10-digit mobile number.';
        break;
      case 'addressLine1':
        if (!value.trim()) return 'House/Flat No., Building or Street is required.';
        if (value.trim().length < 3) return 'Address must be at least 3 characters.';
        break;
      case 'city':
        if (!value.trim()) return 'City is required.';
        break;
      case 'state':
        if (!value.trim()) return 'State is required.';
        break;
      case 'postalCode':
        if (!value.trim()) return 'PIN code is required.';
        if (!/^[1-9][0-9]{5}$/.test(value.trim())) return 'Please enter a valid 6-digit PIN code.';
        break;
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const newErrors: Record<string, string> = {};
    (Object.keys(formData) as Array<keyof typeof formData>).forEach((key) => {
      if (key !== 'addressLine2' && key !== 'country' && key !== 'isDefault') {
        const value = formData[key];
        if (typeof value === 'string') {
          const error = validateField(key, value);
          if (error) newErrors[key] = error;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const payload = { ...formData };
      if (isEditing && initialData) {
        await updateAddress(initialData.id, payload);
      } else {
        await createAddress(payload);
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save address. Please try again.');
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const isSubmitting = isCreating || isUpdating;

  return (
    <div className="modal" onMouseDown={handleCancel} role="dialog" aria-modal="true" aria-labelledby="address-form-title">
      <form onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()} role="form">
        <button type="button" className="close" onClick={handleCancel} aria-label="Close modal">
          ×
        </button>

        <p className="eyebrow">{isEditing ? 'EDIT ADDRESS' : 'ADD NEW ADDRESS'}</p>
        <h2 id="address-form-title">{isEditing ? 'Update Delivery Address' : 'Add Delivery Address'}</h2>
        <p>Save this address for faster checkout.</p>

        {submitError && <p className="error" role="alert">{submitError}</p>}

        <div className="form-grid">
          <label>
            Full Name <span className="required" aria-hidden="true">*</span>
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Priya Sharma"
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.fullName && <p id="fullName-error" className="field-error" role="alert">{errors.fullName}</p>}
          </label>

          <label>
            Mobile Number <span className="required" aria-hidden="true">*</span>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.phone && <p id="phone-error" className="field-error" role="alert">{errors.phone}</p>}
          </label>

          <label className="full-width">
            House / Flat No., Building <span className="required" aria-hidden="true">*</span>
            <input
              type="text"
              name="addressLine1"
              required
              value={formData.addressLine1}
              onChange={handleChange}
              placeholder="e.g. 402, Lotus Towers, MG Road"
              aria-invalid={!!errors.addressLine1}
              aria-describedby={errors.addressLine1 ? 'addressLine1-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.addressLine1 && <p id="addressLine1-error" className="field-error" role="alert">{errors.addressLine1}</p>}
          </label>

          <label className="full-width">
            Street / Locality / Area
            <input
              type="text"
              name="addressLine2"
              value={formData.addressLine2}
              onChange={handleChange}
              placeholder="e.g. Near Metro Station, Andheri East"
              disabled={isSubmitting}
            />
          </label>

          <label>
            City <span className="required" aria-hidden="true">*</span>
            <input
              type="text"
              name="city"
              required
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Mumbai"
              aria-invalid={!!errors.city}
              aria-describedby={errors.city ? 'city-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.city && <p id="city-error" className="field-error" role="alert">{errors.city}</p>}
          </label>

          <label>
            State <span className="required" aria-hidden="true">*</span>
            <select
              name="state"
              required
              value={formData.state}
              onChange={handleChange}
              aria-invalid={!!errors.state}
              aria-describedby={errors.state ? 'state-error' : undefined}
              disabled={isSubmitting}
            >
              <option value="">Select State</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {errors.state && <p id="state-error" className="field-error" role="alert">{errors.state}</p>}
          </label>

          <label>
            PIN Code <span className="required" aria-hidden="true">*</span>
            <input
              type="text"
              name="postalCode"
              required
              value={formData.postalCode}
              onChange={handleChange}
              placeholder="e.g. 400001"
              maxLength={6}
              aria-invalid={!!errors.postalCode}
              aria-describedby={errors.postalCode ? 'postalCode-error' : undefined}
              disabled={isSubmitting}
            />
            {errors.postalCode && <p id="postalCode-error" className="field-error" role="alert">{errors.postalCode}</p>}
          </label>

          <label className="full-width checkbox-label">
            <input
              type="checkbox"
              name="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
              disabled={isSubmitting}
            />
            <span>Set as default delivery address</span>
          </label>
        </div>

        <div className="form-actions">
          <button type="button" className="plain" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : isEditing ? 'Update Address →' : 'Save Address →'}
          </button>
        </div>
      </form>
    </div>
  );
}