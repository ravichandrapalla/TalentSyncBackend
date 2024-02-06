const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const db = require("./queries");
const verifyToken = require("./authMiddleware");
const port = process.env.PORT || 3001;
// const HOST = "127.0.0.1";
require("dotenv").config();

// middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.post("/signup", db.createUser);
app.post("/login", db.getUser);
app.get("/getCurrentUser", verifyToken, (req, res) => {
  res.status(200).json({ message: "token is verified and looks good" });
});

app.get("/dashboard", verifyToken, (req, res) => {
  res.json({ message: "You Landed on Dashboard" });
});

// app.post("/api/signup", async (req, res) => {
//   const { fullName, email, password } = req.body;
//   const responseData = {};
//   if (fullName && email && password) {
//     responseData.data = { fullName, email, password };
//     responseData.error = undefined;
//   } else {
//     responseData.data = undefined;
//     responseData.error = "error from backend";
//   }
//   res.json(responseData);
// });
// app.post("/api/login", async (req, res) => {
//   const { fullName, email, password } = req.body;
//   const responseData = {};
//   if (fullName && email && password) {
//     responseData.data = { fullName, email, password };
//     responseData.error = undefined;
//   } else {
//     responseData.data = undefined;
//     responseData.error = "error from backend";
//   }
//   res.json(responseData);
// });

app.listen(port, () => {
  console.log(`listening on port ${port}....`);
});
