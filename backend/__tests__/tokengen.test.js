const generateToken = require('../libs/Tokengenerator');
const jwt = require('jsonwebtoken');

describe('Token Generator Tests', () => {
  const mockRes = {
    cookie: jest.fn()
  };

  const user = {
    _id: '12345',
    role: 'admin'
  };

  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockRes.cookie.mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('TKN-01: generateToken with valid user generates JWT and sets cookie', async () => {
    process.env.SecretKey = 'testsecret';
    const token = await generateToken(user, mockRes);
    
    expect(typeof token).toBe('string');
    expect(mockRes.cookie).toHaveBeenCalledWith(
      "Inventorymanagmentsystem",
      token,
      expect.any(Object)
    );
  });

  it('TKN-02: Generated token decodes correctly', async () => {
    process.env.SecretKey = 'testsecret';
    const token = await generateToken(user, mockRes);
    
    const decoded = jwt.verify(token, process.env.SecretKey);
    expect(decoded.userId).toBe('12345');
    expect(decoded.role).toBe('admin');
  });

  it('TKN-03: generateToken when process.env.SecretKey is undefined throws error', async () => {
    delete process.env.SecretKey;
    
    await expect(generateToken(user, mockRes)).rejects.toThrow("Failed to generate token");
  });

  it('TKN-04: Token expires after 7 days', async () => {
    process.env.SecretKey = 'testsecret';
    const token = await generateToken(user, mockRes);
    
    const decoded = jwt.verify(token, process.env.SecretKey);
    expect(decoded.exp - decoded.iat).toBe(7 * 24 * 60 * 60);
  });
});
