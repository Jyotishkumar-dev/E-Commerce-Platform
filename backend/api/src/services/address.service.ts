import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.js';

export interface CreateAddressInput {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export class AddressService {
  static async getAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  static async createAddress(userId: string, input: CreateAddressInput) {
    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    } else {
      // If user has no existing addresses, make this the default
      const count = await prisma.address.count({ where: { userId } });
      if (count === 0) {
        input.isDefault = true;
      }
    }

    return prisma.address.create({
      data: {
        ...input,
        userId,
      },
    });
  }

  static async updateAddress(userId: string, addressId: string, input: Partial<CreateAddressInput>) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Address not found.');
    }

    if (input.isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true, id: { not: addressId } },
        data: { isDefault: false },
      });
    }

    return prisma.address.update({
      where: { id: addressId },
      data: input,
    });
  }

  static async setDefaultAddress(userId: string, addressId: string) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Address not found.');
    }

    // Atomically reset existing defaults and set the selected address as default
    return prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }

  static async deleteAddress(userId: string, addressId: string) {
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!existing) {
      throw new NotFoundError('Address not found.');
    }

    await prisma.address.delete({
      where: { id: addressId },
    });

    // If the deleted address was default, promote the newest remaining address
    if (existing.isDefault) {
      const remaining = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (remaining) {
        await prisma.address.update({
          where: { id: remaining.id },
          data: { isDefault: true },
        });
      }
    }

    return { message: 'Address deleted successfully' };
  }
}

