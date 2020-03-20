module.exports.safeCookies = (req, res, next) => {
    res.set("x-frame-options", "DENY");
    res.locals.csrfToken = req.csrfToken;
    next();
};

module.exports.requireUserLoggedOut = (req, res, next) => {
    if (req.session.userId) {
        res.redirect("/petition");
    } else {
        next();
    }
};

module.exports.requireUserSigned = (req, res, next) => {
    if (!req.session.sigid) {
        res.redirect("/petition");
    } else {
        next();
    }
};

module.exports.requireUserNotSigned = (req, res, next) => {
    if (req.session.sigid) {
        res.redirect("/thanks");
    } else {
        next();
    }
};

module.exports.requireUserLoggedIn = (req, res, next) => {
    if (!req.session.userId && req.url != "/register" && req.url != "/login") {
        res.redirect("/register");
    } else {
        next();
    }
};
