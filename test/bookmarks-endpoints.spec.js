const knex = require("knex");
const supertest = require("supertest");
const app = require("../src/app");
const { makeBookmarksArray } = require("./bookmarks.fixtures");
const { API_TOKEN } = require("../src/config");
const { expect } = require("chai");

describe("Bookmarks Endpoints", () => {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL,
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () => db("bookmarks").truncate());

  afterEach("cleanup", () => db("bookmarks").truncate());

  describe(`Unauthozied requests`, () => {
    const testBookmarks = makeBookmarksArray();
    const newBookmark = {
      title: "test-title",
      url: "https://test.com",
      rating: 1,
    };

    beforeEach("insert bookmarks", () => {
      return db.into("bookmarks").insert(testBookmarks);
    });

    it(`responds with 401 Unauthorized for GET /api/bookmarks`, () => {
      return supertest(app)
        .get("/api/bookmarks")
        .expect(401, { error: `Unauthorized request` });
    });

    it(`responds with 401 Unauthorized for POST /api/bookmarks`, () => {
      return supertest(app)
        .post("/api/bookmarks")
        .send(newBookmark)
        .expect(401, { error: `Unauthorized request` });
    });

    it(`responds with 401 Unauthorized for GET /api/bookmarks/:bookmark_id`, () => {
      const bookmarkToGet = testBookmarks[2];
      return supertest(app)
        .get(`/api/bookmarks/${bookmarkToGet.id}`)
        .expect(401, { error: `Unauthorized request` });
    });

    it(`responds with 401 Unauthorized for DELETE /api/bookmarks/:bookmark_id`, () => {
      const bookmarkToDelete = testBookmarks[2];
      return supertest(app)
        .delete(`/api/bookmarks/${bookmarkToDelete.id}`)
        .expect(401, { error: `Unauthorized request` });
    });
  });

  describe(`GET /api/bookmarks`, () => {
    context("Given the database is empty", () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get("/api/bookmarks")
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .expect(200, []);
      });
    });

    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /api/bookmarks responds with 200 and all of the bookmarks", () => {
        return supertest(app)
          .get("/api/bookmarks")
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .expect(200, testBookmarks);
      });
    });
  });

  describe(`GET /api/bookmarks/:bookmark_id`, () => {
    context("Given no matching bookmark in database", () => {
      it("responds with 404 when bookmark doesn't exist", () => {
        const bookmarkId = 123456;
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark Not Found` } });
      });
    });

    context("Given bookmark exists in database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /api/bookmarks/:bookmark_id responds with 200 and the specified bookmark", () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId];

        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .expect(200, expectedBookmark);
      });
    });
  });

  describe(`POST /api/bookmarks/:bookmark_id`, () => {
    it(`responds with 400 'missing title' if not provided`, () => {
      const newBookmarkMissingTitle = {
        //title: "test-title",
        url: "https://test.com",
        rating: 1,
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkMissingTitle)
        .set("Authorization", `Bearer ${API_TOKEN}`)
        .expect(400, {
          error: { message: `Missing 'title' in request body` },
        });
    });

    it(`responds with 400 'missing url' if not provided`, () => {
      const newBookmarkMissingUrl = {
        title: "test-title",
        //url: "https://test.com",
        rating: 1,
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkMissingUrl)
        .set("Authorization", `Bearer ${API_TOKEN}`)
        .expect(400, {
          error: { message: `Missing 'url' in request body` },
        });
    });

    it(`responds with 400 'missing rating' if not provided`, () => {
      const newBookmarkMissingRating = {
        title: "test-title",
        url: "https://test.com",
        //rating: 1,
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkMissingRating)
        .set("Authorization", `Bearer ${API_TOKEN}`)
        .expect(400, {
          error: { message: `Missing 'rating' in request body` },
        });
    });

    it(`responds with 400 'invalid url' valid url not provided`, () => {
      const newBookmarkInvalidUrl = {
        title: "test-title",
        url: "invalid url",
        rating: 1,
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkInvalidUrl)
        .set("Authorization", `Bearer ${API_TOKEN}`)
        .expect(400, {
          error: { message: `Valid URL is required` },
        });
    });

    it(`responds with 400 'invalid rating' if provided rating is not a number from 0 to 5`, () => {
      const newBookmarkInvalidRating = {
        title: "test-title",
        url: "https://test.com",
        rating: "invalid rating",
      };
      return supertest(app)
        .post(`/api/bookmarks`)
        .send(newBookmarkInvalidRating)
        .set("Authorization", `Bearer ${API_TOKEN}`)
        .expect(400, {
          error: { message: `Rating must be a number between 0 and 5` },
        });
    });

    it(`creates a bookmark, responding with 201 and the new bookmark`, () => {
      const newBookmark = {
        title: "test-title",
        url: "https://test.com",
        rating: 1,
        description: "test description",
      };
      return supertest(app)
        .post("/api/bookmarks")
        .send(newBookmark)
        .set("Authorization", `Bearer ${API_TOKEN}`)
        .expect(201)
        .expect((res) => {
          expect(res.body.title).to.eql(newBookmark.title);
          expect(res.body.url).to.eql(newBookmark.url);
          expect(res.body.rating).to.eql(newBookmark.rating);
          expect(res.body.description).to.eql(newBookmark.description);
          expect(res.body).to.have.property("id");
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`);
        })
        .then((postRes) => {
          supertest(app)
            .get(`/api/bookmarks/${postRes.body.id}`)
            .set("Authorization", `Bearer ${API_TOKEN}`)
            .expect(postRes.body);
        });
    });
  });

  context(`Given an XSS attack bookmark`, () => {
    const maliciousBookmark = {
      id: 911,
      title: 'Naughty naughty very naughty <script>alert("xss");</script>',
      url: "https://url.to.file.which/does-not.exist",
      rating: 0,
      description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
    };

    const expectedBookmark = {
      ...maliciousBookmark,
      title:
        'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;',
      description: `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`,
    };

    beforeEach("insert malicious bookmark", () => {
      return db.into("bookmarks").insert([maliciousBookmark]);
    });

    it("removes XSS attack content", () => {
      return supertest(app)
        .get(`/api/bookmarks/`)
        .set("Authorization", `Bearer ${API_TOKEN}`)
        .expect(200)
        .expect((res) => {
          expect(res.body[0].title).to.eql(expectedBookmark.title);
          expect(res.body[0].url).to.eql(expectedBookmark.url);
          expect(res.body[0].rating).to.eql(expectedBookmark.rating);
          expect(res.body[0].description).to.eql(expectedBookmark.description);
        });
    });
  });

  describe(`DELETE /api/bookmarks/:bookmark_id`, () => {
    context("Given no bookmark in database", () => {
      it(`responds 404 when bookmark does not exist`, () => {
        const idToDelete = 123456;
        return supertest(app)
          .delete(`/api/bookmarks/${idToDelete}`)
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark Not Found` } });
      });
    });

    context("Given bookmark exists in database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it(`responds with 204 and deletes the bookmark`, () => {
        const idToDelete = 2;
        const expectedBookmarks = testBookmarks.filter(
          (bookmark) => bookmark.id !== idToDelete
        );

        return supertest(app)
          .delete(`/api/bookmarks/${idToDelete}`)
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .expect(204)
          .then(() =>
            supertest(app)
              .get(`/api/bookmarks`)
              .set("Authorization", `Bearer ${API_TOKEN}`)
              .expect(expectedBookmarks)
          );
      });
    });
  });

  describe(`PATCH /api/bookmarks/:bookmark_id`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456;
        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark Not Found` } });
      });
    });

    context(`Given there are articles in the database`, () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it(`responds with 204 and updates the bookmark`, () => {
        const idToUpdate = 2;
        const updateBookmark = {
          title: "test - updated bookmark title",
          url: "https://test-updated-url.com",
          rating: 1,
          description: "test - updated description",
        };
        const expectedBookmark = {
          ...testBookmarks[idToUpdate],
          ...updateBookmark,
        };
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .send(updateBookmark)
          .expect(204)
          .then((res) =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set("Authorization", `Bearer ${API_TOKEN}`)
              .expect(expectedBookmark)
          );
      });

      it(`response with 400 when no required fields supplied`, () => {
        const idToUpdate = 2;
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .send({ irrelevantField: "foo" })
          .expect(400, {
            error: {
              message: `Request body must contain 'title', 'url', and 'rating'`,
            },
          });
      });

      it(`responds wtih 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2;
        const updateBookmark = {
          title: "test - updated bookmark title",
          //url: "https://test-updated-url.com",
          //rating: 1,
          //description: "test - updated description",
        };
        const expectedBookmark = {
          ...testBookmarks[idToUpdate],
          ...updateBookmark,
        };
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set("Authorization", `Bearer ${API_TOKEN}`)
          .send({
            ...updateBookmark,
            fieldToIgnore: "should not be in GET response",
          })
          .expect(204)
          .then((res) =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set("Authorization", `Bearer ${API_TOKEN}`)
              .expect(expectedBookmark)
          );
      });
    });
  });
});
