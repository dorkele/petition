const express = require("express");
const app = express();
const port = 8080;
const db = require("./utils/db");
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const csurf = require("csurf");
const { hash, compare } = require("./utils/bc");
const {
    safeCookies,
    requireUserLoggedOut,
    requireUserLoggedIn,
    requireUserSigned,
    requireUserNotSigned
} = require("./middleware");

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

app.use(csurf()); //// has to come after urlencoded, body parsing and cookie session must come before this - token is in the req.body

app.use(safeCookies);

app.use(express.static("public"));

app.use(requireUserLoggedIn);

app.get("/register", requireUserLoggedOut, (req, res) => {
    console.log("GET REGISTER");
    res.render("register");
});

app.post("/register", requireUserLoggedOut, (req, res) => {
    console.log("post/register happening");

    const first = req.body.first;
    const last = req.body.last;
    const email = req.body.email;
    const password = req.body.password;

    hash(password)
        .then(hashedPw => {
            console.log("hashedPW", hashedPw);
            // We will store the hashed PW and all other user info supplied in our DB
            db.insertUsers(first, last, email, hashedPw)
                .then(result => {
                    req.session.userId = result.rows[0].id;

                    res.redirect("/profile");
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

app.get("/login", requireUserLoggedOut, (req, res) => {
    res.render("login");
});

app.post("/login", requireUserLoggedOut, (req, res) => {
    console.log("/POST LOGIN");
    console.log("req.body: ", req.body);

    db.getPass(req.body.email)
        .then(result => {
            const hashedPw = result.rows[0].password;
            const password = req.body.password;
            const id = result.rows[0].id;

            compare(password, hashedPw)
                .then(matchValue => {
                    if (matchValue == true) {
                        console.log("result.rows[0].id: ", result.rows[0].id);

                        req.session.userId = id;
                        db.getSignature(req.session.userId)
                            .then(signature => {
                                if (signature.rows[0]) {
                                    req.session.sigid = result.rows[0].id;
                                    res.redirect("/thanks");
                                } else {
                                    res.redirect("/petition");
                                }
                            })
                            .catch(error => {
                                res.render("login", { error });
                            });
                    } else {
                        res.render("login", { error: true });
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

app.get("/petition", requireUserNotSigned, (req, res) => {
    console.log("made it to the GET petition route");
    // console.log("req.session u get petition: ", req.session);
    res.render("petition");
});

app.post("/petition", (req, res) => {
    console.log("made it to the POST petition route");
    const userId = req.session.userId;

    const signature = req.body.signature;

    db.addSignatures(signature, userId)
        .then(result => {
            req.session.sigid = result.rows[0].id;
            res.redirect("/thanks");
        })
        .catch(error => {
            console.log("error in addsignatures : ", error);
            res.render("petition", {
                error
            });
        });
});

app.get("/thanks", requireUserSigned, (req, res) => {
    const userId = req.session.userId;

    db.getSignature(userId)
        .then(results => {
            res.render("thanks", {
                signature: results.rows[0].signature
            });
        })
        .catch(err => {
            console.log(err);
        });
});

app.post("/thanks", (req, res) => {
    let userId = req.session.userId;
    db.deleteSignature(userId)
        .then(result => {
            req.session.sigid = null;
            res.redirect("/petition");
        })
        .catch(error => {
            console.log(error);
        });
});

app.get("/signers", requireUserSigned, (req, res) => {
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

app.get("/signers/:city", requireUserSigned, (req, res) => {
    let city = req.params.city;

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
        })
        .catch(error => {
            console.log("error in signers by city", error);
        });
});

app.get("/profile", (req, res) => {
    if (req.session.profile == true) {
        res.redirect("/profile/edit");
    } else {
        res.render("profile");
    }
});

app.post("/profile", (req, res) => {
    console.log("made it to the post profile");

    const age = req.body.age;
    const city = req.body.city.toUpperCase();
    let url = req.body.url;
    const userId = req.session.userId;

    if (!url.startsWith("http" || "https") && url != "") {
        url = "http://" + url;
    }

    db.insertProfile(age, city, url, userId) /////////// trebam li ovdje dodati jos nesto?
        .then(results => {
            req.session.profile = true;
            res.redirect("/petition");
        })
        .catch(error => {
            console.log("error in post profile insert profile: ", error);
            res.render("/profile", { error });
        });
});

app.get("/profile/edit", (req, res) => {
    const userId = req.session.userId;

    db.getUserInfoForEdit(userId)
        .then(results => {
            const first = results.rows[0].first;
            const last = results.rows[0].last;
            const email = results.rows[0].email;
            const password = results.rows[0].password;
            const age = results.rows[0].age;
            const city = results.rows[0].city;
            let url = results.rows[0].url;
            if (!url.startsWith("http" || "https") && url != "") {
                url = "http://" + url;
            }

            res.render("edit_profile", {
                first,
                last,
                email,
                password,
                age,
                city,
                url
            });
        })
        .catch(error => {
            console.log(error);
            res.render("edit_profile", { error });
        });
});

app.post("/profile/edit", (req, res) => {
    console.log("I AM IN POST PROFILE EDIT ROUTE");

    let newPassword = req.body.password;
    let first = req.body.first;
    let last = req.body.last;
    let email = req.body.email;
    let userId = req.session.userId;
    let age = req.body.age;
    let city = req.body.city.toUpperCase();
    let url = req.body.url;

    if (newPassword == "") {
        db.oldPWProfileUpdate(first, last, email, userId)
            .then(results => {
                if (!url.startsWith("http" || "https") && url != "") {
                    url = "http://" + url;
                }
                db.updateUserProfiles(age, city, url, userId)
                    .then(result => {
                        res.redirect("/profile/edit");
                    })
                    .catch(error => {
                        console.log("error in oldPW updateuserprof: ", error);
                        res.render("edit_profile", { error });
                    });
            })
            .catch(error => {
                console.log("error in oldPWProfileUpdate: ", error);
                res.render("edit_profile", { error });
            });
    } else {
        console.log("something else");
        hash(newPassword)
            .then(hashedPw => {
                console.log("hashedPW", hashedPw);
                db.newPWProfileUpdate(first, last, email, hashedPw, userId)
                    .then(results => {
                        if (!url.startsWith("http" || "https") && url != "") {
                            url = "http://" + url;
                        }
                        console.log(url);

                        db.updateUserProfiles(age, city, url, userId)
                            .then(result => {
                                res.redirect("/profile/edit");
                            })
                            .catch(error => {
                                console.log(
                                    "error in newPW user ProfileUpdate: ",
                                    error
                                );
                                res.render("edit_profile", { error });
                            });
                    })
                    .catch(error => {
                        console.log("newpw profile update: ", error);
                        res.render("edit_profile", { error });
                    });
            })
            .catch(err => {
                console.log("error in Post register in hash", err);
                res.render("edit_profile", { error: true });
            });
    }
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/login");
});

app.listen(process.env.PORT || port, () =>
    console.log(`petition up and running on ${port}`)
);
