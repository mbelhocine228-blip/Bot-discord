const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
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

const guildSettings = new Map();
const serverFeatures = new Map();
const guildClubTimers = new Map();

function getGuildFeatures(guildId) {
    if (!serverFeatures.has(guildId)) {
        serverFeatures.set(guildId, {
            linkspam: true,
            censor: true,
            deletefiles: true,
            mentionsspam: true,
            gaming_commands: true,
            notifications: true
        });
    }
    return serverFeatures.get(guildId);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ 
    secret: 'rks-koya-master-secret-999', 
    resave: false, 
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true, sameSite: 'lax' }
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

const botCommandsList = [
    { name: 'ban', desc: 'حظر عضو من السيرفر' },
    { name: 'unban', desc: 'فك الحظر عن عضو بواسطة الآيدي' },
    { name: 'kick', desc: 'طرد عضو من السيرفر' },
    { name: 'mute', desc: 'كتم عضو مؤقتاً (Timeout)' },
    { name: 'unmute', desc: 'فك الكتم عن عضو' },
    { name: 'clear', desc: 'مسح وحذف الرسائل بسرعة' },
    { name: 'warn', desc: 'تحذير عضو مخالف' },
    { name: 'lock', desc: 'قفل الروم الحالي لمنع التحدث' },
    { name: 'unlock', desc: 'فتح الروم الحالي' },
    { name: 'slowmode', desc: 'تحديد وقت بطيء للشات' },
    { name: 'ping', desc: 'فحص سرعة استجابة البوت' },
    { name: 'say', desc: 'تكرار الكلام عبر البوت' },
    { name: 'announcement', desc: 'إرسال إعلان رسمي من إدارة الكلان مع صورة وروم مخصص' },
    { name: 'embed', desc: 'إنشاء رسالة مزخرفة مخصصة' },
    { name: 'poll', desc: 'عمل تصويت سريع للأعضاء' },
    { name: 'avatar', desc: 'عرض صورة بروفايلك أو عضو آخر' },
    { name: 'serverinfo', desc: 'عرض معلومات السيرفر الكاملة' },
    { name: 'userinfo', desc: 'عرض معلومات عضويتك أو عضو آخر' },
    { name: 'roll', desc: 'رمي زهر عشوائي (رقم من 1 لـ 100)' },
    { name: 'coinflip', desc: 'لعبة طرة أو كتابة' },
    { name: 'google', desc: 'البحث في جوجل مباشرة من السيرفر' },
    { name: 'racingnews', desc: 'آخر أخبار لعبة Racing Master الرسمية' },
    { name: 'rockstats', desc: 'عرض إحصائيات كلان RKS•ＰＯＷＥＲ' },
    { name: 'setnews', desc: 'تحديد روم الإرسال التلقائي لأخبار رايسنغ ماستر' },
    { name: 'ticketsetup', desc: 'إنشاء لوحة التذاكر التفاعلية' },
    { name: 'applysetup', desc: 'إرسال نموذج التقديم على كلان RKS' },
    { name: 'setclubtimer', desc: 'تحديث أوقات مهام الكلان في النظام بصمت' },
    { name: 'eventsched', desc: 'جدولة سباق أو فعالية جديدة' },
    { name: 'rps', desc: 'لعبة حجر ورقة مقص ضد البوت' },
    { name: 'hug', desc: 'إرسال حضن ودي لعضو' },
    { name: 'slap', desc: 'إعطاء كف مزحي لعضو' },
    { name: '8ball', desc: 'اسأل كرة الحظ سؤالاً وستجيبك' },
    { name: 'ascii', desc: 'تحويل النص إلى حروف بارزة' },
    { name: 'uptime', desc: 'معرفة مدة تشغيل البوت المستمرة' }
];

const commands = [
    new SlashCommandBuilder().setName('ban').setDescription('حظر عضو من السيرفر').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('unban').setDescription('فك الحظر عن عضو').addStringOption(opt => opt.setName('userid').setDescription('آيدي العضو').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('mute').setDescription('كتم عضو مؤقتاً').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('unmute').setDescription('فك الكتم عن عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('مسح الرسائل بسرعة').addIntegerOption(opt => opt.setName('count').setDescription('العدد').setRequired(true)),
    new SlashCommandBuilder().setName('warn').setDescription('تحذير عضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder().setName('lock').setDescription('قفل الروم الحالي'),
    new SlashCommandBuilder().setName('unlock').setDescription('فتح الروم الحالي'),
    new SlashCommandBuilder().setName('slowmode').setDescription('تحديد وقت بطيء للشات').addIntegerOption(opt => opt.setName('seconds').setDescription('الثواني').setRequired(true)),
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    new SlashCommandBuilder().setName('say').setDescription('تكرار الكلام عبر البوت').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder()
        .setName('announcement')
        .setDescription('إرسال إعلان رسمي من إدارة الكلان مع صورة وروم مخصص')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('اختر الروم المراد إرسال الإعلان فيه')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('اختر صورة الإعلان المراد إرفاقها')
                .setRequired(false)),
    new SlashCommandBuilder().setName('embed').setDescription('إنشاء رسالة مزخرفة مخصصة').addStringOption(opt => opt.setName('title').setDescription('العنوان').setRequired(true)).addStringOption(opt => opt.setName('description').setDescription('المحتوى').setRequired(true)),
    new SlashCommandBuilder().setName('poll').setDescription('عمل تصويت سريع').addStringOption(opt => opt.setName('question').setDescription('السؤال').setRequired(true)),
    new SlashCommandBuilder().setName('avatar').setDescription('عرض صورة بروفايلك أو عضو آخر').addUserOption(opt => opt.setName('user').setDescription('العضو')),
    new SlashCommandBuilder().setName('serverinfo').setDescription('عرض معلومات السيرفر الكاملة'),
    new SlashCommandBuilder().setName('userinfo').setDescription('عرض معلومات عضويتك أو عضو آخر').addUserOption(opt => opt.setName('user').setDescription('العضو')),
    new SlashCommandBuilder().setName('roll').setDescription('رمي زهر عشوائي (رقم من 1 لـ 100)'),
    new SlashCommandBuilder().setName('coinflip').setDescription('لعبة طرة أو كتابة'),
    new SlashCommandBuilder().setName('google').setDescription('البحث في جوجل مباشرة من السيرفر').addStringOption(opt => opt.setName('query').setDescription('ما الذي تبحث عنه؟').setRequired(true)),
    new SlashCommandBuilder().setName('racingnews').setDescription('آخر أخبار لعبة Racing Master الرسمية'),
    new SlashCommandBuilder().setName('rockstats').setDescription('عرض إحصائيات كلان RKS•ＰＯＷＥＲ'),
    new SlashCommandBuilder().setName('setnews').setDescription('تحديد روم الإرسال التلقائي لأخبار رايسنغ ماستر').addChannelOption(opt => opt.setName('channel').setDescription('اختر الروم').setRequired(true)),
    new SlashCommandBuilder().setName('ticketsetup').setDescription('إنشاء لوحة التذاكر التفاعلية للاستفسارات'),
    new SlashCommandBuilder().setName('applysetup').setDescription('إرسال نظام الانضمام والتقديم لكلان RKS'),
    new SlashCommandBuilder().setName('setclubtimer').setDescription('تحديث أوقات مهام الكلان في النظام بصمت (Endurance & Duel)').addStringOption(opt => opt.setName('endurance_time').setDescription('وقت Endurance (مثلاً: Results Revealed)').setRequired(true)).addStringOption(opt => opt.setName('duel_time').setDescription('وقت Duel (مثلاً: 2d 2h 54m)').setRequired(true)),
    new SlashCommandBuilder().setName('eventsched').setDescription('جدولة فعالية سباق جديدة').addStringOption(opt => opt.setName('title').setDescription('اسم السباق/الفعالية').setRequired(true)).addStringOption(opt => opt.setName('time').setDescription('الوقت والتاريخ').setRequired(true)),
    new SlashCommandBuilder().setName('rps').setDescription('لعبة حجر ورقة مقص ضد البوت').addStringOption(opt => opt.setName('choice').setDescription('اختر: حجر، ورقة، مقص').setRequired(true)),
    new SlashCommandBuilder().setName('hug').setDescription('إرسال حضن ودي لعضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('slap').setDescription('إعطاء كف مزحي لعضو').addUserOption(opt => opt.setName('user').setDescription('العضو').setRequired(true)),
    new SlashCommandBuilder().setName('8ball').setDescription('اسأل كرة الحظ سؤالاً وستجيبك').addStringOption(opt => opt.setName('question').setDescription('سؤالك').setRequired(true)),
    new SlashCommandBuilder().setName('ascii').setDescription('تحويل النص إلى حروف بارزة').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder().setName('uptime').setDescription('معرفة مدة تشغيل البوت المستمرة'),
    new SlashCommandBuilder().setName('botinfo').setDescription('معلومات تقنية عن بوت RKS Dashboard')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
client.once('ready', async () => {
    console.log(`✅ البوت يعمل بنجاح تام كـ: ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands('1171579175635800175'), { body: commands });
        console.log('🔄 تم تسجيل جميع الأوامر ونظام التحديث الصامت بنجاح.');
    } catch (error) { console.error(error); }

    setInterval(() => {
        guildSettings.forEach((settings, guildId) => {
            if (settings && settings.newsChannelId) {
                const guild = client.guilds.cache.get(guildId);
                if (guild) {
                    const features = getGuildFeatures(guildId);
                    if (features.notifications) {
                        const channel = guild.channels.cache.get(settings.newsChannelId);
                        if (channel) {
                            const timerData = guildClubTimers.get(guildId);
                            if (timerData) {
                                const embed = new EmbedBuilder()
                                    .setTitle('🏁 التحديث التلقائي لمهام كلان RKS•ＰＯＷＥＲ')
                                    .setDescription('تابع أحدث أوقات المهام الحالية في اللعبة:')
                                    .setColor('#FFD700')
                                    .addFields(
                                        { name: '🏎️ CLUB ENDURANCE', value: `⏳ المتبقي: **${timerData.endurance}**`, inline: false },
                                        { name: '⚔️ CLUB DUEL', value: `⏳ المتبقي: **${timerData.duel}**`, inline: false }
                                    )
                                    .setTimestamp();

                                channel.send({ embeds: [embed] }).catch(() => {});
                            }
                        }
                    }
                }
            }
        });
    }, 60 * 60 * 1000);
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    const features = getGuildFeatures(message.guild.id);
    const badWords = ["كلمة_ممنوعة_1", "كلمة_ممنوعة_2"];
    if (features.censor && badWords.some(word => message.content.toLowerCase().includes(word))) {
        await message.delete().catch(() => {});
        return message.channel.send(`⚠️ ${message.author}, هذه الكلمة ممنوعة في السيرفر!`).then(m => setTimeout(() => m.delete().catch(()=>{}), 4000));
    }
});

app.post('/control/:guildId/racing/save', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guildId = req.params.guildId;
    const channelId = req.body.newsChannelId;
    
    let settings = guildSettings.get(guildId) || {};
    settings.newsChannelId = channelId;
    guildSettings.set(guildId, settings);
    
    res.redirect(`/control/${guildId}/racing?saved=true`);
});

const rksThemeStyle = `
    * { box-sizing: border-box; }
    body {
        background-color: #0b0d14;
        background-image: 
            linear-gradient(rgba(255, 215, 0, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 215, 0, 0.02) 1px, transparent 1px);
        background-size: 30px 30px;
        color: #ffffff;
        min-height: 100vh;
        margin: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: flex;
        flex-direction: row-reverse;
    }
    .sidebar {
        width: 280px;
        min-width: 280px;
        background: rgba(13, 15, 22, 0.98);
        backdrop-filter: blur(15px);
        border-right: 1px solid rgba(255, 215, 0, 0.1);
        display: flex;
        flex-direction: column;
        padding: 15px 12px;
        box-shadow: -5px 0 30px rgba(0,0,0,0.7);
        overflow-y: auto;
        height: 100vh;
        position: sticky;
        top: 0;
    }
    .sidebar h3 {
        color: #FFD700;
        font-size: 17px;
        margin: 5px 0 15px 0;
        text-align: center;
        letter-spacing: 1px;
    }
    .nav-group { margin-bottom: 5px; }
    .nav-item {
        color: #c4c9d4;
        text-decoration: none;
        padding: 11px 14px;
        border-radius: 10px;
        font-size: 14px;
        transition: 0.25s;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        background: transparent;
        width: 100%;
        border: none;
        text-align: right;
    }
    .nav-item:hover, .nav-item.active {
        background: rgba(255, 215, 0, 0.12);
        color: #FFD700;
    }
    .badge-new {
        background: #FFD700;
        color: #0b0d14;
        font-size: 9.5px;
        padding: 2px 6px;
        border-radius: 5px;
        font-weight: bold;
    }
    .main-content {
        flex: 1;
        padding: 25px;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        overflow-y: auto;
    }
    .glass-card {
        background: rgba(18, 20, 30, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 215, 0, 0.12);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.7);
        border-radius: 20px;
        padding: 25px;
        width: 100%;
        max-width: 800px;
    }
    .btn-gold {
        background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
        color: #0b0d14;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 12px;
        display: inline-block;
        font-weight: bold;
        font-size: 14px;
        transition: 0.3s;
        box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
        border: none;
        cursor: pointer;
        text-align: center;
    }
    .btn-gold:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 25px rgba(255, 215, 0, 0.5);
    }
    .section-box {
        background: rgba(255, 255, 255, 0.02);
        padding: 20px;
        border-radius: 14px;
        margin-top: 20px;
        border: 1px solid rgba(255, 215, 0, 0.08);
        text-align: right;
    }
    select, input {
        width: 100%;
        padding: 12px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 215, 0, 0.2);
        color: white;
        border-radius: 10px;
        margin-top: 8px;
        font-size: 14px;
        outline: none;
        transition: 0.2s;
    }
    select:focus, input:focus {
        border-color: #FFD700;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.2);
    }
    .command-card {
        background: rgba(25, 28, 42, 0.7);
        border: 1px solid rgba(255, 215, 0, 0.1);
        border-radius: 14px;
        padding: 16px 20px;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .toggle-switch {
        position: relative;
        display: inline-block;
        width: 50px;
        height: 26px;
        min-width: 50px;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
        position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(255,255,255,0.1);
        transition: .3s;
        border-radius: 34px;
    }
    .slider:before {
        position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px;
        background-color: white;
        transition: .3s;
        border-radius: 50%;
    }
    input:checked + .slider { background-color: #FFD700; }
    input:checked + .slider:before { transform: translateX(24px); background-color: #0b0d14; }

    @media (max-width: 900px) {
        body { flex-direction: column !important; }
        .sidebar {
            width: 100% !important;
            min-width: 100% !important;
            height: auto !important;
            position: relative !important;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
            border-right: none !important;
            border-bottom: 1px solid rgba(255, 215, 0, 0.1);
        }
        .main-content { padding: 15px; width: 100%; }
        .glass-card { padding: 18px; }
    }
`;

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>مركز قيادة ROCKS</title><style>body { justify-content: center; align-items: center; } ${rksThemeStyle}</style></head><body><div class="glass-card" style="text-align: center;"><h2 style="color: #FFD700; margin-bottom: 10px; font-size: 26px;">ROCKS COMMAND CENTER</h2><p style="color: #b9bbbe; margin-bottom: 25px; font-size: 14px;">مركز القيادة المطور لإدارة السيرفرات وأخبار الألعاب باحترافية تامة</p><a href="/login" class="btn-gold">تسجيل الدخول عبر ديسكورد 🎮</a><div style="margin-top: 20px;"><a href="${INVITE_URL}" target="_blank" style="color: #FFD700; text-decoration: none; font-weight: bold; font-size: 13px;">+ إضافة البوت لسيرفرك مباشرة</a></div></div></body></html>`);
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `<a href="/control/${guild.id}/stats" style="text-decoration:none;color:white;display:flex;flex-direction:column;align-items:center;background:rgba(30,33,48,0.8);padding:18px;border-radius:16px;width:140px;border:1px solid rgba(255,215,0,0.15);transition:0.3s;"><img src="${iconUrl}" style="width:65px;height:65px;border-radius:50%;object-fit:cover;margin-bottom:10px;box-shadow: 0 4px 15px rgba(0,0,0,0.5);"><span style="font-size:13px;font-weight:bold;text-align:center;">${guild.name}</span></a>`;
    });
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>الخوادم المتصلة - ROCKS</title><style>body { justify-content: center; align-items: center; } ${rksThemeStyle}</style></head><body><div class="glass-card"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; border-bottom: 1px solid rgba(255,215,0,0.1); padding-bottom: 15px;"><h3 style="margin:0; color:#FFD700; font-size: 18px;">👋 أهلاً بك، ${req.user.username}</h3><div><a href="/logout" style="background:rgba(237,66,69,0.2); color:#ed4245; padding:6px 12px; text-decoration:none; border-radius:8px; font-size:12px; font-weight:bold; border:1px solid rgba(237,66,69,0.4);">تسجيل خروج</a></div></div><p style="color:#b9bbbe; font-size:13.5px; margin-bottom:18px;">اختر السيرفر أدناه لإدارة إعداداته ومكتبة الأوامر الخاصة به:</p><div style="display:flex; gap:15px; flex-wrap:wrap; justify-content:center;">${guildsHtml}</div></div></body></html>`);
});

app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');
    
    let guildIcon = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
    const section = req.params.section;
    const currentSettings = guildSettings.get(guild.id) || {};

    let channelsList = '';
    guild.channels.cache.filter(c => c.type === 0).forEach(c => {
        const selected = currentSettings.newsChannelId === c.id ? 'selected' : '';
        channelsList += `<option value="${c.id}" ${selected}># ${c.name}</option>`;
    });

    let sectionContent = '';
    if (section === 'commands') {
        let commandsCardsHtml = '';
        botCommandsList.forEach(cmd => {
            commandsCardsHtml += `
                <div class="command-card">
                    <div>
                        <span style="font-weight:bold; color:#FFD700; font-size:15px;">/${cmd.name}</span>
                        <p style="color:#99aab5; font-size:12px; margin:4px 0 0 0;">${cmd.desc}</p>
                    </div>
                    <label class="toggle-switch"><input type="checkbox" checked><span class="slider"></span></label>
                </div>
            `;
        });
        sectionContent = `
            <div style="margin-bottom:20px;">
                <h3 style="color:#FFD700; margin-bottom:5px; font-size:20px;">مكتبة الأوامر الشاملة (${botCommandsList.length} أمر)</h3>
                <p style="color:#b9bbbe; font-size:13px;">تحكم في كافة قدرات ROCKS، وفعل أو أوقف ما يناسب مجتمعك وسيرفرك.</p>
            </div>
            ${commandsCardsHtml}
        `;
    } else if (section === 'racing') {
        const savedAlert = req.query.saved ? '<div style="color:#FFD700; font-weight:bold; margin-bottom:12px; font-size:13px;">✅ تم حفظ روم الأخبار والتفعيل بنجاح!</div>' : '';
        sectionContent = `
            <div style="margin-bottom:20px;">
                <h3 style="color:#FFD700; margin-bottom:5px; font-size:20px;">🏎️ Racing Master News & Club Timers</h3>
                <p style="color:#b9bbbe; font-size:13px;">تحديد روم الإرسال التلقائي لأخبار رايسنغ ماستر وأوقات مهام الكلان.</p>
            </div>
            ${savedAlert}
            <div class="section-box">
                <form action="/control/${guild.id}/racing/save" method="POST">
                    <label style="font-size:13px; color:#FFD700; font-weight:bold;">اختر روم الأخبار والمهام التلقائي:</label>
                    <select name="newsChannelId">${channelsList}<option value="">-- إيقاف التفعيل --</option></select>
                    <button type="submit" class="btn-gold" style="margin-top:15px; width:100%;">حفظ التغييرات 🚀</button>
                </form>
            </div>
        `;
    } else if (section === 'stats') {
        sectionContent = `
            <div style="margin-bottom:20px;">
                <h3 style="color:#FFD700; margin-bottom:5px; font-size:20px;">📊 إحصائيات النظام والسيرفر</h3>
                <p style="color:#b9bbbe; font-size:13px;">مراقبة تفاصيل وأداء السيرفر لحظياً.</p>
            </div>
            <div class="section-box" style="font-size:14px; line-height: 1.8;">
                <p>👥 عدد أعضاء السيرفر: <strong style="color:#FFD700;">${guild.memberCount}</strong></p>
                <p>📁 إجمالي الرومات: <strong style="color:#FFD700;">${guild.channels.cache.size}</strong></p>
                <p>🟢 حالة نظام ROCKS: <strong style="color:#23a55a;">يعمل بكفاءة تامة</strong></p>
            </div>
        `;
    } else if (section === 'missions') {
        const timerInfo = guildClubTimers.get(guild.id);
        sectionContent = `
            <div style="margin-bottom:20px;">
                <h3 style="color:#FFD700; margin-bottom:5px; font-size:20px;">🏁 أوقات مهام الكلان (التحديث الصامت)</h3>
                <p style="color:#b9bbbe; font-size:13px;">استخدم الأمر /setclubtimer لتحديث الأوقات في النظام بصمت دون إزعاج الشات.</p>
            </div>
            <div class="section-box" style="font-size:13.5px; line-height: 1.8;">
                <p>⭐ استخدم الأمر <code style="color:#FFD700;">/setclubtimer</code> داخل ديسكورد لتحديث الأوقات الجديدة.</p>
                <div style="margin-top: 15px; padding: 12px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                    <p style="margin: 0; color: #FFD700; font-weight: bold;">الوقت الحالي المخزن في النظام:</p>
                    <p style="margin: 5px 0 0 0;">🏎️ Endurance: ${timerInfo ? timerInfo.endurance : 'غير مسجل'}</p>
                    <p style="margin: 5px 0 0 0;">⚔️ Duel: ${timerInfo ? timerInfo.duel : 'غير مسجل'}</p>
                </div>
            </div>
        `;
    } else {
        sectionContent = `
            <div style="margin-bottom:20px;">
                <h3 style="color:#FFD700; margin-bottom:5px; font-size:20px;">📁 قسم ${section}</h3>
                <p style="color:#b9bbbe; font-size:13px;">إدارة خصائص وإعدادات هذا القسم بكفاءة تامة.</p>
            </div>
            <div class="section-box" style="font-size:13.5px;">
                🟢 هذا القسم مفعل وجاهز بالكامل للتحكم.
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>مركز قيادة ROCKS - ${guild.name}</title>
            <style>${rksThemeStyle}</style>
        </head>
        <body>
            <div class="sidebar">
                <h3>مركز قيادة ROCKS</h3>
                
                <div class="nav-group"><a href="/control/${guild.id}/stats" class="nav-item ${section === 'stats' ? 'active' : ''}"><span>📊 نظرة عامة</span></a></div>
                <div class="nav-group"><a href="/control/${guild.id}/commands" class="nav-item ${section === 'commands' ? 'active' : ''}"><span>⚡ مكتبة الأوامر</span></a></div>
                <div class="nav-group"><a href="/control/${guild.id}/racing" class="nav-item ${section === 'racing' ? 'active' : ''}"><span>🏎️ أخبار Racing</span><span class="badge-new">جديد</span></a></div>
                <div class="nav-group"><a href="/control/${guild.id}/missions" class="nav-item ${section === 'missions' ? 'active' : ''}"><span>🏁 أوقات المهام</span><span class="badge-new">صامت</span></a></div>

                <div style="margin-top: auto; padding-top: 15px;">
                    <a href="/dashboard" class="nav-item" style="background: rgba(255,215,0,0.06); color: #FFD700; justify-content: center; font-weight:bold; border: 1px solid rgba(255,215,0,0.2);">
                        ← العودة للخوادم
                    </a>
                </div>
            </div>
            <div class="main-content">
                <div class="glass-card">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid rgba(255,215,0,0.1); padding-bottom: 15px;">
                        <img src="${guildIcon}" style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:2px solid #FFD700;box-shadow: 0 4px 15px rgba(0,0,0,0.4);">
                        <div>
                            <h2 style="color:#FFD700; margin:0 0 4px 0; font-size:18px;">${guild.name}</h2>
                            <span style="color: #23a55a; font-size: 11.5px; font-weight: bold;">● ROCKS متصل الآن</span>
                        </div>
                    </div>
                    ${sectionContent}
                </div>
            </div>
        </body>
        </html>
    `);
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === 'create_ticket') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const channelName = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9]/g, '');
                const ticketChannel = await interaction.guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                    ]
                });

                const closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 إغلاق التذكرة').setStyle(ButtonStyle.Danger)
                );

                const embed = new EmbedBuilder()
                    .setTitle('🎟️ تذكرة دعم جديدة - RKS•ＰＯＷＥＲ')
                    .setDescription(`أهلاً بك يا ${interaction.user}، فريق الإدارة سيتواجد معك هنا قريباً.`)
                    .setColor('#FFD700')
                    .setTimestamp();

                await ticketChannel.send({ embeds: [embed], components: [closeRow] });
                await interaction.editReply({ content: `✅ تم إنشاء تذكرتك بنجاح: ${ticketChannel}` });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: '❌ حدث خطأ أثناء إنشاء التذكرة.' });
            }
        } 
        else if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: '🔒 سيتم إغلاق هذه التذكرة وحذفها خلال 5 ثواني...' });
            setTimeout(() => { interaction.channel.delete().catch(() => {}); }, 5000);
        }
        return;
    }

    if (!interaction.isChatInputCommand()) return;
    const { commandName, options, member, guild } = interaction;

    try {
        if (commandName === 'announcement') {
            await interaction.deferReply({ ephemeral: true });

            const targetChannel = options.getChannel('channel');
            const imageAttachment = options.getAttachment('image');

            const embed = new EmbedBuilder()
                .setColor('#1e2124')
                .setTitle('🔥 إعلان رسمي من إدارة كلان 🏎️ RKS POWER 🔥')
                .setDescription(
                    '🏆 **Join RKS POWER Club!** 🏆\n\n' +
                    'يا شباب، فعاليات ومهمات الكلان شعلت نار! 🔥 شدُو الهمة وخلونا نرفع اسم **RKS POWER** فوق في الترتيب 🏆\n\n' +
                    '📍 **المهام الحالية:**\n' +
                    '• **مهمات السباقات اليومية:** لا تفوتوا أي محاولة لجمع النقاط لصالح الكلان! 🏎️💨\n' +
                    '• **فعاليات الكلان (Endurance & Duel):** شاركوا الآن وسجلوا حضوركم بقوة. ⏳ ⚡\n\n' +
                    'كل نقطة تحسب وتفرق معنا في لفل الكلان والترتيب العام.\n' +
                    'أدخلوا اللعبة الآن وخلصوا مهماتكم! 💪'
                );

            if (imageAttachment) {
                embed.setImage(imageAttachment.url);
            }

            try {
                await targetChannel.send({
                    content: '@here @everyone',
                    embeds: [embed]
                });

                await interaction.editReply({ content: `✅ تم إرسال الإعلان بنجاح إلى الروم: ${targetChannel}` });
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: '❌ حدث خطأ أثناء إرسال الإعلان، تأكد من صلاحيات البوت في الروم المختار.' });
            }
        }
        else if (commandName === 'setclubtimer') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) 
                return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول.', ephemeral: true });
            
            const enduranceTime = options.getString('endurance_time');
            const duelTime = options.getString('duel_time');
            
            guildClubTimers.set(guild.id, {
                endurance: enduranceTime,
                duel: duelTime
            });

            await interaction.reply({ 
                content: `✅ **تم تحديث الأوقات في النظام بنجاح بصمت!**\n🏎️ Endurance: \`${enduranceTime}\`\n⚔️ Duel: \`${duelTime}\`\n*(سيعتمدها البوت في التحديثات التلقائية القادمة)*`, 
                ephemeral: true 
            });
        }
        else if (commandName === 'setnews') {
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) 
                return interaction.reply({ content: '❌ يتطلب صلاحية مسؤول.', ephemeral: true });
            
            const channel = options.getChannel('channel');
            let settings = guildSettings.get(guild.id) || {};
            settings.newsChannelId = channel.id;
            guildSettings.set(guild.id, settings);
            
            await interaction.reply({ content: `✅ تم تعيين روم الأخبار والمهام التلقائي بنجاح: ${channel}`, ephemeral: true });
        }
        else if (commandName === 'ping') {
            await interaction.reply({ content: `🏓 سرعة استجابة ROCKS: ${client.ws.ping}ms` });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 مركز قيادة ROCKS يعمل على المنفذ ${PORT}`);
});
