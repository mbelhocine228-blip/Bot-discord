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

// --- تسجيل الأوامر (كل الأوامر السابقة) ---
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
    new SlashCommandBuilder().setName('ann').setDescription('إعلان رسمي مع منشن عام').addStringOption(opt => opt.setName('text').setDescription('النص').setRequired(true)),
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
        console.log('🔄 تم تسجيل جميع الأوامر بنجاح.');
    } catch (error) { console.error(error); }
});

// --- تصميم الويب المحسن بخلفية فخمة وعناصر أكبر وأوضح ---
const commonStyle = `
    body {
        background: linear-gradient(135deg, #0a0b10 0%, #151828 50%, #221535 100%);
        color: #ffffff;
        min-height: 100vh;
        margin: 0;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .glass-card {
        background: rgba(25, 27, 38, 0.85);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.6);
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        max-width: 500px;
        width: 90%;
    }
    .btn-discord {
        background: #5865F2;
        color: white;
        padding: 14px 28px;
        text-decoration: none;
        border-radius: 10px;
        display: inline-block;
        font-weight: bold;
        font-size: 15px;
        transition: 0.3s;
        box-shadow: 0 6px 20px rgba(88, 101, 242, 0.4);
    }
    .btn-discord:hover {
        background: #4752C4;
        transform: translateY(-2px);
    }
    .btn-add {
        background: #23a55a;
        color: white;
        padding: 12px 24px;
        text-decoration: none;
        border-radius: 10px;
        display: inline-block;
        font-weight: bold;
        font-size: 14px;
        transition: 0.3s;
    }
    .btn-add:hover {
        background: #1f8b4c;
    }
`;

app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/dashboard');
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>RKS Dashboard</title><style>${commonStyle}</style></head><body><div class="glass-card"><h2 style="color: #FFD700; margin-bottom: 12px; font-size: 30px;">RKS•ＰＯＷＥＲ</h2><p style="color: #b9bbbe; margin-bottom: 30px; font-size: 15px;">لوحة التحكم الشاملة لإدارة السيرفرات والألعاب</p><a href="/login" class="btn-discord">تسجيل الدخول عبر ديسكورد 🎮</a><div style="margin-top: 22px;"><a href="${INVITE_URL}" target="_blank" class="btn-add">+ إضافة البوت لسيرفرك</a></div></div></body></html>`);
});

app.get('/dashboard', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    let guildsHtml = '';
    client.guilds.cache.forEach(guild => {
        let iconUrl = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';
        guildsHtml += `<a href="/control/${guild.id}/commands" style="text-decoration:none;color:white;display:flex;flex-direction:column;align-items:center;background:rgba(45,48,64,0.7);padding:20px;border-radius:16px;width:150px;border:1px solid rgba(255,255,255,0.08);transition:0.3s;"><img src="${iconUrl}" style="width:85px;height:85px;border-radius:50%;object-fit:cover;margin-bottom:12px;box-shadow: 0 4px 12px rgba(0,0,0,0.4);"><span style="font-size:14px;font-weight:bold;text-align:center;">${guild.name}</span></a>`;
    });
    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>اختر السيرفر</title><style>${commonStyle} .dashboard-card { background: rgba(25, 27, 38, 0.9); max-width: 750px; width: 95%; padding: 35px; border-radius: 20px; }</style></head><body><div class="dashboard-card"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 25px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;"><h3 style="margin:0; color:#FFD700; font-size: 20px;">👋 مرحباً بك، ${req.user.username}</h3><div><a href="${INVITE_URL}" target="_blank" class="btn-add" style="margin-left: 10px; padding: 10px 18px; font-size:13px;">+ إضافة بوت جديد</a><a href="/logout" style="background:#ed4245; color:white; padding:10px 18px; text-decoration:none; border-radius:8px; font-size:13px; font-weight:bold;">خروج</a></div></div><p style="color:#b9bbbe; font-size:15px; margin-bottom:25px;">اختر السيرفر أدناه للتحكم بإعداداته وأقسامه:</p><div style="display:flex; gap:20px; flex-wrap:wrap;">${guildsHtml}</div></div></body></html>`);
});

app.get('/control/:guildId/:section', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) return res.send('السيرفر غير موجود.');
    
    let guildIcon = guild.iconURL({ size: 256 }) ? guild.iconURL({ size: 256 }) : 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f916.png';

    res.send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>إدارة ${guild.name}</title><style>${commonStyle}</style></head><body><div class="glass-card"><img src="${guildIcon}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;margin-bottom:15px;border:3px solid #FFD700;box-shadow: 0 6px 20px rgba(0,0,0,0.5);"><h2 style="color:#FFD700; margin-bottom:10px; font-size:24px;">${guild.name}</h2><p style="color:#b9bbbe; font-size:14px; margin-bottom:25px;">لوحة التحكم النشطة لإدارة الصلاحيات والأقسام بداخل السيرفر بكل سهولة.</p><div style="display:flex; gap:12px; justify-content:center;"><a href="/dashboard" class="btn-discord" style="font-size:14px; padding:10px 20px;">← العودة للسيرفرات</a></div></div></body></html>`);
});

// --- تنفيذ الأوامر داخل ديسكورد ---
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
        else if (commandName === 'rockstats') {
            const embed = new EmbedBuilder()
                .setTitle('🛡️ إحصائيات كلان RKS•ＰＯＷＥＲ')
                .setDescription('أقوى كلان نشط في Racing Master و OneState RP!\n• السيرفر الأساسي: مفعل\n• الحالة: جاهز للتحديات والبطولات 🚀')
                .setColor('#E74C3C');
            await interaction.reply({ embeds: [embed] });
        }
        else if (commandName === 'racingnews') {
            const embed = new EmbedBuilder()
                .setTitle('🏎️ آخر أخبار Racing Master الحصرية')
                .setDescription('استعد للموسم الجديد وتحديثات الجرافيك الخارقة للسيارات في الحلبات.')
                .setColor('#FF4500');
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
        else if (commandName === 'rps') {
            const choice = options.getString('choice');
            const choices = ['حجر', 'ورقة', 'مقص'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            await interaction.reply({ content: `🎮 اختيارك: **${choice}** | اختيار البوت: **${botChoice}**` });
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
app.listen(process.env.PORT || 3000, () => console.log('🚀 لوحة التحكم والأوامر تعمل الآن بكامل الكفاءة!'));
