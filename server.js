'use strict';

const { dbuser, dbpass } = require('../config.json');
const exphbs = require("express-handlebars")
const cookieParser = require('cookie-parser');
const fs = require('fs');
const mysql = require('mysql2');

const con = mysql.createConnection({
    host: "localhost",
    user: dbuser,
    password: dbpass,
    database: "dcs88"
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

const express = require('express');
const app = express();
const PORT = 28;

app.use(express.urlencoded({
    extended: true
}));

app.use(cookieParser());
app.use(express.static('public'));
app.engine("handlebars", exphbs.engine({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.get('/', (req, res) => {
    con.query("SELECT * FROM users WHERE pass = ?", [req.cookies.user], async function(err, result) {
        if (result.length > 0) {
            res.render('home', { home: true, user: req.cookies.user });
        } else res.render('home', { home: true });
    });
});

app.get('/shop', (req, res) => {
    if (req.cookies.user) {
        con.query("SELECT * FROM users WHERE pass = ?", [req.cookies.user], async function(err, result) {
            if (result.length > 0) {
                res.render('shop', { items: require("../shop.json"), user: req.cookies.user });
            } else res.render('shop', { items: require("../shop.json") });
        });
    } else res.render('shop', { items: require("../shop.json") });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    let { pass } = req.body;
    if (pass) {
    con.query("SELECT * FROM users WHERE pass = ?", [pass], async function(err, result) {
            if (result.length > 0) {
                res.cookie('user', pass, { expires: new Date(Date.now() + ((7 * 4) * 24) * 3600000) });
                res.redirect("/");
            } else res.render('login', { passerror: "Unknown password" });
        });
    } else {
        res.redirect("/login");
        return;
    }
});

app.get('/logout', (req, res) => {
    res.clearCookie('user');
    res.redirect('/');
});

app.get('/items', (req, res) => {
    if (req.cookies.user) {
        con.query("SELECT * FROM users WHERE pass = ?", [req.cookies.user], async function(err, result) {
            if (result.length > 0) {
                res.render('items', { items: result[0].items });
            } else res.redirect("/login");
        });
    } else res.redirect("/login");
});

app.get('/info', (req, res) => {
    res.render('info');
});

app.get("*", function (req, res) {
    res.redirect("/");
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});