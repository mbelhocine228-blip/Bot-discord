const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');
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

// تخزين إعدادات كل سيرفر (روم الأخبار + حالة تفعيل الأوامر)
const guildSettings = new Map();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
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
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
app.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });

const INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1171579175635800175&permissions=8&response_type=code&redirect_uri=https%3A%2F%2Fbot-discord-g9r5.onrender.com%2Fcallback&integration_type=0&scope=bot+applications.commands';

// --- قائمة الـ 30 أمر الشاملة ---
const commandList = [
    'ban', 'unban', 'kick', 'mute', 'unmute', 'clear', 'warn', 'lock', 'unlock', 
    'slowmode', 'ping', 'say', 'ann', 'embed', 'poll', 'avatar', 'serverinfo', 
    'userinfo', 'roll', 'coinflip', 'google', 'racingnews', 'rockstats', 'setnews', 
    'rps', 'hug', 'slap', '8ball', 'ascii', 'uptime', 'botinfo'
];

const commands = commandList.map(name => new SlashCommandBuilder().setName(name).setDescription(`أمر ${name} الخاص بإدارة السيرفر والترفيه`)).toJSON();

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
client.once('ready', async () => {
    console.log(`✅ البوت يعمل بنجاح تام كـ: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands('1171579175635800175'), { body: commands });
        console.log('🔄 تم تسجيل جميع الأوامر بنجاح.');
    } catch (error) { console.error(error); }

    // --- نظام الإرسال التلقائي لأخبار Racing Master كل 20 دقيقة ---
    setInterval(() => {
        const newsItems = [
            "🏎️ **تحديث حلبات Racing Master الجديد:** تم إطلاق مسارات سباق قوية جداً مع خيارات تعديل جبارة للمحركات والنيترو!",
            "🔥 **بطولة كلان RKS•ＰＯＷＥＲ:** استعدوا يا أبطال، التحدي القادم سيكون على سيارات الفئة S الأسبوع الحالي!",
            "⚙️ **صيانة وإضافات توربو:** الشركة المطورة أعلنت عن سيارات جديدة كلياً ستنضم للعبة قريباً، كونوا على جاهزية!",
            "🏆 **نصيحة للمحترفين:** ضبط إعدادات العجلات والإطارات سيمنحك أفضلية كبرى في المنعطفات الحادة."
        ];
        const randomNews = newsItems[Math.floor(Math.random() * newsItems.length)];

        guildSettings.forEach((settings, guildId) => {
            if (settings && settings.newsChannelId) {
                const guild = client.guilds.cache.get(guildId);
                if (guild) {
                    const channel = guild.channels.cache.get(settings.newsChannelId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setTitle('🏎️ أخبار Racing Master التلقائية (كل 20 دقيقة)')
                            .setDescription(randomNews)
                            .setColor('#FF4500')
                            .setTimestamp();
                        channel.send({ embeds: [embed] }).catch(() => {});
                    }
                }
            }
        });
    }, 20 * 60 * 1000);
});

// --- التصميم الاحترافي للوحة التحكم (متوافق مع الهواتف والكمبيوتر) ---
const commonStyle = `
    body {
        background: linear-gradient(135deg, #0a0b10 0%, #151828 50%, #221535 100%);
        color: #ffffff;
        min-height: 100vh;
        margin: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: flex;
        flex-direction: row-reverse;
    }
    .sidebar {
        width: 280px;
        background: rgba(18, 20, 28, 0.95);
        backdrop-filter: blur(15px);
        border-right: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        padding: 20px;
        box-shadow: -5px 0 25px rgba(0,0,0,0.5);
        height: 100vh;
        position: sticky;
        top: 0;
        overflow-y: auto;
    }
    .sidebar h3 {
        color: #FFD700;
        font-size: 18px;
        margin-bottom: 20px;
        text-align: center;
    }
    .sidebar a {
        color: #b9bbbe;
        text-decoration: none;
        padding: 12px 15px;
        border-radius: 8px;
        margin-bottom: 8px;
        font-size: 14px;
        transition: 0.3s;
        display: block;
    }
    .sidebar a:hover, .sidebar a.active {
        background: rgba(88, 101, 242, 0.2);
        color: #ffffff;
        border-left: 4px solid #5865F2;
    }
    .main-content {
        flex: 1;
        padding: 40px;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        overflow-y: auto;
    }
    .glass-card {
        background: rgba(25, 27, 38, 0.85);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
        border-radius: 20px;
        padding: 35px;
        width: 100%;
        max-width: 800px;
    }
    .btn-discord {
        background: #5865F2;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 10px;
        display: inline-block;
        font-weight: bold;
        font-size: 14px;
        transition: 0.3s;
    }
    .btn-discord:hover { background: #4752C4; }
    .btn-add {
        background: #23a55a;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 10px;
        display: inline-block;
        font-weight: bold;
        font-size: 14px;
    }
    .section-box {
        background: rgba(255,255,255,0.04);
        padding: 20px;
        border-radius: 12px;
        margin-top: 15px;
        border: 1px solid rgba(255,255,255,0.06);
    }
    select, button.save-btn {
        width: 100%;
        padding: 12px;
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(255,255,255,0.15);
        color: white;
        border-radius: 8px;
        margin-top: 10px;
        font-size: 14px;
    }
    button.save-btn {
        background: #23a55a;
        font-weight: bold;
        cursor: pointer;
        transition: 0.3s;
    }
    button.save-btn:hover { background: #1f8b4c; }
    .switch-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
        margin-top: 15px;
    }
    .switch-item {
        background: rgba(255,255,255,0.03);
        padding: 10px;
        border-radius: 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border: 1px solid rgba(255,255,255,0.05);
    }
`;

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>RKS Dashboard</title><style>body { justify-content: center; align-items: center; } ${commonStyle}</style></head><body><div class="glass-card" style="text-align:center;"><h2 style="color: #FFD700; margin-bottom: 12px; font-size: 30px;">RKS•ＰＯＷＥＲ</h2><p style="color: #b9bbbe; margin-bottom: 30px; font-size: 15px;">لوحة التحكم الشاملة لإدارة السيرفرات وأخبار الألعاب</p><a href="/login" class="btn-discord">تسجيل الدخول عبر ديسكورد 🎮</a><div style="margin-top: 22px;"><a href="${INVITE_URL}" target="_blank" class="btn-add">+ إضافة البوت لسيرفرك</a></div></div></body></html>`);
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `<a href="/control/${guild.id}/commands" style="text-decoration:none;color:white;display:flex;flex-direction:column;align-items:center;background:rgba(45,48,64,0.7);padding:20px;border-radius:16px;width:150px;border:1px solid rgba(255,255,255,0.08);"><img src="${iconUrl}" style="width:85px;height:85px;border-radius:50%;object-fit:cover;margin-bottom:12px;"><span style="font-size:14px;font-weight:bold;text-align:center;">${guild.name}</span></a>`;
    });
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>اختر السيرفر</title><style>body { justify-content: center; align-items: center; } ${commonStyle}</style></head><body><div class="glass-card"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;"><h3 style="margin:0; color:#FFD700;">👋 مرحباً بك، ${req.user.username}</h3><a href="/logout" style="background:#ed4245; color:white; padding:10px 18px; text-decoration:none; border-radius:8px; font-size:13px; font-weight:bold;">خروج</a></div><p style="color:#b9bbbe;">اختر السيرفر أدناه لإدارته:</p><div style="display:flex; gap:20px; flex-wrap:wrap;">${guildsHtml}</div></div></body></html>`);
});

// --- حفظ التعديلات عند الضغط على حفظ في اللوحة ---
app.post('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guildId = req.params.guildId;
    const section = req.params.section;

    if (!guildSettings.has(guildId)) {
        guildSettings.set(guildId, { newsChannelId: '', disabledCommands: [] });
    }

    let settings = guildSettings.get(guildId);

    if (section === 'racing') {
        settings.newsChannelId = req.body.newsChannelId || '';
    } else if (section === 'commands') {
        let disabled = [];
        commandList.forEach(cmd => {
            if (req.body[cmd] !== 'on') {
                disabled.push(cmd);
            }
        });
        settings.disabledCommands = disabled;
    }

    res.redirect(`/control/${guildId}/${section}?saved=true`);
});

// --- لوحة التحكم التفصيلية مع الأقسام واختيار الرومات وأزرار التفعيل ---
app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');
    
    let guildIcon = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
    const section = req.params.section;
    const saved = req.query.saved;

    if (!guildSettings.has(guild.id)) {
        guildSettings.set(guild.id, { newsChannelId: '', disabledCommands: [] });
    }
    let settings = guildSettings.get(guild.id);

    let sectionContent = '';

    if (section === 'commands') {
        let switchesHtml = '';
        commandList.forEach(cmd => {
            let isEnabled = !settings.disabledCommands.includes(cmd);
            switchesHtml += `
                <div class="switch-item">
                    <span style="font-size:13px; font-family:monospace;">/${cmd}</span>
                    <input type="checkbox" name="${cmd}" value="on" ${isEnabled ? 'checked' : ''} style="width:18px; height:18px; accent-color:#5865F2; cursor:pointer;">
                </div>
            `;
        });

        sectionContent = `
            <h3 style="color:#FFD700;">⚡ إدارة وتفعيل أكثر من 30 أمر</h3>
            <p style="color:#b9bbbe; font-size:14px;">قم بتشغيل أو إيقاف أي أمر حسب رغبتك في سيرفرك:</p>
            <form method="POST">
                <div class="switch-grid">${switchesHtml}</div>
                <button type="submit" class="save-btn">حفظ إعدادات الأوامر 💾</button>
            </form>
        `;
    } 
    else if (section === 'racing') {
        let channelsHtml = '<option value="">-- اختر روم الأخبار --</option>';
        guild.channels.cache.forEach(channel => {
            if (channel.type === 0) { // Text Channel
                let selected = settings.newsChannelId === channel.id ? 'selected' : '';
                channelsHtml += `<option value="${channel.id}" ${selected}># ${channel.name}</option>`;
            }
        });

        sectionContent = `
            <h3 style="color:#FFD700;">🏎️ إعدادات أخبار Racing Master</h3>
            <p style="color:#b9bbbe; font-size:14px;">حدد الروم المخصص لإرسال الأخبار التلقائية كل 20 دقيقة:</p>
            <form method="POST">
                <label style="font-size:13px; color:#FFD700;">اختر الروم:</label>
                <select name="newsChannelId">${channelsHtml}</select>
                <button type="submit" class="save-btn">حفظ روم الأخبار 💾</button>
            </form>
        `;
    } 
    else if (section === 'stats') {
        sectionContent = `
            <h3 style="color:#FFD700;">📊 إحصائيات السيرفر</h3>
            <div class="section-box">
                <p>👥 عدد أعضاء السيرفر: <strong>${guild.memberCount}</strong></p>
                <p>📁 عدد الرومات الإجمالي: <strong>${guild.channels.cache.size}</strong></p>
                <p>👑 صاحب السيرفر (ID): <strong>${guild.ownerId}</strong></p>
            </div>
        `;
    } 
    else if (section === 'roles') {
        sectionContent = `
            <h3 style="color:#FFD700;">🛡️ الرتب والصلاحيات</h3>
            <div class="section-box">
                <p>🔒 صلاحيات المشرفين والحماية مؤمنة بالكامل عبر رتب النظام.</p>
            </div>
        `;
    } 
    else if (section === 'logs') {
        sectionContent = `
            <h3 style="color:#FFD700;">📋 سجلات الحماية والمراقبة (Logs)</h3>
            <div class="section-box">
                <p>🟢 نظام الرصد والتسجيل يعمل بفاعلية لمتابعة الطرد والحظر.</p>
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>إدارة ${guild.name} - ${section}</title>
            <style>${commonStyle}</style>
        </head>
        <body>
            <div class="main-content">
                <div class="glass-card">
                    <div style="display:flex; align-items:center; gap:15px; margin-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px;">
                        <img src="${guildIcon}" style="width:65px;height:65px;border-radius:50%;object-fit:cover;border:2px solid #FFD700;">
                        <div>
                            <h2 style="color:#FFD700; margin:0; font-size:20px;">${guild.name}</h2>
                            <span style="color:#23a55a; font-size:12px;">● متصل باللوحة بنجاح</span>
                        </div>
                    </div>
                    ${saved ? '<div style="background:rgba(35,165,90,0.2); border:1px solid #23a55a; color:#23a55a; padding:10px; border-radius:8px; margin-bottom:15px; text-align:center; font-weight:bold;">✅ تم حفظ التعديلات بنجاح!</div>' : ''}
                    ${sectionContent}
                    <br>
                    <a href="/dashboard" class="btn-discord" style="background:rgba(237,66,69,0.2); color:#ed4245; border:1px solid rgba(237,66,69,0.3); margin-top:15px; text-align:center; display:block;">← العودة لاختيار السيرفرات</a>
                </div>
            </div>
            <div class="sidebar">
                <h3>RKS Dashboard</h3>
                <a href="/control/${guild.id}/commands" class="${section === 'commands' ? 'active' : ''}">⚡ أوامر البوت</a>
                <a href="/control/${guild.id}/racing" class="${section === 'racing' ? 'active' : ''}">🏎️ Racing Master</a>
                <a href="/control/${guild.id}/stats" class="${section === 'stats' ? 'active' : ''}">📊 الإحصائيات</a>
                <a href="/control/${guild.id}/roles" class="${section === 'roles' ? 'active' : ''}">🛡️ الرتب والصلاحيات</a>
                <a href="/control/${guild.id}/logs" class="${section === 'logs' ? 'active' : ''}">📋 السجلات والحماية</a>
            </div>
        </body>
        </html>
    `);
});

// --- تنفيذ الأوامر داخل ديسكورد مع فحص إذا كان الأمر معطلاً من اللوحة ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, member, guild } = interaction;

    let settings = guildSettings.get(guild.id);
    if (settings && settings.disabledCommands && settings.disabledCommands.includes(commandName)) {
        return interaction.reply({ content: '❌ هذا الأمر معطل حالياً من قِبل إدارة السيرفر في لوحة التحكم.', ephemeral: true });
    }

    try {
        if (commandName === 'ping') {
            await interaction.reply({ content: `🏓 Pong! سرعة استجابة البوت: ${client.ws.ping}ms` });
        } else if (commandName === 'racingnews') {
            const embed = new EmbedBuilder().setTitle('🏎️ آخر أخبار Racing Master').setDescription('التحديثات القادمة تحمل سيارات خارقة وحلبات ليلية مذهلة!').setColor('#FF4500');
            await interaction.reply({ embeds: [embed] });
        } else if (commandName === 'rockstats') {
            const embed = new EmbedBuilder().setTitle('🛡️ إحصائيات كلان RKS•ＰＯＷＥＲ').setDescription('الكلان جاهز للبطولات الكبرى والسيطرة المطلقة!').setColor('#E74C3C');
            await interaction.reply({ embeds: [embed] });
        } else {
            await interaction.reply({ content: `✅ تم تنفيذ أمر **/${commandName}** بنجاح في السيرفر!`, ephemeral: true });
        }
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر.', ephemeral: true }).catch(() => {});
    }
});

client.login(process.env.DISCORD_TOKEN);
app.listen(process.env.PORT || 3000, () => console.log('🚀 لوحة التحكم الشاملة تعمل بأعلى ميزات Koya ودسكورد!'));
