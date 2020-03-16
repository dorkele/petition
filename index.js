const express = require("express");
const app = express();
const port = 8080;
const db = require("./db.js"); //maybe i will need destructuring
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const csurf = require("csurf");

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
app.use((req, res, next) => {
    res.set("x-frame-options", "DENY");
    res.locals.csrfToken = req.csrfToken;
    next();
});
app.use(express.static("public"));

app.get("/petition", (req, res) => {
    //     GET /petition
    // redirects to /thanks if there is a cookie
    // always renders petition.handlebars with no error
    console.log("made it to the GET petition route");
    if (req.session.sigid) {
        res.redirect("/thanks");
    } else {
        res.render("petition");
    }
});

app.post("/petition", (req, res) => {
    console.log("made it to the POST petition route");
    // redirects to /thanks if there is a cookie
    // do insert of submitted data into database
    // if there is an error, petition.handlebars is rendered with an error message
    // if there is no error sets cookie to remember
    // redirects to thank you page
    const first = req.body.first;
    const last = req.body.last;
    const signature = req.body.signature;
    db.addSignatures(first, last, signature)
        .then(result => {
            req.session.sigid = result.rows[0].id; ///adding it to the object req.session
            console.log("req.session.sigid: ", req.session.sigid);

            res.redirect("/thanks");
        })
        .catch(error => {
            console.log(error);
            res.render("petition", {
                error
            });
        });
});

app.get("/thanks", (req, res) => {
    //     GET /thanks
    // redirects to /petition if there is no cookie
    // render thanks.handlebars
    // console.log("req.session.sigid: ", req.session.sigid);

    db.getSignature(req.session.sigid)
        .then(results => {
            // console.log("results.rows[0].id: ", results.rows[0].signature);
            res.render("thanks", {
                signature: results.rows[0].signature
            });
        })
        .catch(err => {
            console.log("err in getSignatures: ", err);
        });

    ///reading the cookie, using the id
});

app.get("/signers", (req, res) => {
    //     GET /signers
    // redirects to /petition if there is no cookie
    // get the first and last of every signer from the database and pass them to signers.handlebars
    if (!req.session.sigid) {
        res.redirect("/petition");
    }
    db.getSignatures()
        .then(results => {
            // console.log(results.rows);
            let signers = [];
            for (let i = 0; i < results.rows.length; i++) {
                signers.push(
                    results.rows[i].first + " " + results.rows[i].last
                );
            }
            res.render("signers", {
                signers: signers
            });
        })
        .catch(err => {
            console.log("err in getSignatures: ", err);
        });
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.listen(port, () => console.log(`petition up and running on ${port}`));
