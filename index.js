const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// إعدادات الجلسة والموقع
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: 'rks-koya-final-secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// إعدادات Discord OAuth2
passport.use(new DiscordStrategy({
    clientID: '1171579175635800175',
    clientSecret: 'I1JZsvXEZ_L4iQjAlIMurRy-c_ikOecN',
    callbackURL: 'https://bot-discord-g9r5.onrender.com/callback',
    scope: ['identify', 'guilds']
}, (a, r, p, d) => d(null, p)));

passport.serializeUser((u, d) => d(null, u));
passport.deserializeUser((u, d) => d(null, u));

// قاعدة بيانات وهمية للسيرفرات (استبدلها بقاعدة بيانات حقيقية لاحقاً)
const db = {};

// --- المسارات (Routes) ---

app.get('/', (req, res) => res.send(`<h1>مرحباً بك في لوحة تحكم RKS</h1><a href="/login">تسجيل الدخول</a>`));
app.get('/login', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { successRedirect: '/dashboard' }));

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guilds = client.guilds.cache.map(g => `<a href="/manage/${g.id}">${g.name}</a>`).join('<br>');
    res.send(`<h1>اختر سيرفرك</h1>${guilds}`);
});

app.get('/manage/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const gid = req.params.guildId;
    res.send(`
        <h1>إدارة السيرفر</h1>
        <form action="/save" method="POST">
            <input type="hidden" name="gid" value="${gid}">
            <input type="text" name="welcomeMsg" placeholder="رسالة الترحيب...">
            <button type="submit">حفظ الإعدادات</button>
        </form>
    `);
});

app.post('/save', (req, res) => {
    db[req.body.gid] = { welcomeMsg: req.body.welcomeMsg };
    res.send("تم الحفظ بنجاح!");
});

// --- أوامر البوت وتفاعله ---

client.on('guildMemberAdd', member => {
    const guildData = db[member.guild.id];
    if (guildData && guildData.welcomeMsg) {
        member.guild.systemChannel?.send(guildData.welcomeMsg.replace('{user}', member.user.username));
    }
});

client.on('ready', () => console.log(`البوت ${client.user.tag} جاهز!`));
client.login(process.env.DISCORD_TOKEN);

app.listen(3000, () => console.log('الداشبورد شغالة على بورت 3000'));
