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
// app.use((req, res, next) => {
//     res.set("x-frame-options", "DENY");
//     res.locals.csrfToken = req.csrfToken;
//     next();
// });

app.use(
    express.urlencoded({
        extended: false
    })
);

// app.use(csurf()); //// has to come after urlencoded, body parsing and cookie session must come before this - token is in the req.body

// app.use((req, res, next) => {
//     console.log("req.cookies: ", req.cookies);

//     //     if(req.cookies.checked) { //// SKUZITI KAKO OVO NAPISATI!!!!!!!!!!!!!!!!!!!!
//     //         res.redirect("/thanks") ////////// + da li cookiese napisati u middleware?? jer ce signers onda uvijek redirectati
//     //     } else {
//     //         res.redirect
//     //     }
//     next();
// });

app.use(express.static("public"));

app.get("/petition", (req, res) => {
    console.log("made it to the GET petition route");

    if (!req.cookies.cookie) {
        res.render("petition");
    } else {
        res.redirect("./thanks"); //res.locals - sta god stavis tako bit ce tamo kad god zoves res.render
    }
    // }
    //     GET /petition
    // redirects to /thanks if there is a cookie - na kraju i res.redirect
    // always renders petition.handlebars with no error
});

app.post("/petition", (req, res) => {
    console.log("made it to the POST petition route");

    const first = req.body.first;
    const last = req.body.last;
    const signature = req.body.signature;
    db.addSignatures(first, last, signature)
        .then(result => {
            res.cookie("cookie", true);
            res.redirect("/thanks");
            // const {rows} = db addSignatures(req.body);
        })
        .catch(error => {
            console.log(error);
            res.render("petition", { error });
        });
    req.session.sigid = result.rows[0].id; ///adding it to the object req.session
    console.log("req.session.sigid: ", req.session.sigid);

    // redirects to /thanks if there is a cookie
    // do insert of submitted data into database
    // if there is an error, petition.handlebars is rendered with an error message
    // if there is no error sets cookie to remember
    // redirects to thank you page
});

app.get("/thanks", (req, res) => {
    // console.log("in thenks: ", !req.cookies.cookie);

    //     GET /thanks
    // redirects to /petition if there is no cookie
    // render thanks.handlebars
    if (!req.cookies.cookie) {
        res.redirect("./petition");
    }
    const sigId = req.session.sigid;
    console.log("req.session.sigid: ", sigId);

    res.render("thanks", { sign: sigId });
    ///reading the cookie, using the id
});

app.get("/signers", (req, res) => {
    //     GET /signers
    // redirects to /petition if there is no cookie
    // get the first and last of every signer from the database and pass them to signers.handlebars
    // if (!req.cookies.checked) {
    //     res.redirect("/petition");
    // }
    db.getSignatures()
        .then(results => {
            console.log(results.rows);
            let signatures = [];
            for (let i = 0; i < results.rows.length; i++) {
                signatures.push(
                    results.rows[i].first + " " + results.rows[i].last
                );
            }
            res.render("signers", {
                first: signatures
            });
        })
        .catch(err => {
            console.log("err in getSignatures: ", err);
        });
});

app.listen(port, () => console.log(`petition up and running on ${port}`));
