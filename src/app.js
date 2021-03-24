require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const { NODE_ENV } = require("./config");
const logger = require("./logger");
const validateBearerToken = require("./validate-bearer-token");
const errorHandler = require("./error-handler");
const bookmarksRouter = require("./bookmarks/bookmarks-router");

const app = express();

const morganOption = NODE_ENV === "production" ? "tiny" : "common";

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use(validateBearerToken);

app.use(bookmarksRouter);

app.use(errorHandler);

module.exports = app;
