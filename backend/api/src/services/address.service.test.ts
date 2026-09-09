import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AddressService } from './address.service.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
    address: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe('AddressService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAddresses', () => {
    it('returns addresses ordered by default first then by createdAt desc', async () => {
      const mockAddresses = [
        { id: 'addr_2', userId: 'usr_1', isDefault: false, createdAt: new Date('2024-01-02') },
        { id: 'addr_1', userId: 'usr_1', isDefault: true, createdAt: new Date('2024-01-01') },
      ];
      vi.mocked(prisma.address.findMany).mockResolvedValueOnce(mockAddresses as any);

      const addresses = await AddressService.getAddresses('usr_1');

      expect(prisma.address.findMany).toHaveBeenCalledWith({
        where: { userId: 'usr_1' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      expect(addresses).toEqual(mockAddresses);
    });
  });

  describe('createAddress', () => {
    it('makes first address default automatically if user has no addresses', async () => {
      vi.mocked(prisma.address.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.address.create).mockResolvedValueOnce({
        id: 'addr_1',
        userId: 'usr_1',
        fullName: 'Priya Sharma',
        phone: '+919876543210',
        addressLine1: '402, Lotus Towers',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const address = await AddressService.createAddress('usr_1', {
        fullName: 'Priya Sharma',
        phone: '+919876543210',
        addressLine1: '402, Lotus Towers',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
        isDefault: false,
      });

      expect(address.isDefault).toBe(true);
      expect(prisma.address.updateMany).not.toHaveBeenCalled();
    });

    it('unsets existing default when creating a new default address', async () => {
      vi.mocked(prisma.address.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.address.create).mockResolvedValueOnce({
        id: 'addr_2',
        userId: 'usr_1',
        isDefault: true,
      } as any);

      await AddressService.createAddress('usr_1', {
        fullName: 'Rahul Kumar',
        phone: '+919876543211',
        addressLine1: '123, Park Street',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        country: 'India',
        isDefault: true,
      });

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr_1', isDefault: true },
        data: { isDefault: false },
      });
    });

    it('associates address with correct userId', async () => {
      vi.mocked(prisma.address.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.address.create).mockResolvedValueOnce({
        id: 'addr_1',
        userId: 'usr_1',
        isDefault: true,
      } as any);

      await AddressService.createAddress('usr_1', {
        fullName: 'Test User',
        phone: '+919876543210',
        addressLine1: 'Test Address',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
      });

      expect(prisma.address.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'usr_1' }),
        }),
      );
    });
  });

  describe('updateAddress', () => {
    it('throws NotFoundError if address does not belong to user', async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);

      await expect(
        AddressService.updateAddress('usr_1', 'addr_999', { city: 'Bangalore' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('unsets other defaults when setting address as default', async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce({
        id: 'addr_1',
        userId: 'usr_1',
        isDefault: false,
      } as any);
      vi.mocked(prisma.address.update).mockResolvedValueOnce({
        id: 'addr_1',
        userId: 'usr_1',
        isDefault: true,
      } as any);

      await AddressService.updateAddress('usr_1', 'addr_1', { isDefault: true });

      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr_1', isDefault: true, id: { not: 'addr_1' } },
        data: { isDefault: false },
      });
    });

    it('updates only provided fields', async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce({
        id: 'addr_1',
        userId: 'usr_1',
        city: 'Mumbai',
      } as any);
      vi.mocked(prisma.address.update).mockResolvedValueOnce({
        id: 'addr_1',
        userId: 'usr_1',
        city: 'Bangalore',
      } as any);

      const result = await AddressService.updateAddress('usr_1', 'addr_1', { city: 'Bangalore' });

      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr_1' },
        data: { city: 'Bangalore' },
      });
      expect(result.city).toBe('Bangalore');
    });
  });

  describe('setDefaultAddress', () => {
    it('throws NotFoundError if address does not belong to user', async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);

      await expect(AddressService.setDefaultAddress('usr_1', 'addr_999')).rejects.toThrow(NotFoundError);
    });

    it('atomically resets existing defaults and sets new default', async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce({
        id: 'addr_2',
        userId: 'usr_1',
        isDefault: false,
      } as any);
      vi.mocked(prisma.address.update).mockResolvedValueOnce({
        id: 'addr_2',
        userId: 'usr_1',
        isDefault: true,
      } as any);

      const result = await AddressService.setDefaultAddress('usr_1', 'addr_2');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.address.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr_1', isDefault: true },
        data: { isDefault: false },
      });
      expect(result.isDefault).toBe(true);
    });
  });

  describe('deleteAddress', () => {
    it('throws NotFoundError if address does not belong to user', async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);

      await expect(AddressService.deleteAddress('usr_1', 'addr_999')).rejects.toThrow(NotFoundError);
    });

    it('promotes newest remaining address to default when deleting default address', async () => {
      vi.mocked(prisma.address.findFirst)
        .mockResolvedValueOnce({ id: 'addr_1', userId: 'usr_1', isDefault: true } as any)
        .mockResolvedValueOnce({ id: 'addr_2', userId: 'usr_1', isDefault: false } as any);
      vi.mocked(prisma.address.delete).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.address.update).mockResolvedValueOnce({ id: 'addr_2', isDefault: true } as any);

      const result = await AddressService.deleteAddress('usr_1', 'addr_1');

      expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: 'addr_1' } });
      expect(prisma.address.update).toHaveBeenCalledWith({
        where: { id: 'addr_2' },
        data: { isDefault: true },
      });
      expect(result.message).toBe('Address deleted successfully');
    });

    it('does not promote another address if none remain', async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce({
        id: 'addr_1',
        userId: 'usr_1',
        isDefault: true,
      } as any);
      vi.mocked(prisma.address.delete).mockResolvedValueOnce({} as any);
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);

      const result = await AddressService.deleteAddress('usr_1', 'addr_1');

      expect(prisma.address.update).not.toHaveBeenCalled();
      expect(result.message).toBe('Address deleted successfully');
    });
  });

  describe('ownership enforcement', () => {
    it('never allows access to another user addresses in getAddresses', async () => {
      vi.mocked(prisma.address.findMany).mockResolvedValueOnce([]);

      await AddressService.getAddresses('usr_1');

      expect(prisma.address.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'usr_1' } }),
      );
    });

    it('never allows access to another user addresses in updateAddress', async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);

      await expect(AddressService.updateAddress('usr_1', 'addr_2', { city: 'Bangalore' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('never allows access to another user addresses in deleteAddress', async () => {
      vi.mocked(prisma.address.findFirst).mockResolvedValueOnce(null);

      await expect(AddressService.deleteAddress('usr_1', 'addr_2')).rejects.toThrow(NotFoundError);
    });
  });
});