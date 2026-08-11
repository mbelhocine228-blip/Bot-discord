const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
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
    return done(null, profile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(obj, done));

app.get('/login', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/servers');
});
app.get('/logout', (req, res) => { 
    req.logout(() => res.redirect('/')); 
});

// --- الصفحة الرئيسية ---
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>RKS•ＰＯＷＥＲ Dashboard</title>
            <style>
                body { background-color: #0f1015; color: #ffffff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #1e1f26; padding: 50px 40px; border-radius: 20px; text-align: center; border: 1px solid #2f3136; }
                h1 { color: #5865F2; }
                .btn { background-color: #5865F2; color: white; padding: 16px 32px; font-size: 20px; text-decoration: none; border-radius: 12px; display: inline-block; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>RKS•ＰＯＷＥＲ</h1>
                <p>لوحة التحكم الاحترافية لإدارة سيرفرات ديسكورد</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد 🚀</a>
            </div>
        </body>
        </html>
    `);
});

// --- صفحة اختيار السيرفرات ---
app.get('/servers', (req, res) => {
    if (!req.isAuthenticated() || !req.user) return res.redirect('/login');
    
    const guilds = req.user.guilds || [];
    
    let html = `
        <div style="font-family: Arial; padding: 30px; background: #1a1a1a; color: white; min-height: 100vh;" dir="rtl">
            <h2>مرحباً، ${req.user.username}! اختر سيرفر للبدء في إدارته:</h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px;">
    `;
    
    if (guilds.length === 0) {
        html += `<p style="color: #f04747;">لم يتم العثور على سيرفرات متاحة.</p>`;
    }

    guilds.forEach(s => {
        const iconUrl = s.icon ? `https://cdn.discordapp.com/icons/${s.id}/${s.icon}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png';
        html += `
            <a href="/dashboard/${s.id}" style="background: #2f3136; padding: 15px; border-radius: 8px; text-decoration: none; color: white; width: 200px; text-align: center; display: inline-block;">
                <img src="${iconUrl}" width="60" height="60" style="border-radius: 50%;"><br>
                <h4 style="margin: 10px 0 0 0;">${s.name}</h4>
            </a>
        `;
    });
    
    html += `</div></div>`;
    res.send(html);
});

// --- لوحة تحكم السيرفر المحدد ---
app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guildId = req.params.guildId;
    
    res.send(`
        <div style="font-family: Arial; padding: 30px; background: #1a1a1a; color: white; min-height: 100vh;" dir="rtl">
            <h2>لوحة تحكم السيرفر ⚙️</h2>
            <hr style="border-color: #444;">
            <h3>إرسال إعلان عبر البوت:</h3>
            <form action="/send-announcement" method="POST" style="background: #2f3136; padding: 20px; border-radius: 8px; width: 400px;">
                <input type="hidden" name="guildId" value="${guildId}">
                <textarea name="message" rows="4" style="width: 100%; padding: 8px; border-radius: 4px; background: #202225; color: white;" placeholder="اكتب نص الإعلان..."></textarea><br><br>
                <button type="submit" style="background: #3ba55d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">إرسال</button>
            </form>
            <br>
            <a href="/servers" style="color: #00aff4; text-decoration: none;">← العودة لقائمة السيرفرات</a>
        </div>
    `);
});

app.post('/send-announcement', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { guildId, message } = req.body;
    try {
        const guild = client.guilds.cache.get(guildId);
        if (guild) {
            const channel = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (channel) await channel.send(message);
        }
    } catch (e) { console.log(e); }
    res.send(`<script>alert('تم إرسال الإعلان بنجاح!'); window.location.href='/dashboard/${guildId}';</script>`);
});

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('help').setDescription('قائمة الأوامر')
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (e) { console.error(e); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'ping') {
        await interaction.reply({ content: `Pong! 🏓 سرعة الاستجابة: ${client.ws.ping}ms`, ephemeral: true });
    } else if (interaction.commandName === 'help') {
        await interaction.reply({ content: 'جميع الأوامر تعمل بنجاح!', ephemeral: true });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`اللوحة تعمل على المنفذ ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
