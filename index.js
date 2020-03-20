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
    // console.log(first, last, email, password);

    hash(password)
        .then(hashedPw => {
            console.log("hashedPW", hashedPw);
            // We will store the hashed PW and all other user info supplied in our DB
            db.insertUsers(first, last, email, hashedPw)
                .then(result => {
                    req.session.userId = result.rows[0].id;
                    // console.log("result.rows[0].id: ", result.rows[0].id);
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
    db.getPass(req.body.email)
        .then(result => {
            const hashedPw = result.rows[0].password;
            compare(req.body.password, hashedPw)
                .then(matchValue => {
                    if (matchValue == true) {
                        req.session.userId = result.rows[0].id;

                        db.getSignature(req.session.userId).then(signature => {
                            if (signature.rows[0]) {
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

app.get("/petition", requireUserNotSigned, (req, res) => {
    console.log("made it to the GET petition route");
    // console.log("req.session u get petition: ", req.session);
    res.render("petition");
});

app.post("/petition", requireUserNotSigned, (req, res) => {
    console.log("made it to the POST petition route");
    const userId = req.session.userId;
    // console.log("req.session.userId u post petition: ", req.session.userId);
    // console.log("req.body u post petition: ", req.session.body);

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

app.get("/thanks", requireUserSigned, (req, res) => {
    /////////////////////// SLABA TOCKA NE ZNAM STO SE DOGADA!!!!//////////////
    // console.log("req.session.sigid: ", req.session.sigid);

    const userId = req.session.userId;
    // console.log("req.session.sigid in get thanks: ", req.session.userId);

    db.getSignature(userId)
        .then(results => {
            // console.log("results: ", results);
            res.render("thanks", {
                signature: results.rows[0].signature
            });
        })
        .catch(err => {
            console.log("err in getSignatures: ", err);
        });
});

app.post("/thanks", (req, res) => {
    let userId = req.session.userId;
    db.deleteSignature(userId)
        .then(result => {
            console.log("result post thanks", result);
            console.log("req.session: ", req.session);

            req.session.sigid = null;
            res.redirect("/petition");
        })
        .catch(error => {
            console.log("error in post thanks: ", error); ///hendlaj
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
    // console.log("req.params.city: ", req.params.city);

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
            // console.log("results");
        })
        .catch(error => {
            console.log(error);
        });
});

app.get("/profile", (req, res) => {
    if (req.session.profile == true) {
        res.redirect("/profile/edit");
    } else {
        res.render("profile");
    }

    console.log(req.session.profile);
});

app.post("/profile", (req, res) => {
    console.log("made it to the post profile");

    const age = req.body.age;
    const city = req.body.city;
    let url = req.body.url;
    const user_id = req.session.userId;
    // console.log(age, city, url, user_id);

    if (!url.startsWith("http" || "https")) {
        url = "http://" + url;
    }

    db.insertProfile(age, city, url, user_id) /////////// trebam li ovdje dodati jos nesto?
        .then(results => {
            // console.log(results);
            req.session.profile = true;
            res.redirect("/petition");
        })
        .catch(error => {
            console.log(error);
        });
});

app.get("/profile/edit", (req, res) => {
    console.log("in GET edit profile route");
    console.log("req.body: ", req.body);
    console.log("req.session: ", req.session);
    const userId = req.session.userId;
    db.getUserInfoForEdit(userId)
        .then(results => {
            const first = results.rows[0].first;
            const last = results.rows[0].last;
            const email = results.rows[0].email;
            const password = results.rows[0].password; /////sakriti!!!!!!!!
            const age = results.rows[0].age;
            const city = results.rows[0].city;
            const website = results.rows[0].url;
            console.log(results.rows);
            res.render("edit_profile", {
                first,
                last,
                email,
                password,
                age,
                city,
                website
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
    let city = req.body.city;
    let url = req.body.url;

    if (newPassword == "") {
        db.oldPWProfileUpdate(first, last, email, userId)
            .then(results => {
                console.log(results); ///handle
                db.updateUserProfiles(age, city, url, userId)
                    .then(result => {
                        console.log(result); ///handle
                        res.render("edit_profile");
                    })
                    .catch(error => {
                        console.log("error in oldPW updateuserprof: ", error); ///handle
                        res.render("edit_profile", { error });
                    });
            })
            .catch(error => {
                console.log("error in oldPWProfileUpdate: ", error); ///handle
                res.render("edit_profile", { error });
            });
    } else {
        console.log("something else");
        hash(newPassword)
            .then(hashedPw => {
                console.log("hashedPW", hashedPw);
                // We will store the hashed PW and all other user info supplied in our DB
                db.newPWProfileUpdate(first, last, email, hashedPw, userId)
                    .then(results => {
                        console.log(results); ////handle
                        db.updateUserProfiles(age, city, url, userId)
                            .then(result => {
                                console.log(result); ///handle
                                res.redirect("/profile/edit");
                            })
                            .catch(error => {
                                console.log(
                                    "error in newPW user ProfileUpdate: ",
                                    error
                                ); ///handle
                                res.redirect("/profile/edit", { error });
                            });
                    })
                    .catch(error => {
                        console.log("newpw profile update: ", error);
                        res.render("edit_profile", { error });
                    }); ///handle
            })
            .catch(err => {
                console.log("error in Post register in hash", err);
                res.render("register", { err });
            });
    }
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/register");
});

app.listen(process.env.PORT || port, () =>
    console.log(`petition up and running on ${port}`)
);
