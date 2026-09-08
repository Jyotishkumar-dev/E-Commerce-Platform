import type { NextFunction, Request, Response } from 'express';
import { AddressService } from '../services/address.service.js';
import { getParam } from '../utils/params.js';
import { created, ok } from '../utils/response.js';

export class AddressController {
  static async getAddresses(req: Request, res: Response, next: NextFunction) {
    try {
      const addresses = await AddressService.getAddresses(req.user!.id);
      return ok(res, req, { addresses }, 'Addresses fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await AddressService.createAddress(req.user!.id, req.body);
      return created(res, req, { address }, 'Address added successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const addressId = getParam(req, 'addressId');
      const address = await AddressService.updateAddress(req.user!.id, addressId, req.body);
      return ok(res, req, { address }, 'Address updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const addressId = getParam(req, 'addressId');
      const result = await AddressService.deleteAddress(req.user!.id, addressId);
      return ok(res, req, null, result.message);
    } catch (error) {
      next(error);
    }
  }

  static async setDefaultAddress(req: Request, res: Response, next: NextFunction) {
    try {
      const addressId = getParam(req, 'addressId');
      const address = await AddressService.setDefaultAddress(req.user!.id, addressId);
      return ok(res, req, { address }, 'Default address updated');
    } catch (error) {
      next(error);
    }
  }
}

