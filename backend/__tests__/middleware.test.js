const {
  authmiddleware,
  adminmiddleware,
  managermiddleware,
  adminOrManagerMiddleware,
  staffStoreGuard
} = require('../middleware/Authmiddleware');
const jwt = require('jsonwebtoken');

describe('Middleware Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = { cookies: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    next = jest.fn();
    process.env.SecretKey = 'testsecret';
  });

  describe('authmiddleware', () => {
    it('MW-01: no cookie provided', async () => {
      await authmiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized: No token provided." });
    });

    it('MW-02: invalid/tampered JWT', async () => {
      req.cookies.Inventorymanagmentsystem = 'invalidtoken';
      await authmiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized: Invalid or expired token." });
    });

    it('MW-03: valid token, user exists', async () => {
      const token = jwt.sign({ userId: '123' }, process.env.SecretKey);
      req.cookies.Inventorymanagmentsystem = token;
      
      const User = require('../models/Usermodel');
      // Middleware chains: User.findById().select().populate() — mock the full chain
      const mockPopulate = jest.fn().mockResolvedValue({ _id: '123', role: 'admin' });
      const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
      jest.spyOn(User, 'findById').mockReturnValue({ select: mockSelect });
      
      await authmiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('MW-04: valid token, user deleted from DB', async () => {
      const token = jwt.sign({ userId: '123' }, process.env.SecretKey);
      req.cookies.Inventorymanagmentsystem = token;
      
      const User = require('../models/Usermodel');
      // Simulate user not found — chain resolves to null
      const mockPopulate = jest.fn().mockResolvedValue(null);
      const mockSelect = jest.fn().mockReturnValue({ populate: mockPopulate });
      jest.spyOn(User, 'findById').mockReturnValue({ select: mockSelect });
      
      await authmiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized: User not found." });
    });

    it('MW-05: expired token', async () => {
      const token = jwt.sign({ userId: '123' }, process.env.SecretKey, { expiresIn: '-1s' });
      req.cookies.Inventorymanagmentsystem = token;
      await authmiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized: Invalid or expired token." });
    });
  });

  describe('Role Middlewares', () => {
    it('MW-06: adminmiddleware - user role is admin', () => {
      req.user = { role: 'admin' };
      adminmiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('MW-07: adminmiddleware - user role is manager', () => {
      req.user = { role: 'manager' };
      adminmiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Access denied. admin role required." });
    });

    it('MW-08: adminmiddleware - user role is staff', () => {
      req.user = { role: 'staff' };
      adminmiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Access denied. admin role required." });
    });

    it('MW-09: managermiddleware - user role is manager', () => {
      req.user = { role: 'manager' };
      managermiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('MW-10: managermiddleware - user role is admin', () => {
      req.user = { role: 'admin' };
      managermiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Access denied. manager role required." });
    });

    it('MW-11: adminOrManagerMiddleware - admin', () => {
      req.user = { role: 'admin' };
      adminOrManagerMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('MW-12: adminOrManagerMiddleware - manager', () => {
      req.user = { role: 'manager' };
      adminOrManagerMiddleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('MW-13: adminOrManagerMiddleware - staff', () => {
      req.user = { role: 'staff' };
      adminOrManagerMiddleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Access denied. Admin or Manager role required." });
    });

    it('MW-14: staffStoreGuard - staff with no storeId, not isRounding', () => {
      req.user = { role: 'staff', storeId: null, isRounding: false };
      staffStoreGuard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Access denied. Your account is not assigned to any store. Contact your admin." });
    });

    it('MW-15: staffStoreGuard - staff with storeId', () => {
      req.user = { role: 'staff', storeId: '123' };
      staffStoreGuard(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('MW-16: staffStoreGuard - rounding staff', () => {
      req.user = { role: 'staff', storeId: null, isRounding: true };
      staffStoreGuard(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
