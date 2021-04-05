const path = require("path");
const express = require("express");
const xss = require("xss");
const logger = require("../logger");
const BookmarksService = require("./bookmarks-service");

const bookmarksRouter = express.Router();
const bodyParser = express.json();

const serializeBookmark = (bookmark) => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: bookmark.url,
  description: xss(bookmark.description),
  rating: Number(bookmark.rating),
});

bookmarksRouter
  .route("/")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    BookmarksService.getAllBookmarks(knexInstance)
      .then((bookmarks) => {
        res.json(bookmarks.map(serializeBookmark));
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, rating, description } = req.body;

    for (const field of ["title", "url", "rating"]) {
      if (!req.body[field]) {
        logger.error(`${field} is required`);
        return res.status(400).json({
          error: { message: `Missing '${field}' in request body` },
        });
      }
    }

    function isURL(str) {
      return /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/.test(str);
    }

    if (!isURL(url)) {
      logger.error(`Invalid ${url} provided`);
      return res.status(400).json({
        error: { message: `Valid URL is required` },
      });
    }

    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      logger.error(`Invalid rating of '${rating}' provided`);
      return res.status(400).json({
        error: { message: `Rating must be a number between 0 and 5` },
      });
    }

    const newBookmark = { title, url, rating, description };
    const knexInstance = req.app.get("db");

    BookmarksService.insertBookmark(knexInstance, newBookmark)
      .then((bookmark) => {
        logger.info(`Bookmark with id ${bookmark.id} created`);
        res
          .status(201)
          // .location(`/bookmarks/${bookmark.id}`)
          //.location(req.originalUrl + `/${bookmark.id}`)
          .location(path.posix.join(req.originalUrl, `/${bookmark.id}`))
          .json(serializeBookmark(bookmark));
      })
      .catch(next);
  });

bookmarksRouter
  .route("/:id")
  .all((req, res, next) => {
    const { id } = req.params;
    const knexInstance = req.app.get("db");
    BookmarksService.getById(knexInstance, id)
      .then((bookmark) => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${id} not found.`);
          return res.status(404).json({
            error: { message: `Bookmark Not Found` },
          });
        }
        res.bookmark = bookmark;
        next();
      })
      .catch(next);
  })
  .get((req, res) => {
    res.json(serializeBookmark(res.bookmark));
  })
  .delete((req, res) => {
    const { id } = req.params;
    const knexInstance = req.app.get("db");
    BookmarksService.deleteBookmark(knexInstance, id)
      .then((rows) => {
        logger.info(`Bookmark with id '${id}' deleted.`);
        res.status(204).end();
      })
      .catch();
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, rating, description } = req.body;
    const bookmarkToUpdate = { title, url, rating, description };

    const numberOfValues = Object.values(bookmarkToUpdate).filter(Boolean)
      .length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: `Request body must contain 'title', 'url', and 'rating'`,
        },
      });
    }

    const knexInstance = req.app.get("db");
    BookmarksService.updateBookmark(
      knexInstance,
      req.params.id,
      bookmarkToUpdate
    )
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarksRouter;
