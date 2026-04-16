module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/*.test.ts"],
  roots: ["<rootDir>/src", "<rootDir>/tests"],
};
