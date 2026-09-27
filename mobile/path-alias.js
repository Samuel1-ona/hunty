const path = require("path");

const alias = {
  "@": path.resolve(__dirname, "."),
  "@lib": path.resolve(__dirname, "../lib"),
  "@store": path.resolve(__dirname, "./store"),
  "@providers": path.resolve(__dirname, "./providers"),
};

module.exports = alias;
