const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.status(200).send("Hello, World!");
});

app.get("/name/:name", (req, res) => {
  res.status(200).send(`Hello, ${req.params.name}!`);
});

module.exports = app;
