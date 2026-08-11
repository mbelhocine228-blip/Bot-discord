const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;

const app = express();
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, // ضروري جداً لكي يعمل الترحيب بالأعضاء الجدد
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

// --- 1. إعدادات الموقع ولوحة التحكم (Dashboard & Auth) ---
app.use(express.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'rks-power-secret-key-99', 
    resave: false, 
    saveUninitialized: false 
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
    clientID: 'YOUR_CLIENT_ID',         // ضع Client ID هنا
    clientSecret: 'YOUR_CLIENT_SECRET', // ضع Client Secret هنا
    callbackURL: 'https://bot-discord-g9r5.onrender.com/callback',
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => done(null, profile)));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(obj, done));

app.get('/login', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/servers'));
app.get('/logout', (req, res) => { req.logout(() => res.redirect('/')); });

app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: Arial; text-align: center; margin-top: 50px; background: #1a1a1a; color: white; padding: 40px; border-radius: 10px; width: 500px; margin-left: auto; margin-right: auto;">
            <h1>RKS•ＰＯＷＥＲ Bot Dashboard</h1>
            <p>لوحة التحكم الرسمية لإدارة سيرفرات ديسكورد</p>
            <a href="/login" style="background: #5865F2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-top: 20px;">تسجيل الدخول عبر ديسكورد 🚀</a>
        </div>
    `);
});

app.get('/servers', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const adminServers = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8);
    
    let html = `
        <div style="font-family: Arial; padding: 30px; background: #1a1a1a; color: white; min-height: 100vh;">
            <h2>مرحباً، ${req.user.username}! اختر سيرفر للبدء في إدارته:</h2>
            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 20px;">
    `;
    
    adminServers.forEach(s => {
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

app.get('/dashboard/:guildId', (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const guildId = req.params.guildId;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    if (!guild || (guild.permissions & 0x8) !== 0x8) return res.send('غير مسموح لك بالدخول أو ليس لديك صلاحيات.');

    res.send(`
        <div style="font-family: Arial; padding: 30px; background: #1a1a1a; color: white; min-height: 100vh;">
            <h2>لوحة تحكم السيرفر: ${guild.name} ⚙️</h2>
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


// --- 2. إعداد أوامر البوت والأدوات والإدارة ---
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('فحص سرعة استجابة البوت'),
    
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('يجعل البوت يكرر رسالتك')
        .addStringOption(opt => opt.setName('message').setDescription('الرسالة').setRequired(true)),

    new SlashCommandBuilder()
        .setName('ann')
        .setDescription('نشر إعلان رسمي من البوت')
        .addStringOption(opt => opt.setName('text').setDescription('نص الإعلان').setRequired(true)),

    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('عرض صورة بروفايلك أو بروفايل عضو آخر')
        .addUserOption(opt => opt.setName('user').setDescription('العضو المراد جلب صورته').setRequired(false)),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد معين من الرسائل')
        .addIntegerOption(opt => opt.setName('count').setDescription('عدد الرسائل (من 1 إلى 100)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر')
        .addUserOption(opt => opt.setName('target').setDescription('العضو').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('السبب').setRequired(false)),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('إلغاء حظر عضو بواسطة الآيدي (ID)')
        .addStringOption(opt => opt.setName('userid').setDescription('آيدي العضو').setRequired(true)),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضو من السيرفر')
        .addUserOption(opt => opt.setName('target').setDescription('العضو').setRequired(true)),

    new SlashCommandBuilder()
        .setName('mute')
        .setDescription('إسكات (ميوت) عضو مؤقتاً')
        .addUserOption(opt => opt.setName('target').setDescription('العضو').setRequired(true))
        .addIntegerOption(opt => opt.setName('minutes').setDescription('المدة بالدقائق').setRequired(true)),

    new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('إلغاء الميوت عن عضو')
        .addUserOption(opt => opt.setName('target').setDescription('العضو').setRequired(true)),

    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر المتاحة')
].map(c => c.toJSON());

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('تم تحديث جميع الأوامر بنجاح!');
    } catch (e) { console.error(e); }
});

// --- ميزة الترحيب بالأعضاء الجدد (Welcome Message) ---
client.on('guildMemberAdd', async member => {
    // يبحث عن قناة اسمها welcome أو أول قناة نصية متاحة للإرسال فيها
    const welcomeChannel = member.guild.channels.cache.find(c => c.name.includes('welcome') || c.name.includes('الترحيب')) || 
                           member.guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(member.guild.members.me).has('SendMessages'));
    
    if (!welcomeChannel) return;

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🎉 عضو جديد انضم إلينا!')
        .setDescription(`أهلاً بك يا ${member} في سيرفر **${member.guild.name}**! نورتنا وشرفت، نتمنى لك وقتاً ممتعاً معنا. 🚀`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

    await welcomeChannel.send({ embeds: [embed] });
});

// --- تنفيذ الأوامر ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'ping') {
        await interaction.reply({ content: `Pong! 🏓 سرعة الاستجابة: ${client.ws.ping}ms`, ephemeral: true });
    } 
    else if (commandName === 'say') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) 
            return interaction.reply({ content: 'عذراً، ليس لديك صلاحية!', ephemeral: true });
        await interaction.reply({ content: 'تم الإرسال ✅', ephemeral: true });
        await interaction.channel.send(interaction.options.getString('message'));
    }
    else if (commandName === 'ann') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) 
            return interaction.reply({ content: 'هذا الأمر مخصص للإدارة فقط!', ephemeral: true });
        const embed = new EmbedBuilder().setColor(0x5865F2).setTitle('📢 إعلان رسمي').setDescription(interaction.options.getString('text')).setTimestamp();
        await interaction.reply({ content: 'تم نشر الإعلان بنجاح 📢', ephemeral: true });
        await interaction.channel.send({ embeds: [embed] });
    }
    else if (commandName === 'avatar') {
        const user = interaction.options.getUser('user') || interaction.user;
        await interaction.reply({ content: `صورة بروفايل ${user.tag}:\n${user.displayAvatarURL({ size: 1024, dynamic: true })}` });
    }
    else if (commandName === 'clear') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) 
            return interaction.reply({ content: 'ليس لديك صلاحية لإدارة الرسائل!', ephemeral: true });
        const count = interaction.options.getInteger('count');
        if (count < 1 || count > 100) return interaction.reply({ content: 'الرجاء اختيار عدد بين 1 و 100.', ephemeral: true });
        await interaction.channel.bulkDelete(count, true);
        await interaction.reply({ content: `تم مسح ${count} رسالة بنجاح 🧹`, ephemeral: true });
    }
    else if (commandName === 'ban') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية لحظر الأعضاء!', ephemeral: true });
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'بدون سبب';
        if (!target.bannable) return لا يمكنني حظر هذا العضو; // للتبسيط
        await target.ban({ reason });
        await interaction.reply({ content: `تم حظر ${target.user.tag} بنجاح. السبب: ${reason} 🔨` });
    }
    else if (commandName === 'unban') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
        const userId = interaction.options.getString('userid');
        try {
            await interaction.guild.members.unban(userId);
            await interaction.reply({ content: `تم رفع الحظر عن العضو بنجاح ✅` });
        } catch {
            await interaction.reply({ content: `تعسّر العثور على العضو أو لم يكن محظوراً.`, ephemeral: true });
        }
    }
    else if (commandName === 'kick') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية لطرد الأعضاء!', ephemeral: true });
        const target = interaction.options.getMember('target');
        if (!target.kickable) return interaction.reply({ content: 'لا يمكنني طرد هذا العضو!', ephemeral: true });
        await target.kick();
        await interaction.reply({ content: `تم طرد ${target.user.tag} من السيرفر 👢` });
    }
    else if (commandName === 'mute') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية لإسكات الأعضاء!', ephemeral: true });
        const target = interaction.options.getMember('target');
        const minutes = interaction.options.getInteger('minutes');
        try {
            await target.timeout(minutes * 60 * 1000, 'ميوت إداري');
            await interaction.reply({ content: `تم إعطاء ميوت لـ ${target.user.tag} لمدة ${minutes} دقائق 🔇` });
        } catch {
            await interaction.reply({ content: 'فشل في تطبيق الميوت.', ephemeral: true });
        }
    }
    else if (commandName === 'unmute') {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) 
            return interaction.reply({ content: 'ليس لديك صلاحية!', ephemeral: true });
        const target = interaction.options.getMember('target');
        try {
            await target.timeout(null);
            await interaction.reply({ content: `تم رفع الميوت عن ${target.user.tag} 🔊` });
        } catch {
            await interaction.reply({ content: 'فشل في إزالة الميوت.', ephemeral: true });
        }
    }
    else if (commandName === 'help') {
        await interaction.reply({ 
            content: '🛠️ **قائمة أوامر RKS•ＰＯＷＥＲ الاحترافية:**\n' +
                     '🔹 `/say` - تكرار رسالة\n🔹 `/ann` - نشر إعلان رسمي فخم\n' +
                     '🔹 `/avatar` - جلب صورة البروفايل\n🔹 `/clear` - مسح الرسائل\n' +
                     '🔹 `/ban` / `/unban` - حظر ورفع الحظر\n🔹 `/kick` - طرد عضو\n' +
                     '🔹 `/mute` / `/unmute` - إسكات ورفع الإسكات\n✨ بالإضافة إلى **ميزة الترحيب التلقائي** بالأعضاء الجدد!',
            ephemeral: true 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`اللوحة تعمل على المنفذ ${PORT}`));
client.login(process.env.DISCORD_TOKEN);
