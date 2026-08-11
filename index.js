const { Client, GatewayIntentBits } = require('discord.js');
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
    secret: 'rks-koya-master-secret-999', 
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
passport.deserializeUser((user, done) => done(null, user));

app.get('/login', passport.authenticate('discord'));

app.get('/callback', passport.authenticate('discord', { 
    failureRedirect: '/' 
}), (req, res) => {
    res.redirect('/dashboard');
});

app.get('/logout', (req, res) => { 
    req.logout(() => {
        res.redirect('/');
    }); 
});

const guildSettings = {};

// رابط الدعوة الخاص بك
const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1171579175635800175&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fbot-discord-g9r5.onrender.com%2Fcallback&integration_type=0&scope=bot+applications.commands';

// =================== واجهة الموقع (الداشبورد) ===================

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>RKS•ＰＯＷＥＲ Koya Master</title>
            <style>
                body { background-color: #2f3136; color: #ffffff; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                .card { background: #36393f; padding: 40px; border-radius: 12px; text-align: center; border: 1px solid #202225; box-shadow: 0 8px 24px rgba(0,0,0,0.4); width: 380px; }
                .btn { background-color: #5865F2; color: white; padding: 12px 24px; font-size: 16px; text-decoration: none; border-radius: 6px; display: block; margin-bottom: 12px; box-sizing: border-box; font-weight: bold; }
                .btn-invite { background-color: #43b581; }
                .btn-invite:hover { background-color: #3ca374; }
            </style>
        </head>
        <body>
            <div class="card">
                <h1>RKS•ＰＯＷＥＲ</h1>
                <p>لوحة التحكم والأوامر الحصرية</p>
                <a href="/login" class="btn">تسجيل الدخول عبر ديسكورد</a>
                <a href="${INVITE_URL}" target="_blank" class="btn btn-invite">إضافة البوت لسيرفرك ➕</a>
            </div>
        </body>
        </html>
    `);
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL() ? guild.iconURL() : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `
            <a href="/control/${guild.id}/autopseudo" style="text-decoration: none; color: white; display: flex; flex-direction: column; align-items: center; background: #2f3136; padding: 15px; border-radius: 12px; border: 1px solid #202225; width: 130px;">
                <img src="${iconUrl}" style="width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;">
                <span style="font-size: 14px; font-weight: bold; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">${guild.name}</span>
            </a>
        `;
    });
    res.send(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>اختر السيرفر</title>
        <style>body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; padding: 40px; }
        .grid { display: flex; flex-wrap: wrap; gap: 20px; margin-top: 25px; }</style></head>
        <body>
            <h2>مرحباً بك، ${req.user.username} 👋</h2>
            <div style="margin-bottom: 20px;">
                <a href="${INVITE_URL}" target="_blank" style="background:#43b581; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight:bold; display:inline-block;">إضافة البوت لسيرفر جديد ➕</a>
            </div>
            <div class="grid">${guildsHtml}</div>
            <br><a href="/logout" style="color:#ed4245;">تسجيل الخروج 🚪</a>
        </body></html>
    `);
});

app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');
    
    const section = req.params.section || 'autopseudo';
    if (!guildSettings[guild.id]) guildSettings[guild.id] = {};
    const savedFormat = guildSettings[guild.id].nicknameFormat || '[RKS] {user.name}';

    res.send(`
        <!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>إدارة ${guild.name}</title>
        <style>
            body { background-color: #2f3136; color: white; font-family: Arial, sans-serif; margin: 0; display: flex; height: 100vh; }
            .sidebar { width: 300px; background: #202225; padding: 15px; }
            .sidebar a { display: block; color: #b9bbbe; text-decoration: none; padding: 10px; margin-bottom: 5px; background: #2f3136; border-radius: 5px; font-weight:bold; }
            .sidebar a.active { background: #5865F2; color: white; }
            .content { flex: 1; padding: 40px; }
            input { width: 100%; padding: 10px; margin-bottom: 15px; background: #202225; color: white; border: 1px solid #202225; border-radius: 5px; }
            button { background: #5865F2; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; }
        </style></head>
        <body>
            <div class="sidebar">
                <h3 style="color:#8e9297; font-size:12px;">الأقسام المتاحة</h3>
                <a href="/control/${guild.id}/autopseudo" class="${section==='autopseudo'?'active':''}">👤 Auto Pseudo</a>
                <a href="/control/${guild.id}/custom" class="${section==='custom'?'active':''}">⚡ مميزات حصرية (جديد)</a>
                <br><a href="/dashboard" style="background:transparent; color:#5865F2;">← اختيار سيرفر آخر</a>
            </div>
            <div class="content">
                <h2>إدارة سيرفر: ${guild.name}</h2>
                ${section === 'autopseudo' ? `
                    <form action="/action/save" method="POST">
                        <input type="hidden" name="guildId" value="${guild.id}">
                        <input type="hidden" name="section" value="autopseudo">
                        <label>تنسيق الأسماء التلقائي:</label>
                        <input type="text" name="nicknameFormat" value="${savedFormat}">
                        <button type="submit">حفظ الإعدادات 💾</button>
                    </form>
                ` : `
                    <div style="background:#2f3136; padding:20px; border-radius:8px;">
                        <h3>مميزات رويال الحصرية (RKS Power)</h3>
                        <p style="color:#b9bbbe;">هذا القسم مخصص للتحكم بالأوامر الجديدة مثل تفقد حالة السيرفر عبر أمر <code style="background:#202225; padding:2px 6px; border-radius:4px;">/serverinfo</code> وأوامر الحماية المتقدمة.</p>
                    </div>
                `}
            </div>
        </body></html>
    `);
});

app.post('/action/save', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { guildId, section, nicknameFormat } = req.body;
    if (section === 'autopseudo' && nicknameFormat) {
        if (!guildSettings[guildId]) guildSettings[guildId] = {};
        guildSettings[guildId].nicknameFormat = nicknameFormat;
    }
    res.redirect(req.headers.referer || '/dashboard');
});

// =================== أوامر ديسكورد الفعلية (Slash Commands) ===================

client.on('ready', async () => {
    console.log(`✅ البوت شغال باسم: ${client.user.tag}`);
    
    // تسجيل الأوامر الجديدة كلياً (غير موجودة في Koya العادي)
    const commands = [
        {
            name: 'ping',
            description: 'فحص سرعة استجابة البوت'
        },
        {
            name: 'serverinfo',
            description: 'عرض معلومات تفصيلية وحصرية عن السيرفر'
        },
        {
            name: 'ban',
            description: 'حظر عضو من السيرفر',
            options: [{ name: 'user', type: 6, description: 'العضو المراد حظره', required: true }]
        }
    ];

    await client.application.commands.set(commands);
    console.log('✅ تم تسجيل جميع أوامر ديسكورد بنجاح!');
});

// استقبال وتنفيذ الأوامر
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply(`🏓 سرعة البوت الحالية: \`${client.ws.ping}ms\` - جاهز للخدمة يا وحش!`);
    }

    if (interaction.commandName === 'serverinfo') {
        const { guild } = interaction;
        await interaction.reply(`🏰 **معلومات السيرفر الحصري:**\n📌 الاسم: ${guild.name}\n👥 الأعضاء: ${guild.memberCount}\n👑 المالك الأساسي مصان`);
    }

    if (interaction.commandName === 'ban') {
        if (!interaction.member.permissions.has('BanMembers')) {
            return interaction.reply({ content: '❌ ما عندك صلاحية حظر الأعضاء!', ephemeral: true });
        }
        const user = interaction.options.getUser('user');
        try {
            await interaction.guild.members.ban(user);
            await interaction.reply(`✅ تم حظر **${user.username}** بنجاح بواسطة ${interaction.user.username}`);
        } catch (error) {
            await interaction.reply({ content: '❌ ما قدرت أحظر هذا العضو، تأكد من رتبتي.', ephemeral: true });
        }
    }
});

// تفعيل Auto Pseudo تلقائياً عند دخول عضو جديد
client.on('guildMemberAdd', async (member) => {
    try {
        const settings = guildSettings[member.guild.id];
        if (settings && settings.nicknameFormat) {
            let newName = settings.nicknameFormat.replace('{user.name}', member.user.username);
            await member.setNickname(newName);
        }
    } catch (e) {}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 لوحة التحكم والأوامر شغالة على البورت ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
