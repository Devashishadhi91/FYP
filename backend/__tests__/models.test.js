const mongoose = require('mongoose');
const User = require('../models/Usermodel');
const Product = require('../models/Productmodel');
const Sale = require('../models/Salesmodel');
const Order = require('../models/Ordermodel');

describe('Model Validation Tests', () => {
  it('MDL-01: Save User without name should throw ValidationError', async () => {
    const user = new User({ email: 'test@test.com', password: 'password123' });
    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors.name).toBeDefined();
  });

  it('MDL-02: Save User without email should throw ValidationError', async () => {
    const user = new User({ name: 'Test', password: 'password123' });
    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors.email).toBeDefined();
  });

  it('MDL-03: Save User without password should throw ValidationError', async () => {
    const user = new User({ name: 'Test', email: 'test@test.com' });
    let error;
    try {
      await user.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors.password).toBeDefined();
  });

  it('MDL-04: Save User with duplicate email should throw MongoServerError', async () => {
    const user1 = new User({ name: 'Test1', email: 'duplicate@test.com', password: 'password123' });
    await user1.save();

    const user2 = new User({ name: 'Test2', email: 'duplicate@test.com', password: 'password123' });
    let error;
    try {
      await user2.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('MongoServerError');
    expect(error.code).toBe(11000);
  });

  it('MDL-05: User role defaults to staff when not provided', async () => {
    const user = new User({ name: 'Test', email: 'test2@test.com', password: 'password123' });
    const savedUser = await user.save();
    expect(savedUser.role).toBe('staff');
  });

  it('MDL-06: Save Product without name should throw ValidationError', async () => {
    const product = new Product({ Category: 'Cat', MRP: 100 });
    let error;
    try {
      await product.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors.name).toBeDefined();
  });

  it('MDL-07: Save Product without Category should throw ValidationError', async () => {
    const product = new Product({ name: 'Prod', MRP: 100 });
    let error;
    try {
      await product.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors.Category).toBeDefined();
  });

  it('MDL-08: Save Product without MRP should throw ValidationError', async () => {
    const product = new Product({ name: 'Prod', Category: 'Cat' });
    let error;
    try {
      await product.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors.MRP).toBeDefined();
  });

  it('MDL-09: Product quantity defaults to 0', async () => {
    const product = new Product({ name: 'Prod', Category: 'Cat', MRP: 100 });
    const savedProduct = await product.save();
    expect(savedProduct.quantity).toBe(0);
  });

  it('MDL-10: Save Sale without customerName should throw ValidationError', async () => {
    const sale = new Sale({
      products: [{ product: new mongoose.Types.ObjectId(), quantity: 1, price: 100 }],
      totalAmount: 100
    });
    let error;
    try {
      await sale.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors.customerName).toBeDefined();
  });

  it('MDL-11: Sale paymentStatus rejects invalid enum value', async () => {
    const sale = new Sale({
      customerName: 'Test',
      products: [{ product: new mongoose.Types.ObjectId(), quantity: 1, price: 100 }],
      totalAmount: 100,
      paymentStatus: 'invalid'
    });
    let error;
    try {
      await sale.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors.paymentStatus).toBeDefined();
  });

  it('MDL-12: Save Order without Description should throw ValidationError', async () => {
    const order = new Order({
      user: new mongoose.Types.ObjectId(),
      products: [{ product: new mongoose.Types.ObjectId(), quantity: 1, price: 100 }]
    });
    let error;
    try {
      await order.save();
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.name).toBe('ValidationError');
    expect(error.errors.Description).toBeDefined();
  });

  it('MDL-13: Order status defaults to pending', async () => {
    const order = new Order({
      user: new mongoose.Types.ObjectId(),
      requestedBy: new mongoose.Types.ObjectId(),
      Description: 'Test Order',
      totalAmount: 500,
      products: [{ product: new mongoose.Types.ObjectId(), quantity: 1, price: 100 }]
    });
    const savedOrder = await order.save();
    expect(savedOrder.status).toBe('pending');
  });
});
