const express = require("express");
const app = express();
const port = 8080;
const db = require("./utils/db");
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const csurf = require("csurf");
const { hash, compare } = require("./utils/bc");

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(
    require("cookie-session")({
        secret: "very secret",
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);
app.use(cookieParser());

app.use(
    express.urlencoded({
        extended: false
    })
);

// app.use(csurf()); //// has to come after urlencoded, body parsing and cookie session must come before this - token is in the req.body
// app.use((req, res, next) => {
//     res.set("x-frame-options", "DENY");
//     res.locals.csrfToken = req.csrfToken;
//     next();
// });
app.use(express.static("public"));

app.get("/register", (req, res) => {
    console.log("GET REGISTER");
    res.render("register");
});

app.post("/register", (req, res) => {
    console.log("post/register happening");

    const first = req.body.first;
    const last = req.body.last;
    const email = req.body.email;
    const password = req.body.password;
    console.log(first, last, email, password);

    hash(password)
        .then(hashedPw => {
            console.log("hashedPW", hashedPw);
            // We will store the hashed PW and all other user info supplied in our DB
            db.insertUsers(first, last, email, hashedPw)
                .then(result => {
                    req.session.userId = result.rows[0].id;
                    console.log("result.rows[0].id: ", result.rows[0].id);
                    res.redirect("/petition");
                })
                .catch(err => {
                    res.render("register", {
                        err
                    });
                    console.log("error in password catch: ", err);
                });
        })
        .catch(err => {
            console.log("error in Post register in hash", err);
            res.render("register", { err });
        });
});

app.get("/profile", (req, res) => {
    res.render("profile");
});

app.post("/profile", (req, res) => {
    console.log("made it to the post profile");

    const age = req.body.age;
    const city = req.body.city;
    let url = req.body.url;
    const user_id = req.session.userId;
    console.log(age, city, url, user_id);

    if (!url.startsWith("http" || "https")) {
        url = "http:" + url;
    }

    db.insertProfile(age, city, url, user_id) /////////// trebam li ovdje dodati jos nesto?
        .then(results => {
            console.log(results);
            res.redirect("/thanks");
        })
        .catch(error => {
            console.log(error);
        });
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", (req, res) => {
    console.log("/POST LOGIN");
    db.getPass(req.body.email)
        .then(result => {
            const hashedPw = result.rows[0].password;
            compare(req.body.password, hashedPw)
                .then(matchValue => {
                    console.log("match value of compare", matchValue);
                    if (matchValue == true) {
                        req.session.userId = result.rows[0].id;
                        console.log("req.session.userId: ", req.session.userId);

                        db.getSignature(req.session.userId).then(signature => {
                            if (signature.rows[0]) {
                                console.log(signature.rows[0]);

                                // console.log("result u getsignature: ", result);
                                // console.log("req.session: ", req.session);
                                req.session.sigid = result.rows[0].id;
                                res.redirect("/thanks");
                            } else {
                                res.redirect("/petition");
                            }
                        });
                    } else {
                        res.render("login"); // renderirati ovdje error poruku!!!!!!!!!!!!!!!!!!!!!!!
                    }
                })
                .catch(error => {
                    console.log("error in POST login compare", error);
                    res.render("login", {
                        error
                    });
                });
        })
        .catch(error => {
            console.log("error in post login: ", error);
            res.render("login", { error });
        });
});

app.get("/petition", (req, res) => {
    console.log("made it to the GET petition route");
    console.log("req.session u get petition: ", req.session);

    if (req.session.sigid) {
        res.redirect("/thanks");
    } else if (!req.session.userId) {
        res.redirect("/register");
    } else {
        res.render("petition");
    }
});

app.post("/petition", (req, res) => {
    console.log("made it to the POST petition route");
    const userId = req.session.userId;
    console.log("req.session.userId u post petition: ", req.session.userId);
    console.log("req.body u post petition: ", req.session.body);

    const signature = req.body.signature;

    // do insert of submitted data into database
    db.addSignatures(signature, userId)

        .then(result => {
            // console.log("req.session in addsignatures: ", req.session);

            req.session.sigid = result.rows[0].id; ///adding it to the object req.session

            res.redirect("/thanks");
        })
        .catch(error => {
            console.log("error in addsignatures : ", error);
            res.render("petition", {
                error
            });
        });
});

app.get("/thanks", (req, res) => {
    // console.log("req.session.sigid: ", req.session.sigid);
    if (!req.session.sigid) {
        res.redirect("/petition");
    }
    const userId = req.session.userId;
    // console.log("req.session.userId in get thanks: ", req.session.userId);

    db.getSignature(userId)
        .then(results => {
            // console.log(results);
            res.render("thanks", {
                signature: results.rows[0].signature
            });
        })
        .catch(err => {
            console.log("err in getSignatures: ", err);
        });
});

app.get("/signers", (req, res) => {
    if (!req.session.sigid) {
        res.redirect("/petition");
    }
    db.getUserInfo()
        .then(results => {
            let userInfo = [];

            for (let i = 0; i < results.rows.length; i++) {
                userInfo.push({
                    signers: results.rows[i].first + " " + results.rows[i].last,
                    age: results.rows[i].age,
                    city: results.rows[i].city,
                    url: results.rows[i].url
                });
            }

            res.render("signers", {
                userInfo
            });
        })
        .catch(err => {
            console.log("err in getUserInfo: ", err);
        });
});

app.get("/signers/:city", (req, res) => {
    let city = req.params.city;
    console.log("req.params.city: ", req.params.city);

    db.getSignersFromCity(city)
        .then(results => {
            let userInfo = []; ////provjeriti mogu li ovaj kod ne ponoviti ovako plain jane
            for (let i = 0; i < results.rows.length; i++) {
                userInfo.push({
                    signers: results.rows[i].first + " " + results.rows[i].last,
                    age: results.rows[i].age,
                    url: results.rows[i].url
                });
            }
            res.render("signers_city", {
                city,
                userInfo
            });
            console.log("results");
        })
        .catch(error => {
            console.log(error);
        });
});

app.listen(process.env.PORT || port, () =>
    console.log(`petition up and running on ${port}`)
);
