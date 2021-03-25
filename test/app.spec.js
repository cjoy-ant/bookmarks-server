const app = require("../src/app");
const { API_TOKEN } = require("../src/config");

describe("App", () => {
  it('GET / responds with a 200 containing "Hello, world!"', () => {
    return supertest(app)
      .get("/")
      .set("Authorization", `Bearer ${API_TOKEN}`)
      .expect(200, "Hello, world!");
  });
});
