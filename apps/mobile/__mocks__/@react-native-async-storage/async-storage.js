const store = new Map();

module.exports = {
  getItem: jest.fn(async (key) => store.get(key) ?? null),
  setItem: jest.fn(async (key, val) => store.set(key, String(val))),
  removeItem: jest.fn(async (key) => store.delete(key)),
  clear: jest.fn(async () => store.clear()),
};
