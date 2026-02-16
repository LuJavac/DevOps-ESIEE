const request = require("supertest");
const app = require("./app");

describe("GET /", () => {
  it("should return Hello, World!", async () => {
    const response = await request(app).get("/");
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("Hello, World!");
  });
});

describe("GET /name/:name", () => {
  it("should return Hello, Remy!", async () => {
    const response = await request(app).get("/name/Remy");
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe("Hello, Remy!");
  });
});
