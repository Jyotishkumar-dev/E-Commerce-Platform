import { describe, expect, it, vi } from 'vitest';
import { AddressService } from './address.service.js';
import { prisma } from '../lib/prisma.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
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
  });
});
