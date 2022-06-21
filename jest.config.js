module.exports = {
  preset: "ts-jest",
  testMatch: ["<rootDir>/**/__tests__/*.test.ts"],
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.js"],
};
