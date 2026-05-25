const validateEnv = require('../libs/validateEnv');

describe('validateEnv Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('ENV-01: All required env vars present', () => {
    process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
    process.env.SecretKey = 'secret';
    process.env.Cloud_Name = 'cloud';
    process.env.Api_Key = 'key';
    process.env.Api_Secret = 'secret';
    
    expect(() => validateEnv()).not.toThrow();
  });

  it('ENV-02: MONGODB_URL missing', () => {
    delete process.env.MONGODB_URL;
    process.env.SecretKey = 'secret';
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const mockConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    validateEnv();
    
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsole).toHaveBeenCalled();
    
    mockExit.mockRestore();
    mockConsole.mockRestore();
  });

  it('ENV-03: SecretKey is empty string', () => {
    process.env.MONGODB_URL = 'mongodb://localhost:27017/test';
    process.env.SecretKey = '';
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const mockConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    validateEnv();
    
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsole).toHaveBeenCalled();
    
    mockExit.mockRestore();
    mockConsole.mockRestore();
  });

  it('ENV-04: Multiple vars missing', () => {
    delete process.env.MONGODB_URL;
    delete process.env.SecretKey;
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const mockConsole = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    validateEnv();
    
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockConsole).toHaveBeenCalled();
    
    mockExit.mockRestore();
    mockConsole.mockRestore();
  });
});
