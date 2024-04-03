const { Pool } = require("pg");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const { transporter } = require("./nodemailer");
const { v4: uuidv4 } = require("uuid");
const { PdfDocument } = require("@ironsoftware/ironpdf");
const axios = require("axios").default;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const createUser = async (request, response) => {
  const { fullName, email, password, mobileNumber, role } = request.body;
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // const verificationToken = uuidv4();

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
          `INSERT INTO users (username, email, password, mobile_number,	role
            ) VALUES ($1, $2, $3, $4, $5) RETURNING id, registration_number, verified, role`,
          [fullName, email, hashedPassword, mobileNumber, role],
          (error, results) => {
            // console.log("query resp ", error, results);
            if (error) {
              throw new Error(error);
            }
            if (!results.rows[0].verified) {
              sendVerificationEmail(email, results.rows[0].id);
            } else {
              response
                .status(200)
                .send(
                  `Email is already verified. Your Registration Id is: ${results.rows[0].registration_number}. `
                );
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
const pdfExtract = async (fileBuffer) => {
  const pdf = await PdfDocument.fromFile(fileBuffer);
  let extractedText = await pdf.extractText();
  // console.log("extracted text is  ----------------> ", extractedText);

  const options = {
    method: "POST",
    url: "https://api.edenai.run/v2/text/keyword_extraction",
    headers: {
      authorization: `Bearer ${process.env.EDENAIKEY}`,
    },
    data: {
      providers: "microsoft",
      text: extractedText,
      language: "en",
      fallback_providers: "amazon",
    },
  };

  const returnedData = await axios
    .request(options)
    .then((response) => {
      const foundKeywords =
        response.data.microsoft.items.length > 0
          ? [...response.data.microsoft.items]
          : [...response.data.amazon.items];
      // console.log("keywords response ------>", response.data.microsoft.items);
      return foundKeywords;
    })
    .catch((error) => error);
  const filteredData = returnedData.map((obj) => obj.keyword).slice(0, 10);
  return filteredData;
};
const storeResume = async (request, response) => {
  const { regId } = request.params;
  const { file, user } = request;
  const {
    fieldname: mappedKey,
    originalname: fileName,
    buffer: actualFileContent,
    size: fileSize,
  } = file;
  console.log("userfiles ------>", request);
  console.log("resume ------>", file, regId);
  console.log(
    "destructured ---------> ",
    mappedKey,
    fileName,
    actualFileContent.toString("base64"),
    fileSize
  );
  pool.query(
    `SELECT * FROM users WHERE registration_number = $1`,
    [regId],
    (error, result) => {
      if (error) {
        throw new Error(error);
      }

      if (result.rows[0].id) {
        pdfExtract(actualFileContent)
          .then((foundKeywords) => {
            pool.query(
              `INSERT INTO resumes (user_id, upload_timestamp, resume, key_words) VALUES($1, $2, $3, $4) RETURNING id`,
              [
                result.rows[0].id,
                new Date(),
                actualFileContent.toString("base64"),
                foundKeywords,
              ],
              (error, result) => {
                if (error) {
                  throw new Error(error);
                }
                if (result.rows[0].id) {
                  response
                    .status(201)
                    .json({ message: "Resume Uploaded Successfully" });
                }
              }
            );
            console.log("found key words --------> ", foundKeywords);
          })
          .catch((err) => console.log(err));
      } else {
        throw new Error("Error in finding uuid");
      }
    }
  );
};

const sendVerificationEmail = (email, verificationToken = "") => {
  console.log("email is ", email);
  const mailOptions = {
    from: "TalentSync@gmail.com",
    to: email,
    subject: `${
      verificationToken
        ? "Email Verification"
        : "Your TalentSync Profile Rejected"
    }`,
    text: `${
      verificationToken
        ? `Please click the following link to verify your email:http://localhost:4000/verify/${verificationToken}`
        : "Hello Dear Customer, Your TalentSync Proile is rejected by admin for incorrect or suspicious Info. please cleate a new account and make sure correct data is added to it."
    }`,
  };
  console.log("text is ", mailOptions.text);
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      throw new Error(error);
    } else {
      console.log("mail sent successfully", info);
    }
  });
};
const verifyEmail = async (request, response) => {
  const receivedToken = request.params.verificationToken;
  console.log("received  ------>", receivedToken);
  pool.query(
    `SELECT * FROM users WHERE id = $1`,
    [receivedToken],
    (error, result) => {
      if (error) {
        return response.status(500).json({ message: "Internal Server Error" });
      }
      if (result.rowCount) {
        // Token not found or expired
        console.log("got result -----> ", result);

        pool.query(
          `UPDATE users
          SET verified = true
          WHERE id = $1 RETURNING email`,
          [result.rows[0].id],
          (error, result) => {
            if (error) {
              throw new Error(error);
            }
            if (result.rowCount) {
              // console.log("got update response -----> ", result);
              return response.status(200).json({
                message: `Email ${result.rows[0].email}  Verified Successfully`,
              });
            }
          }
        );
      } else {
        return response
          .status(404)
          .json({ message: `Email not found in Database` });
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
        // console.log("results are ---", results);
        const {
          username,
          email: storedEmail,
          password: storedPassword,
          created_at,
          updated_at,
          registration_number,
          role_id,
          role,
        } = results.rows[0];
        console.log("role is ---> ", role);
        bcrypt.compare(password, storedPassword, (err, result) => {
          if (err) {
            throw new Error("Hach issue");
          }
          // console.log("compare ", password, results.rows[0].password, result);
          if (result) {
            const payload = {
              username,
              storedEmail,
              registration_number,
              role_id,
              role,
            };
            // const user = { name: email };
            const accessToken = jwt.sign(
              payload,
              process.env.SECRET_KEY,
              { expiresIn: "10000" } // Access token expires in 1 minute, adjust as needed
            );
            const refreshToken = jwt.sign(
              payload,
              process.env.REFRESH_SECRET_KEY,
              { expiresIn: "7d" } // Refresh token expires in 7 days, adjust as needed
            );

            response.setHeader("Authorization", `${accessToken}`);
            response.setHeader("RefreshToken", refreshToken);
            response.setHeader(
              "Access-Control-Expose-Headers",
              "Authorization, RefreshToken"
            );

            response.status(200).json({ message: "Successfully logged in" });
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

const getAllUsers = async (request, response) => {
  // try {
  //   const queryResult = await pool.query(
  //     `SELECT * FROM users WHERE approval_status IS NULL `
  //   );
  //   console.log("query result ------> ", queryResult);
  //   if (queryResult.rows.length === 0) {
  //     response.status(404).json({ message: "No data found", users: null });
  //   } else {
  //     response
  //       .status(200)
  //       .json({ message: "Data Found", users: queryResult.rows });
  //   }
  // } catch (error) {
  //   // console.log("result ", error);
  //   response.status(500).json({ message: "Internal Server Error" });
  // }
  const currUser = request.user;
  if (currUser.role === "Admin") {
    pool.query(
      `SELECT * FROM users WHERE approval_status IS NULL`,
      [],
      (error, results) => {
        if (error) {
          throw new Error(error);
        }
        if (results.rows.length !== 0) {
          response
            .status(200)
            .json({ message: "Data Found", users: results.rows });
        } else {
          response.status(404).json({ message: "No Data Found", users: null });
        }
      }
    );
    return;
  }
  response
    .status(401)
    .json({ message: "Confidential data, You are not Authorized" });
};
const getJobMatches = async (request, response) => {
  const searchText = request.searchText;

  console.log("backend search text  ---------> ", searchText);
  if (searchText) {
    pool.query(
      `SELECT key_word
      FROM resumes,
           unnest(key_words) AS key_word
      WHERE LOWER(key_word) LIKE LOWER('%'|| $1 ||'%');`,
      [searchText],
      (error, result) => {
        console.log("query resp ------->", result);
        if (error) {
          throw new Error(error);
        }
        if (result.rows.length > 0) {
          console.log(
            "found matches obj ---------> ",
            result.rows.reduce((acc, ele) => [...acc, ele.key_word], [])
          );
          response.status(200).json({
            message: "results found",
            result: result.rows.reduce(
              (acc, ele) => [...acc, ele.key_word],
              []
            ),
          });
        } else {
          response
            .status(200)
            .json({ message: "no results found", result: null });
        }
      }
    );
  }
};
const q = `SELECT u.username, u.email, u.mobile_number, r.resume FROM resumes r INNER JOIN users u ON u.id = r.user_id WHERE $1 = ANY(key_words)`;
const getMatchedResumes = async (req, res) => {
  const exactSearchText = req.query.searchText;
  if (exactSearchText) {
    pool.query(
      `SELECT u.username, u.email, u.mobile_number, r.resume FROM resumes r INNER JOIN users u ON u.id = r.user_id WHERE $1 = ANY(key_words)`,
      [exactSearchText],
      (error, result) => {
        console.log("query resp ------->", result);
        if (error) {
          throw new Error(error);
        }
        if (result.rows.length > 0) {
          console.log("returned resumes are ------> ", result.rows);
          // res.setHeader("Content-Description", "File Transfer");
          // res.setHeader(
          //   "Content-Disposition",
          //   "attachment; filename=print.pdf"
          // );
          res.setHeader("Content-Type", "application/pdf");

          res
            .status(200)
            .json({ message: "Resumes found..", clients: result.rows });
        } else {
          res
            .status(404)
            .json({ message: "No resumes foudn this should not happen" });
        }
      }
    );
  }
};

const getRecruiters = async (req, res) => {
  const currUser = req.user;
  if (currUser.role === "Admin") {
    pool.query(
      `SELECT * FROM users WHERE role = 'Recruiter' AND approval_status = 'Approved'`,
      [],
      (error, result) => {
        if (error) {
          throw new Error(error);
        } else if (result.rows.length === 0) {
          res.status(404).json({
            message: "No Data Found",
            recruiters: null,
          });
        } else {
          res.status(200).json({
            message: "Data found and sent to client",
            recruiters: result.rows,
          });
        }
      }
    );
    return;
  }
  res
    .status(401)
    .json({ message: "Confidential data, You are not Authorized" });
};

const getClients = async (req, res) => {
  const currUser = req.user;
  if (currUser.role === "Admin") {
    pool.query(
      `SELECT * FROM users WHERE role = 'Client' AND approval_status = 'Approved'`,
      [],
      (error, result) => {
        if (error) {
          throw new Error(error);
        } else if (result.rowCount === 0) {
          res.status(404).json({
            message: "No data found",
            clients: null,
          });
        } else {
          res.status(200).json({
            message: "Data found and sent to client",
            clients: result.rows,
          });
        }
      }
    );
    return;
  }
  res
    .status(401)
    .json({ message: "Confidential data, You are not Authorized" });
};

const approveUser = async (req, res) => {
  const currUser = req.user;
  const RegId = req.body.regNumber;

  if (currUser.role === "Admin") {
    pool.query(
      `UPDATE users SET role_id = LOWER(role) WHERE registration_number = $1`,
      [RegId],
      (error, result) => {
        // console.log("result ---> ", result);
        if (error) {
          throw new Error(error);
        } else if (result.rowCount) {
          pool.query(
            `UPDATE users SET approval_status = 'Approved' WHERE registration_number = $1`,
            [RegId],
            (error, result) => {
              console.log("result is ", result);
              if (error) {
                throw new Error(error);
              } else {
                res.status(200).json({
                  message: "Update Cycle Completed Successfully",
                  updatedUsers: null,
                });
              }
            }
          );
        }
      }
    );
    return;
  }
  res
    .status(401)
    .json({ message: "Confidential data, You are not Authorized" });
};

const rejectUser = async (req, res) => {
  const currUser = req.user;
  const RegId = req.body.regNumber;
  console.log("email is -----> ", req.user);
  if (currUser.role === "Admin") {
    pool.query(
      `DELETE FROM users WHERE registration_number = $1`,
      [RegId],
      (error, result) => {
        // console.log("result ---> ", result);
        if (error) {
          throw new Error(error);
        } else if (result.rowCount) {
          sendVerificationEmail(currUser.storedEmail);
          res.status(200).json({
            message: "Record Succesfully Deleted",
          });
        }
      }
    );
    return;
  }
  res
    .status(401)
    .json({ message: "Confidential data, You are not Authorized" });
};

module.exports = {
  createUser,
  getUser,
  getAllUsers,
  verifyEmail,
  storeResume,
  getJobMatches,
  getMatchedResumes,
  getRecruiters,
  getClients,
  approveUser,
  rejectUser,
};
