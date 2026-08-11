const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
app.set('trust proxy', 1);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

app.use(express.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'rks-power-secret-key-99', 
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true, sameSite: 'lax' }
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
    clientID: '1171579175635800175',         
    clientSecret: 'I1JZsvXEZ_L4iQjAlIMurRy-c_ikOecN', 
    callbackURL: 'https://bot-discord-g9r5.onrender.com/callback',
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, { id: profile.id, username: profile.username });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(obj, obj));

app.get('/login', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/dashboard');
});
app.get('/logout', (req, res) => { 
    req.logout(() => res.redirect('/')); 
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>RKS•ＰＯＷＥＲ</title>
            <style>
                body { background-color: #0f1015; color: #ffffff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #1e1f26; padding: 50px; border-radius: 20px; text-align: center; border: 1px solid #2f3136; }
                h1 { color: #5865F2; }
                .btn { background-color: #5865F2; color: white; padding: 15px 30px; font-size: 18px; text-decoration: none; border-radius: 10px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>RKS•ＰＯＷＥＲ</h1>
                <p>لوحة التحكم الاحترافية لإدارة البوت</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد 🚀</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.redirect('/login');
    
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        guildsHtml += `
            <div style="background: #2f3136; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 18px; font-weight: bold;">🛡️ ${guild.name}</span>
                <a href="/control/${guild.id}" style="background: #5865F2; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none;">إدارة</a>
            </div>
        `;
    });

    res.send(`
        <div style="font-family: Arial; padding: 40px; background: #1a1a1a; color: white; min-height: 100vh;" dir="rtl">
            <h2>مرحباً بك، ${req.user.username} 👋</h2>
            <div style="max-width: 600px; margin-top: 20px;">
                ${guildsHtml || '<p>لا توجد سيرفرات متاحة.</p>'}
            </div>
            <br><a href="/logout" style="color: #f04747; text-decoration: none;">تسجيل الخروج 🚪</a>
        </div>
    `);
});

app.get('/control/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');

    res.send(`
        <div style="font-family: Arial; padding: 40px; background: #1a1a1a; color: white; min-height: 100vh;" dir="rtl">
            <h2>إدارة سيرفر: ${guild.name} ⚙️</h2>
            <form action="/send" method="POST" style="background: #2f3136; padding: 20px; border-radius: 8px; max-width: 500px; margin-top: 20px;">
                <input type="hidden" name="guildId" value="${guild.id}">
                <textarea name="msg" rows="4" style="width: 100%; padding: 10px; background: #202225; color: white; border: 1px solid #444;" placeholder="اكتب الإعلان..."></textarea><br><br>
                <button type="submit" style="background: #3ba55d; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;">إرسال</button>
            </form><br>
            <a href="/dashboard" style="color: #00aff4; text-decoration: none;">← العودة</a>
        </div>
    `);
});

app.post('/send', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    try {
        const guild = client.guilds.cache.get(req.body.guildId);
        if (guild) {
            const ch = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (ch) await ch.send(req.body.msg);
        }
    } catch (e) {}
    res.redirect(`/control/${req.body.guildId}`);
});

// حماية كاملة ضد انهيار السيرفر
app.use((err, req, res, next) => {
    console.error(err);
    res.redirect('/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Working on port ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
