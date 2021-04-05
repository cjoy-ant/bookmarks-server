module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || "development",
  API_TOKEN: process.env.API_TOKEN || "dummy-api-token",
  DATABASE_URL:
    process.env.DATABASE_URL ||
    "postgres://treonqrusyxlwk:c3bb44d0e3ec572a6d8ae4c832e81b4deb6433864a76f48d19fc50332348da6a@ec2-54-235-108-217.compute-1.amazonaws.com:5432/d4bb1f7tlkgner",
  TEST_DATABASE_URL:
    process.env.TEST_DATABASE_URL ||
    "postgresql://dunder_mifflin@localhost/bookmarks-test",
};
