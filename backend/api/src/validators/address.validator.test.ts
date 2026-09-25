import { describe, expect, it } from 'vitest';
import { createAddressSchema, updateAddressSchema } from '../validators/address.validator.js';

describe('Address Validators', () => {
  describe('createAddressSchema', () => {
    it('accepts valid address', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      });
      expect(result.success).toBe(true);
    });

    it('defaults country to India', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.country).toBe('India');
      }
    });

    it('defaults isDefault to false', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isDefault).toBe(false);
      }
    });

    it('accepts addressLine2', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: '123 Main Street',
        addressLine2: 'Apt 4B',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short fullName', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'J',
        phone: '+919876543210',
        addressLine1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid phone', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '12345',
        addressLine1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short addressLine1', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: 'Hi',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short city', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: '123 Main Street',
        city: 'B',
        state: 'Karnataka',
        postalCode: '560001',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid PIN code', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '12345',
      });
      expect(result.success).toBe(false);
    });

    it('rejects 5-digit PIN code', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '56000',
      });
      expect(result.success).toBe(false);
    });

    it('rejects 7-digit PIN code', () => {
      const result = createAddressSchema.safeParse({
        fullName: 'John Doe',
        phone: '+919876543210',
        addressLine1: '123 Main Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '5600010',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateAddressSchema', () => {
    it('accepts partial update', () => {
      const result = updateAddressSchema.safeParse({
        fullName: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });
  });
});
