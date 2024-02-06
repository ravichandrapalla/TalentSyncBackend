const { Pool } = require("pg");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const createUser = async (request, response) => {
  const { fullName, email, password } = request.body;
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email],
    (error, results) => {
      if (error) {
        throw new Error(error);
      }

      if (results?.rows?.length > 0) {
        response
          .status(409)
          .json({ message: "Email already registered. Please Login..." });
      } else {
        pool.query(
          `INSERT INTO users (username, email, password
            ) VALUES ($1, $2, $3) RETURNING registration_number`,
          [fullName, email, hashedPassword],
          (error, results) => {
            console.log("query resp ", error, results);
            if (error) {
              throw new Error(error);
            }
            response
              .status(201)
              .send(
                `User Registration is Successfull. Your Registration Id is : ${results.rows[0].registration_number}`
              );
          }
        );
      }
    }
  );
};

const getUser = async (request, response) => {
  const { email, password } = request.body;

  pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email],
    (error, results) => {
      if (error) {
        throw new Error(error);
      }
      if (results.rows.length > 0) {
        console.log("results are ---", results);
        const {
          username,
          email: storedEmail,
          password: storedPassword,
          created_at,
          updated_at,
          registration_number,
        } = results.rows[0];
        bcrypt.compare(password, storedPassword, (err, result) => {
          if (err) {
            throw new Error("Hach issue");
          }
          console.log("compare ", password, results.rows[0].password, result);
          if (result) {
            const payload = {
              username,
              storedEmail,
              registration_number,
            };
            // const user = { name: email };
            jwt.sign(
              payload,
              process.env.SECRET_KEY,
              { expiresIn: "1m" },
              (err, token) => {
                if (err) {
                  return response
                    .status(500)
                    .json({ message: "internal Server Error" });
                }

                response.setHeader("Authorization", `Bearer ${token}`);
                response.setHeader(
                  "Access-Control-Expose-Headers",
                  "Authorization"
                );
                response
                  .status(200)
                  .json({ message: "Successfully Logged in" });
              }
            );
          } else {
            response.status(401).json({ message: "Incorrect Password" });
          }
        });
      } else {
        response.status(404).json({
          message: "Email not found. please Register before Login...",
        });
      }
    }
  );
};

module.exports = {
  createUser,
  getUser,
};
