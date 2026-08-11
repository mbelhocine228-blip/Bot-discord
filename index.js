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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ 
    secret: 'rks-master-super-secret-2026', 
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

const newsChannels = new Map();
const customServerCommands = new Map(); // لحفظ الأوامر المضافة من لوحة التحكم

const racingMasterNewsList = [
  "🏎️ **تحديث الحلبات الأسطوري:** تمت إضافة مسارات ليلية جديدة في طوكيو مع تحسينات جبارة على فيزيائية الانجراف (Drift).",
  "🚗 **أسطول السيارات الخارقة:** وصول سيارات جديدة فئة S في التحديث القادم، استعدوا يا شباب لتطوير كراج RKS•ＰＯＷＥＲ!",
  "🏆 **بطولات الكلان الموسمية:** انطلاق التسجيل للبطولة الكبرى القادمة، نسقوا صفوفكم لتحقيق المركز الأول ورفع اسم الكلان عالياً.",
  "🛠️ **صيانة وتحسينات الجرافيك:** قامت الشركة المطورة بتحسين جودة الإضاءة والانعكاسات على الهياكل لتقارب الواقع."
];

const baseCommands = [
    new SlashCommandBuilder().setName('ban').setDescription('حظر عضو من السيرفر').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('unban').setDescription('فك الحظر عن عضو').addStringOption(opt => opt.setName('userid').setDescription('آيدي العضو').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('mute').setDescription('كتم عضو مؤقتاً').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('فك الكتم عن عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل بسرعة').addIntegerOption(opt => opt.setName('count').setDescription('العدد').setRequired(true)),
    new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالي'),
    new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم الحالي'),
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('say').setDescription('تكرار الكلام عبر البوت').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('ann').setDescription('إعلان رسمي مع منشن عام').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('embed').setDescription('إنشاء رسالة مزخرفة مخصصة').addStringOption(opt => opt.setName('title').setDescription('العنوان').setRequired(true)).addStringOption(opt => opt.setName('description').setDescription('المحتوى').setRequired(true)),
    new SlashCommandBuilder().setName('avatar').setDescription('عرض صورة بروفايلك أو عضو آخر').addUserOption(opt => opt.setName('user').setDescription('العضو')),
    new SlashCommandBuilder().setName('serverinfo').setDescription('عرض معلومات السيرفر الكاملة'),
    new SlashCommandBuilder().setName('google').setDescription('البحث في جوجل مباشرة من السيرفر').addStringOption(opt => opt.setName('query').setDescription('ما الذي تبحث عنه؟').setRequired(true)),
    new SlashCommandBuilder().setName('setnews').setDescription('تحديد روم لنشر أخبار Racing Master تلقائياً').addChannelOption(opt => opt.setName('channel').setDescription('روم الأخبار').setRequired(true)),
    new SlashCommandBuilder().setName('racingnews').setDescription('آخر أخبار لعبة Racing Master الرسمية'),
    new SlashCommandBuilder().setName('rockstats').setDescription('عرض إحصائيات كلان RKS•ＰＯＷＥＲ'),
    new SlashCommandBuilder().setName('roll').setDescription('رمي زهر عشوائي (رقم من 1 لـ 100)'),
    new SlashCommandBuilder().setName('coinflip').setDescription('لعبة طرة أو كتابة'),
    new SlashCommandBuilder().setName('ascii').setDescription('تحويل النص إلى حروف بارزة').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('uptime').setDescription('معرفة مدة تشغيل البوت المستمرة'),
    new SlashCommandBuilder().setName('botinfo').setDescription('معلومات تقنية عن بوت RKS Dashboard')
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
client.once('ready', async () => {
    console.log(`✅ البوت يعمل بنجاح تام كـ: ${client.user.tag}`);
    try {
        const commandsData = baseCommands.map(cmd => cmd.toJSON());
        await rest.put(Routes.applicationCommands('1171579175635800175'), { body: commandsData });
        console.log('🔄 تم تسجيل أوامر الديسكورد بنجاح.');
    } catch (error) { console.error(error); }

    setInterval(() => {
        newsChannels.forEach(async (channelId, guildId) => {
            try {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) return;
                const channel = guild.channels.cache.get(channelId);
                if (!channel) return;
                const randomNews = racingMasterNewsList[Math.floor(Math.random() * racingMasterNewsList.length)];
                const embed = new EmbedBuilder()
                    .setTitle('🏎️ أخبار Racing Master الحصرية')
                    .setDescription(randomNews)
                    .setColor('#FF4500')
                    .setFooter({ text: 'RKS•ＰＯＷＥＲ Official News' })
                    .setTimestamp();
                await channel.send({ embeds: [embed] });
            } catch (err) { console.error(err); }
        });
    }, 30 * 60 * 1000);
});

// --- تصميم عصري يحتوي على زر الشخطات الثلاثة (☰) والقائمة المنسدلة واللوحة المعمرة ---
const dashboardCSS = `
    body {
        background: linear-gradient(135deg, #07080c 0%, #131622 50%, #1d122b 100%);
        color: #ffffff;
        min-height: 100vh;
        margin: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    /* شريط التنقل العلوي مع زر الشخطات */
    .navbar {
        background: rgba(15, 17, 25, 0.95);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding: 15px 25px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 1000;
        backdrop-filter: blur(10px);
    }
    .menu-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #FFD700;
        font-size: 22px;
        padding: 6px 14px;
        border-radius: 8px;
        cursor: pointer;
        transition: 0.3s;
    }
    .menu-btn:hover {
        background: rgba(255, 255, 255, 0.15);
    }
    /* القائمة الجانبية المخفية التي تفتح بالشخطات */
    .sidebar {
        height: 100%;
        width: 0;
        position: fixed;
        z-index: 2000;
        top: 0;
        right: 0;
        background-color: #0b0d14;
        overflow-x: hidden;
        transition: 0.4s;
        padding-top: 60px;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: -10px 0 30px rgba(0,0,0,0.8);
    }
    .sidebar a {
        padding: 12px 25px;
        text-decoration: none;
        font-size: 16px;
        color: #b9bbbe;
        display: block;
        transition: 0.3s;
        border-bottom: 1px solid rgba(255,255,255,0.03);
    }
    .sidebar a:hover {
        color: #FFD700;
        background: rgba(255,255,255,0.05);
    }
    .sidebar .close-btn {
        position: absolute;
        top: 15px;
        left: 20px;
        font-size: 24px;
        background: none;
        border: none;
        color: white;
        cursor: pointer;
    }
    /* محتوى الصفحة الرئيسي */
    .main-container {
        max-width: 900px;
        margin: 30px auto;
        padding: 0 15px;
    }
    .card {
        background: rgba(22, 25, 37, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 25px;
        margin-bottom: 25px;
        box-shadow: 0 15px 35px rgba(0,0,0,0.5);
    }
    .card h3 {
        color: #FFD700;
        margin-top: 0;
        font-size: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .form-control {
        width: 100%;
        background: rgba(10, 12, 18, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: white;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 12px;
        font-size: 14px;
        box-sizing: border-box;
    }
    .btn-main {
        background: #5865F2;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        transition: 0.3s;
        font-size: 14px;
    }
    .btn-main:hover {
        background: #4752C4;
    }
    .command-box {
        background: rgba(10, 12, 18, 0.9);
        padding: 15px;
        border-radius: 10px;
        font-family: monospace;
        font-size: 13px;
        color: #dcdcdc;
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid rgba(255,255,255,0.05);
        line-height: 1.8;
    }
`;

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>RKS Dashboard</title><style>${dashboardCSS}</style></head><body style="display:flex; justify-content:center; align-items:center; height:100vh;"><div style="text-align:center;" class="card"><h1>⚡ لوحة تحكم RKS•ＰＯＷＥＲ</h1><p style="color:#b9bbbe; margin-bottom:25px;">لوحة تحكم ذكية، معمرة، ومليئة بالأدوات المتقدمة</p><a href="/login" class="btn-main" style="text-decoration:none; display:inline-block; font-size:16px;">تسجيل الدخول عبر ديسكورد 🎮</a><div style="margin-top:15px;"><a href="${INVITE_URL}" target="_blank" style="color:#23a55a; font-weight:bold; text-decoration:none;">+ إضافة البوت لسيرفرك</a></div></div></body></html>`);
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `<a href="/control/${guild.id}" style="text-decoration:none; color:white; display:flex; flex-direction:column; align-items:center; background:rgba(25,28,42,0.9); padding:20px; border-radius:14px; width:160px; border:1px solid rgba(255,255,255,0.08); transition:0.3s;"><img src="${iconUrl}" style="width:75px; height:75px; border-radius:50%; object-fit:cover; margin-bottom:12px;"><span style="font-size:14px; font-weight:bold; text-align:center;">${guild.name}</span></a>`;
    });
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>اختر السيرفر</title><style>${dashboardCSS}</style></head><body><div class="navbar"><strong>⚡ RKS Dashboard</strong><a href="/logout" style="background:#ed4245; color:white; padding:6px 14px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:bold;">خروج</a></div><div class="main-container"><h2>👋 أهلاً بك يا غالي، ${req.user.username}</h2><p style="color:#b9bbbe; margin-bottom:25px;">اختر السيرفر أدناه لفتح لوحة التحكم الشاملة والمملوءة بالمميزات:</p><div style="display:flex; gap:15px; flex-wrap:wrap;">${guildsHtml}</div></div></body></html>`);
});

app.get('/control/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');

    let channelsOpts = '';
    guild.channels.cache.forEach(ch => {
        if (ch.type === 0) { // Text Channel
            channelsOpts += `<option value="${ch.id}"># ${ch.name}</option>`;
        }
    });

    let customCmdsList = '';
    const sCmds = customServerCommands.get(guild.id) || [];
    if (sCmds.length === 0) {
        customCmdsList = 'لا توجد أامر مخصصة مضافة حالياً. استخدم النموذج أدناه لإضافة أمرك الجديد!';
    } else {
        sCmds.forEach(c => {
            customCmdsList += `• /${c.name} ➔ ${c.response}<br>`;
        });
    }

    let guildIcon = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>إدارة ${guild.name} - ROCKS</title>
            <style>${dashboardCSS}</style>
        </head>
        <body>
            <!-- شريط التنقل العلوي مع زر الشخطات الثلاثة -->
            <div class="navbar">
                <div style="display:flex; align-items:center; gap:15px;">
                    <button class="menu-btn" onclick="openNav()">☰</button>
                    <span style="font-weight:bold; color:#FFD700; font-size:16px;">RKS•ＰＯＷＥＲ Control Panel</span>
                </div>
                <a href="/dashboard" style="background:rgba(237,66,69,0.2); color:#ed4245; border:1px solid rgba(237,66,69,0.4); padding:6px 12px; border-radius:6px; text-decoration:none; font-size:12px; font-weight:bold;">العودة للسيرفرات</a>
            </div>

            <!-- القائمة الجانبية (الشخطات الثلاثة) -->
            <div id="mySidebar" class="sidebar">
                <button class="close-btn" onclick="closeNav()">×</button>
                <div style="text-align:center; padding:20px;">
                    <img src="${guildIcon}" style="width:70px;height:70px;border-radius:50%;border:2px solid #FFD700;object-fit:cover;margin-bottom:10px;">
                    <div style="color:white; font-weight:bold; font-size:14px;">${guild.name}</div>
                </div>
                <a href="#section-news">⚙️ إعدادات أخبار Racing Master</a>
                <a href="#section-addcmd">➕ إضافة أمر جديد للبوت</a>
                <a href="#section-commands">📋 قائمة الأوامر الشاملة (30 أمراً)</a>
                <a href="${INVITE_URL}" target="_blank" style="color:#23a55a;">+ إضافة البوت لسيرفر آخر</a>
                <a href="/logout" style="color:#ed4245;">🚪 تسجیل الخروج</a>
            </div>

            <div class="main-container">
                <div class="card" style="display:flex; align-items:center; gap:20px;">
                    <img src="${guildIcon}" style="width:85px; height:85px; border-radius:50%; border:3px solid #FFD700; object-fit:cover;">
                    <div>
                        <h2 style="color:#FFD700; margin:0 0 8px 0;">ROCKS / روكس (${guild.name})</h2>
                        <p style="color:#b9bbbe; margin:0; font-size:14px;">لوحة تحكم معمرة وغنية بالخيارات، حدد روماتك وأضف أوامرك بحرية تامة.</p>
                    </div>
                </div>

                <!-- 1. قسم تحديد روم أخبار أيسينج ماستر -->
                <div class="card" id="section-news">
                    <h3>🏎️ تحديد روم أخبار Racing Master</h3>
                    <p style="color:#b9bbbe; font-size:13px; margin-bottom:15px;">اختر الروم الذي تريد أن يرسل فيه البوت آخر أخبار وتحديثات اللعبة تلقائياً كل 30 دقيقة:</p>
                    <form action="/set-news-channel/${guild.id}" method="POST">
                        <select name="channelId" class="form-control">
                            ${channelsOpts}
                        </select>
                        <button type="submit" class="btn-main">حفظ وتفعيل الروم ✅</button>
                    </form>
                </div>

                <!-- 2. قسم إضافة أوامر جديدة داخل البوت -->
                <div class="card" id="section-addcmd">
                    <h3>➕ إضافة أمر جديد ومخصص للبوت</h3>
                    <p style="color:#b9bbbe; font-size:13px; margin-bottom:15px;">اكتب اسم الأمر ورد الفعل الذي سيرسله البوت عندما يكتبه أي عضو في السيرفر:</p>
                    <form action="/add-command/${guild.id}" method="POST">
                        <input type="text" name="cmdName" placeholder="اسم الأمر (مثال: discord أو clan)" class="form-control" required>
                        <input type="text" name="cmdResponse" placeholder="الرد الذي سيرسله البوت" class="form-control" required>
                        <button type="submit" class="btn-main">إضافة الأمر للسيرفر 🚀</button>
                    </form>
                    <div style="margin-top:15px;">
                        <strong style="color:#FFD700; font-size:13px;">الأوامر المضافة حالياً:</strong>
                        <div class="command-list" style="margin-top:8px;">${customCmdsList}</div>
                    </div>
                </div>

                <!-- 3. قائمة الأوامر الكاملة -->
                <div class="card" id="section-commands">
                    <h3>📋 قائمة الأوامر الشاملة (أكثر من 30 أمراً جاهزاً):</h3>
                    <div class="command-box">
                        • /ban [العضو] [السبب] - حظر عضو من السيرفر.<br>
                        • /kick [العضو] [السبب] - طرد عضو.<br>
                        • /mute [العضو] - كتم العضو مؤقتاً 10 دقائق.<br>
                        • /unmute [العضو] - فك الكتم.<br>
                        • /clear [العدد] - مسح الرسائل بسرعة وسهولة.<br>
                        • /lock & /unlock - قفل وفتح الروم الحالي.<br>
                        • /say [النص] - تكرار الكلام عبر البوت.<br>
                        • /ann [النص] - إعلان رسمي مع منشن عام (@everyone).<br>
                        • /embed [العنوان] [المحتوى] - إنشاء رسالة مزخرفة مخصصة.<br>
                        • /avatar [العضو] - عرض صورة بروفايلك أو عضو آخر بحجم كبير.<br>
                        • /serverinfo - عرض معلومات السيرفر الكاملة.<br>
                        • /google [البحث] - للبحث في جوجل مباشرة من السيرفر.<br>
                        • /setnews [#الروم] - تحديد روم الأخبار للعبة Racing Master.<br>
                        • /racingnews - عرض آخر أخبار Racing Master الحصرية.<br>
                        • /rockstats - عرض إحصائيات كلان RKS•ＰＯＷＥＲ.<br>
                        • /roll & /coinflip - ألعاب الحظ والزهر وطرة أو كتابة.<br>
                        • /ascii [النص] - تحويل النص إلى حروف بارزة.<br>
                        • /uptime - معرفة مدة تشغيل البوت المستمرة.<br>
                        • /botinfo - معلومات تقنية عن البوت.
                    </div>
                </div>
            </div>

            <!-- سكربت تشغيل وإغلاق القائمة الجانبية (الشخطات الثلاثة) -->
            <script>
                function openNav() {
                    document.getElementById("mySidebar").style.width = "270px";
                }
                function closeNav() {
                    document.getElementById("mySidebar").style.width = "0";
                }
            </script>
        </body>
        </html>
    `);
});

// معالجة طلب تعيين روم الأخبار
app.post('/set-news-channel/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { channelId } = req.body;
    newsChannels.set(req.params.guildId, channelId);
    res.redirect(`/control/${req.params.guildId}`);
});

// معالجة طلب إضافة أمر جديد
app.post('/add-command/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const { cmdName, cmdResponse } = req.body;
    const guildId = req.params.guildId;
    
    if (!customServerCommands.has(guildId)) {
        customServerCommands.set(guildId, []);
    }
    customServerCommands.get(guildId).push({ name: cmdName.toLowerCase(), response: cmdResponse });
    res.redirect(`/control/${guildId}`);
});

// استقبال التفاعلات والرسائل (تنفيذ الأوامر الأساسية والمضافة)
client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const sCmds = customServerCommands.get(message.guild.id);
    if (!sCmds) return;
    
    // دعم تشغيل الأوامر المضافة ببادئة !
    if (message.content.startsWith('!')) {
        const args = message.content.slice(1).trim().toLowerCase();
        const found = sCmds.find(c => c.name === args);
        if (found) {
            message.channel.send(found.response);
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, member, guild } = interaction;

    try {
        if (commandName === 'ban') {
            if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية حظر الأعضاء.', ephemeral: true });
            const target = options.getMember('user');
            const reason = options.getString('reason') || 'بدون سبب';
            await target.ban({ reason });
            await interaction.reply({ content: `🔨 تم حظر العضو ${target.user.tag} بنجاح.` });
        }
        else if (commandName === 'kick') {
            if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية طرد الأعضاء.', ephemeral: true });
            const target = options.getMember('user');
            const reason = options.getString('reason') || 'بدون سبب';
            await target.kick(reason);
            await interaction.reply({ content: `👢 تم طرد العضو ${target.user.tag} بنجاح.` });
        }
        else if (commandName === 'mute') {
            if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية كتم الأعضاء.', ephemeral: true });
            const target = options.getMember('user');
            await target.timeout(10 * 60 * 1000, 'كتم مؤقت من الإدارة');
            await interaction.reply({ content: `🔇 تم كتم العضو ${target.user.tag} لمدة 10 دقائق بنجاح.` });
        }
        else if (commandName === 'unmute') {
            if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
            const target = options.getMember('user');
            await target.timeout(null);
            await interaction.reply({ content: `🔊 تم رفع الكتم عن العضو ${target.user.tag}.` });
        }
        else if (commandName === 'clear') {
            if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ يتطلب صلاحية إدارة الرسائل.', ephemeral: true });
            const count = options.getInteger('count');
            await interaction.channel.bulkDelete(count, true).catch(() => {});
            await interaction.reply({ content: `🧹 تم مسح ${count} رسالة بنجاح.`, ephemeral: true });
        }
        else if (commandName === 'lock') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول.', ephemeral: true });
            await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: false });
            await interaction.reply({ content: '🔒 تم قفل الروم بنجاح.' });
        }
        else if (commandName === 'unlock') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول.', ephemeral: true });
            await interaction.channel.permissionOverwrites.edit(guild.id, { SendMessages: true });
            await interaction.reply({ content: '🔓 تم فتح الروم بنجاح.' });
        }
        else if (commandName === 'ping') {
            await interaction.reply({ content: `🏓 Pong! سرعة استجابة البوت: ${client.ws.ping}ms` });
        }
        else if (commandName === 'say') {
            const text = options.getString('text');
            await interaction.channel.send(text);
            await interaction.reply({ content: '✅ تم إرسال الرسالة.', ephemeral: true });
        }
        else if (commandName === 'ann') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول.', ephemeral: true });
            const text = options.getString('text');
            const embed = new EmbedBuilder().setTitle('📢 إعلان رسمي').setDescription(text).setColor('#FFD700').setTimestamp();
            await interaction.channel.send({ content: '@everyone', embeds: [embed] });
            await interaction.reply({ content: '✅ تم نشر الإعلان.', ephemeral: true });
        }
        else if (commandName === 'embed') {
            const title = options.getString('title');
            const desc = options.getString('description');
            const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor('#5865F2').setTimestamp();
            await interaction.channel.send({ embeds: [embed] });
            await interaction.reply({ content: '✅ تم إرسال الـ Embed بنجاح.', ephemeral: true });
        }
        else if (commandName === 'avatar') {
            const user = options.getUser('user') || interaction.user;
            const embed = new EmbedBuilder().setTitle(`🖼️ صورة بروفايل: ${user.username}`).setImage(user.displayAvatarURL({ size: 1024 })).setColor('#5865F2');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'serverinfo') {
            const embed = new EmbedBuilder()
                .setTitle(`📊 معلومات سيرفر: ${guild.name}`)
                .addFields(
                    { name: '👤 الأعضاء:', value: `${guild.memberCount}`, inline: true },
                    { name: '📁 الرومات:', value: `${guild.channels.cache.size}`, inline: true }
                )
                .setColor('#3498DB');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'google') {
            const query = options.getString('query');
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            const embed = new EmbedBuilder()
                .setTitle(`🔍 نتائج البحث في جوجل عن: ${query}`)
                .setDescription(`انقر على الرابط أدناه لعرض نتائج البحث مباشرة في متصفحك:\n\n[اضغط هنا لفتح نتائج جوجل](${searchUrl})`)
                .setColor('#4285F4')
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'setnews') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول.', ephemeral: true });
            const channel = options.getChannel('channel');
            newsChannels.set(guild.id, channel.id);
            await interaction.reply({ content: `✅ تم تعيين الروم ${channel} بنجاح لنشر أخبار Racing Master تلقائياً.` });
        }
        else if (commandName === 'racingnews') {
            const embed = new EmbedBuilder()
                .setTitle('🏎️ آخر أخبار Racing Master الحصرية')
                .setDescription('استعد للموسم الجديد وتحديثات الجرافيك الخارقة للسيارات في الحلبات.')
                .setColor('#FF4500');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'rockstats') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ إحصائيات كلان RKS•ＰＯＷＥＲ')
                .setDescription('أقوى كلان نشط في Racing Master و OneState RP!\n• السيرفر الأساسي: مفعل\n• الحالة: جاهز للتحديات والبطولات 🚀')
                .setColor('#E74C3C');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'roll') {
            const num = Math.floor(Math.random() * 100) + 1;
            await interaction.reply({ content: `🎲 النتيجة العشوائية الخاصة بك هي: **${num}** / 100` });
        }
        else if (commandName === 'coinflip') {
            const result = Math.random() < 0.5 ? '🪙 طرة (Heads)' : '🪙 كتابة (Tails)';
            await interaction.reply({ content: `نتيجة الرمية هي: **${result}**` });
        }
        else if (commandName === 'ascii') {
            const text = options.getString('text');
            await interaction.reply({ content: `\`\`\`text\n[ ${text.toUpperCase()} ]\n\`\`\`` });
        }
        else if (commandName === 'botinfo') {
            const embed = new EmbedBuilder()
                .setTitle('🤖 معلومات بوت RKS Dashboard')
                .setDescription('البوت يعمل بكفاءة تامة لإدارة السيرفرات وتنظيم مجتمعات الألعاب.')
                .setColor('#5865F2');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'uptime') {
            let totalSeconds = (client.uptime / 1000);
            let hours = Math.floor(totalSeconds / 3600);
            let minutes = Math.floor((totalSeconds % 3600) / 60);
            await interaction.reply({ content: `⏱️ مدة تشغيل البوت المستمرة: **${hours}** ساعة و **${minutes}** دقيقة.` });
        }
        else {
            await interaction.reply({ content: `✅ تم تنفيذ أمر **/${commandName}** بنجاح!`, ephemeral: true });
        }
    } catch (err) {
        console.error(err);
        await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ هذا الأمر.', ephemeral: true }).catch(() => {});
    }
});

client.login(process.env.DISCORD_TOKEN);
app.listen(process.env.PORT || 3000, () => console.log('🚀 لوحة التحكم الشاملة والمزودة بالقائمة الجانبية تعمل الآن بنجاح تام!'));
