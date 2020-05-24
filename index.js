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
    requireUserNotSigned,
} = require("./middleware");

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(
    require("cookie-session")({
        secret: "very secret",
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);

app.use(cookieParser());

app.use(
    express.urlencoded({
        extended: false,
    })
);

app.use(csurf());

app.use(safeCookies);

app.use(express.static("public"));

app.use(requireUserLoggedIn);

app.get("/register", requireUserLoggedOut, (req, res) => {
    res.render("register");
});

app.post("/register", requireUserLoggedOut, (req, res) => {
    const first = req.body.first;
    const last = req.body.last;
    const email = req.body.email;
    const password = req.body.password;

    hash(password)
        .then((hashedPw) => {
            db.insertUsers(first, last, email, hashedPw)
                .then((result) => {
                    req.session.userId = result.rows[0].id;
                    res.redirect("/profile");
                })
                .catch((err) => {
                    res.render("register", {
                        err,
                    });
                });
        })
        .catch((err) => {
            res.render("register", { err });
        });
});

app.get("/login", requireUserLoggedOut, (req, res) => {
    res.render("login");
});

app.post("/login", requireUserLoggedOut, (req, res) => {
    db.getPass(req.body.email)
        .then((result) => {
            const hashedPw = result.rows[0].password;
            const password = req.body.password;
            const id = result.rows[0].id;
            compare(password, hashedPw)
                .then((matchValue) => {
                    if (matchValue == true) {
                        req.session.userId = id;
                        db.getSignature(req.session.userId)
                            .then((signature) => {
                                if (signature.rows[0]) {
                                    req.session.sigid = result.rows[0].id;
                                    res.redirect("/thanks");
                                } else {
                                    res.redirect("/");
                                }
                            })
                            .catch((error) => {
                                res.render("login", { error });
                            });
                    } else {
                        res.render("login", { error: true });
                    }
                })
                .catch((error) => {
                    res.render("login", {
                        error,
                    });
                });
        })
        .catch((error) => {
            res.render("login", { error });
        });
});

app.get("/", requireUserNotSigned, (req, res) => {
    res.render("petition");
});

app.post("/", (req, res) => {
    const userId = req.session.userId;
    const signature = req.body.signature;
    db.addSignatures(signature, userId)
        .then((result) => {
            req.session.sigid = result.rows[0].id;
            res.redirect("/thanks");
        })
        .catch((error) => {
            res.render("petition", {
                error,
            });
        });
});

app.get("/thanks", requireUserSigned, (req, res) => {
    const userId = req.session.userId;

    db.getSignature(userId)
        .then((results) => {
            res.render("thanks", {
                first: results.rows[0].first,
                signature: results.rows[0].signature,
            });
        })
        .catch((err) => {
            console.log(err);
        });
});

app.post("/thanks", (req, res) => {
    let userId = req.session.userId;
    db.deleteSignature(userId)
        .then(() => {
            req.session.sigid = null;
            res.redirect("/");
        })
        .catch((error) => {
            console.log(error);
        });
});

app.get("/signers", requireUserSigned, (req, res) => {
    if (!req.session.sigid) {
        res.redirect("/");
    }
    db.getUserInfo()
        .then((results) => {
            let userInfo = [];

            for (let i = 0; i < results.rows.length; i++) {
                userInfo.push({
                    signers: results.rows[i].first + " " + results.rows[i].last,
                    age: results.rows[i].age,
                    city: results.rows[i].city,
                    url: results.rows[i].url,
                });
            }

            res.render("signers", {
                number: results.rows.length,
                userInfo,
            });
        })
        .catch((err) => {
            console.log("err in getUserInfo: ", err);
        });
});

app.get("/signers/:city", requireUserSigned, (req, res) => {
    let city = req.params.city;

    db.getSignersFromCity(city)
        .then((results) => {
            let userInfo = [];
            for (let i = 0; i < results.rows.length; i++) {
                userInfo.push({
                    signers: results.rows[i].first + " " + results.rows[i].last,
                    age: results.rows[i].age,
                    url: results.rows[i].url,
                });
            }
            res.render("signers_city", {
                city,
                userInfo,
            });
        })
        .catch((error) => {
            console.log("error in signers by city", error);
        });
});

app.get("/profile", (req, res) => {
    res.render("profile");
});

app.post("/profile", (req, res) => {
    const age = req.body.age;
    const city = req.body.city.toUpperCase();
    let url = req.body.url;
    const userId = req.session.userId;

    if (!url.startsWith("http" || "https") && url != "") {
        url = "http://" + url;
    }

    db.insertProfile(age, city, url, userId)
        .then(() => {
            res.redirect("/");
        })
        .catch((error) => {
            res.render("profile", { error });
        });
});

app.get("/profile/edit", (req, res) => {
    const userId = req.session.userId;

    db.getUserInfoForEdit(userId)
        .then((results) => {
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
                url,
            });
        })
        .catch((error) => {
            res.render("edit_profile", { error });
        });
});

app.post("/profile/edit", (req, res) => {
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
            .then(() => {
                if (!url.startsWith("http" || "https") && url != "") {
                    url = "http://" + url;
                }
                db.updateUserProfiles(age, city, url, userId)
                    .then(() => {
                        res.redirect("/profile/edit");
                    })
                    .catch((error) => {
                        res.render("edit_profile", { error });
                    });
            })
            .catch((error) => {
                res.render("edit_profile", { error });
            });
    } else {
        hash(newPassword)
            .then((hashedPw) => {
                db.newPWProfileUpdate(first, last, email, hashedPw, userId)
                    .then(() => {
                        if (!url.startsWith("http" || "https") && url != "") {
                            url = "http://" + url;
                        }
                        db.updateUserProfiles(age, city, url, userId)
                            .then(() => {
                                res.redirect("/profile/edit");
                            })
                            .catch((error) => {
                                res.render("edit_profile", { error });
                            });
                    })
                    .catch((error) => {
                        res.render("edit_profile", { error });
                    });
            })
            .catch(() => {
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
