const app = require("./app");
const connectDatabase = require("./db/Database");

//handeling error
process.on("uncaughtException", (err) => {
  console.log(`Error : ${err.message}`);
  console.log(`shutting down the server for uncaught exception`);
});

//config

if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: "config/.env",
  });
}

//connect to database
connectDatabase();

// create server

const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

//unhandel promise rejection

process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server for :${err.message}`);
  console.log(`shutting down the server for unhandeled promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});
