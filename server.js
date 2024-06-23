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

app.use(express.json());

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

async function getShop() {
    return new Promise((resolve, reject) => {
        con.query("SELECT * FROM items", function(err, result) {
            if (err) throw err;
            let shopItems = result.map(a => ({"id": a.id, "name": a.longname, "count": a.count, "cost": a.defaultCost, "side": a.side, "category": a.category, "subCategory": a.subCategory}));
            resolve(shopItems);
        });
    });
}

async function getItem(id) {
    return new Promise((resolve, reject) => {
        con.query("SELECT * FROM items WHERE id = ?", [id], function(err, result) {
            if (err) throw err;
            if (result.length > 0) resolve(result[0]);
            else resolve(undefined);
        });
    });
}

async function getUserPass(pass) {
    return new Promise((resolve, reject) => {
        con.query("SELECT * FROM users WHERE pass = ?", [pass], function(err, result) {
            if (err) throw err;
            if (result.length > 0) resolve(result[0]);
            else resolve(undefined);
        });
    });
}

async function getUserDiscord(discordID) {
    return new Promise((resolve, reject) => {
        con.query("SELECT * FROM users WHERE discordID = ?", [discordID], function(err, result) {
            if (err) throw err;
            if (result.length > 0) resolve(result[0]);
            else resolve(undefined);
        });
    });
}

async function buyItem(itemid, userid, count) {
    let user = await getUserPass(userid);
    let item = await getItem(itemid);
    if (item.count >= count && item.defaultCost * count <= user.money) {
        con.query("UPDATE items SET count = ? WHERE id = ?", [item.count - count, itemid], async function(err, result) {
            if (err) throw err;
            let items = user.items;
            let i = items.find(a => a.id == itemid) ?? { "id": item.id, "name": item.name, "count": 0};
            i.count ++;
            let idx = items.indexOf(i);
            if (idx !== -1) items.splice(idx, 1);
            items.push(i);
            con.query("UPDATE users SET items = ?, money = ? WHERE pass = ?", [JSON.stringify(items), user.money - (item.defaultCost * count), userid], async function(err, result) {
                if (err) {
                    con.query("UPDATE items SET count = ? WHERE id = ?", [item.count, itemid], async function(err, result) {
                        if (err) throw err;
                    });
                    throw err;
                };
            });
        });
        return { success: true, name: item.longname, count: count }
    } else {
        return { nostock: item.count < count, toohigh: item.defaultCost * count > user.money }
    }
}

app.get('/shop', async (req, res) => {
    let shop = await getShop();
    if (req.cookies.user) {
        let user = await getUserPass(req.cookies.user);
        if (user) res.render('shop', { items: shop, scripts: ["/store.js"], user: req.cookies.user, bal: user.money.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") });
        else res.render('shop', { items: shop });
    } else res.render('shop', { items: shop });
});

app.post('/buy', async (req, res) => {
    console.log("buy");
    let { item, count } = req.body;
    if (item && count && req.cookies.user) {
        res.json(await buyItem(item, req.cookies.user, count));
        console.log(`${req.cookies.user} bought ${item} x${count}`);
        return;
    }
    res.json({ notfound: true });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    let { pass } = req.body;
    if (pass) {
        let user = await getUserPass(pass);
        if (user) {
            res.cookie('user', pass, { expires: new Date(Date.now() + ((7 * 4) * 24) * 3600000) });
            res.redirect("/");
        } else res.render('login', { passerror: "Unknown password" });
    } else res.redirect("/login");
});

app.get('/logout', (req, res) => {
    res.clearCookie('user');
    res.redirect('/');
});

app.get('/items', async (req, res) => {
    if (req.cookies.user) {
        let user = await getUserPass(req.cookies.user);
        if (user) {
            let items = [];
            for (let i = 0; i < user.items.length; i++) {
                let item = await getItem(user.items[i].id)
                items.push({id: item.id, name: item.longname, count: user.items[i].count});
            }
            res.render('items', { items: items, user: req.cookies.user, bal: user.money.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") });
        } else res.redirect("/login");
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