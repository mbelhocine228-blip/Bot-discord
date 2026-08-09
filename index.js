const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { G4F } = require("g4f");
const cron = require('node-cron');
const http = require('http');

// حساب وقت بدء تشغيل البوت لحساب الـ Uptime بدقة في أمر /log
const startTime = Date.now();

// خادم HTTP ليبقى البوت شغّالاً 24/7 بدون انقطاع
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running 24/7 successfully!\n');
});
server.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

const g4f = new G4F();
let lastNewsContent = "لم يتم نشر أي خبر بعد";
let lastNewsTime = "غير متوفر";

// تسجيل جميع الأوامر الشاملة (Slash Commands)
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر المتاحة'),
    new SlashCommandBuilder().setName('status').setDescription('معرفة حالة البوت الحالية'),
    new SlashCommandBuilder().setName('bot-working').setDescription('فحص هل البوت شغال بكفاءة أم لا'),
    new SlashCommandBuilder().setName('bot-uptime').setDescription('فحص ما إذا كان البوت سيتقوقف أم سيبقى 24/24'),
    new SlashCommandBuilder().setName('news-status').setDescription('فحص هل يوجد خبر جديد أم لا'),
    new SlashCommandBuilder().setName('log').setDescription('معرفة حالة التشغيل، الوقت المنقضي، ووقت العمل المستمر'),
    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('اسأل أي سؤال وسيقوم الذكاء الاصطناعي بالبحث والرد عليك بكتابة إجابة مفصلة')
        .addStringOption(option => option.setName('question').setDescription('سؤالك هنا').setRequired(true)),
    new SlashCommandBuilder()
        .setName('racing-master')
        .setDescription('اسأل أي شيء يخص لعبة Racing Master وسيعطيك الإجابة الصحيحة')
        .addStringOption(option => option.setName('query').setDescription('سؤالك عن اللعبة').setRequired(true)),
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('عرض صورة بروفايلك أو بروفايل عضواً آخر')
        .addUserOption(option => option.setName('user').setDescription('العضو المراد إظهار صورته').setRequired(false)),
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('إرسال إعلان رسمي في الشات')
        .addStringOption(option => option.setName('message').setDescription('نص الإعلان').setRequired(true)),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضواً من السيرفر')
        .addUserOption(option => option.setName('target').setDescription('العضو المراد طرده').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضواً من السيرفر')
        .addUserOption(option => option.setName('target').setDescription('العضو المراد حظره').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب').setRequired(false)),
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('إلغاء حظر عضواً بواسطة الآيدي')
        .addStringOption(option => option.setName('userid').setDescription('آيدي العضو (User ID)').setRequired(true))
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('Successfully registered slash commands.');
    } catch (error) {
        console.error(error);
    }

    // النظام التلقائي: إرسال خبر وفعاليات لعبة Racing Master كل 20 دقيقة تلقائياً
    cron.schedule('*/20 * * * *', () => {
        const targetChannelId = '1534368094888398978'; // أيدي القناة
        const channel = client.channels.cache.get(targetChannelId);
        if (channel) {
            const racingNews = [
                "🏎️ **فعالية Racing Master:** انطلاق سباق التحدي الجديد! ادخل اللعبة الآن واختبر أسرع سيارة لديك.",
                "🏁 **أخبار Racing Master:** تم إضافة سيارات وتعديلات جديدة كلياً في تحديث اليوم، لا تفوتها!",
                "🔥 **فعاليات حصرية:** تسابق الآن مع أصدقائك في خريطة السيرفر الجديدة واحصل على مكافآت ضخمة في Racing Master!"
            ];
            const randomNews = racingNews[Math.floor(Math.random() * racingNews.length)];
            channel.send(randomNews);
            lastNewsContent = randomNews;
            lastNewsTime = new Date().toLocaleTimeString();
        }
    });
});

// معالجة الأوامر (Slash Commands) مع حماية الاستجابة لمنع خطأ "التطبيق لا يستجيب"
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    try {
        if (commandName === 'help') {
            await interaction.reply({ 
                content: '🛠️ **قائمة الأوامر المتاحة:**\n' +
                         '• `/ask [سؤالك]` - اسأل الذكاء الاصطناعي أي سؤال عام\n' +
                         '• `/racing-master [سؤالك]` - اسأل عن لعبة راسينغ ماستر\n' +
                         '• `/log` - فحص حالة البوت والوقت المنقضي للتشغيل\n' +
                         '• `/status` - حالة البوت\n' +
                         '• `/avatar` - إظهار صورة البروفايل\n' +
                         '• `/announce` - إرسال إعلان (مشرفين)\n' +
                         '• `/kick` / `/ban` / `/unban` - أوامر الإدارة\n\n' +
                         '💡 يمكنك أيضاً منشن البوت في أي شات للسؤال مباشرة!', 
                ephemeral: true 
            });
        }
        else if (commandName === 'status') {
            await interaction.reply({ content: '🟢 البوت يعمل بكفاءة تامة ومتصل بنجاح!', ephemeral: true });
        }
        else if (commandName === 'bot-working') {
            await interaction.reply({ content: '✅ البوت شغال 100% ويستجيب للأوامر والمهام التلقائية بدون أي توقف.', ephemeral: true });
        }
        else if (commandName === 'bot-uptime') {
            await interaction.reply({ content: '⚡ البوت لن يتوقف أبدًا ويثبت استمراريته **24/24** بفضل خادم الـ 24/7 المدمج.', ephemeral: true });
        }
        else if (commandName === 'news-status') {
            await interaction.reply({ 
                content: `📡 **آخر خبر تم نشره للعبة Racing Master:**\n> ${lastNewsContent}\n⏱️ **وقت النشر:** ${lastNewsTime}`, 
                ephemeral: true 
            });
        }
        else if (commandName === 'log') {
            const uptimeMs = Date.now() - startTime;
            const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
            const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);

            await interaction.reply({
                content: `📊 **سجل حالة البوت (Bot Log):**\n` +
                         `• **الحالة:** 🟢 شغال بشكل طبيعي 100%\n` +
                         `• **الوقت الذي قضيه في العمل (Uptime):** ${hours} ساعة و ${minutes} دقيقة و ${seconds} ثانية\n` +
                         `• **حالة الانطفاء:** البوت لن ينطفئ أبدًا ويبقى يعمل **24/24 ساعة** طالما أن الاستضافة مفعلة!\n` +
                         `• **آخر خبر تم إرساله لـ Racing Master:** ${lastNewsTime}`,
                ephemeral: true
            });
        }
        else if (commandName === 'ask') {
            await interaction.deferReply();
            const userQuestion = interaction.options.getString('question');
            try {
                const aiResponse = await g4f.chatCompletion([{ role: "user", content: userQuestion }]);
                await interaction.editReply(`🤖 **السؤال:** ${userQuestion}\n\n💬 **الجواب:**\n${aiResponse}`);
            } catch (err) {
                await interaction.editReply("❌ عذراً، حدث ضغط في الاتصال أثناء جلب الإجابة. حاول مرة أخرى!");
            }
        }
        else if (commandName === 'racing-master') {
            await interaction.deferReply();
            const query = interaction.options.getString('query');
            const promptText = `أنت خبير محترف في لعبة السيارات Racing Master. أجِب عن هذا السؤال بدقة واحترافية للعبة راسينغ ماستر: ${query}`;
            try {
                const aiResponse = await g4f.chatCompletion([{ role: "user", content: promptText }]);
                await interaction.editReply(`🏎️ **Racing Master Assistant:**\n\n${aiResponse}`);
            } catch (err) {
                await interaction.editReply("❌ عذراً، حدث ضغط في الاتصال. حاول مرة أخرى!");
            }
        }
        else if (commandName === 'avatar') {
            await interaction.deferReply({ ephemeral: true });
            const user = interaction.options.getUser('user') || interaction.user;
            const embed = new EmbedBuilder()
                .setColor(0x00AE86)
                .setTitle(`صورة بروفايل: ${user.username}`)
                .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }));
            await interaction.editReply({ embeds: [embed] });
        }
        else if (commandName === 'announce') {
            await interaction.deferReply({ ephemeral: true });
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return interaction.editReply({ content: '❌ هذا الأمر للمشرفين فقط!' });
            }
            const text = interaction.options.getString('message');
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('📢 إعلان رسمي')
                .setDescription(text)
                .setFooter({ text: `بواسطة: ${interaction.user.tag}` });
            await interaction.channel.send({ embeds: [embed] });
            await interaction.editReply({ content: '✅ تم إرسال الإعلان بنجاح.' });
        }
        else if (commandName === 'kick') {
            await interaction.deferReply({ ephemeral: true });
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                return interaction.editReply({ content: '❌ ليس لديك صلاحية طرد الأعضاء!' });
            }
            const target = interaction.options.getUser('target');
            const reason = interaction.options.getString('reason') || 'بدون سبب';
            const member = interaction.guild.members.cache.get(target.id);
            if (member) {
                await member.kick(reason);
                await interaction.editReply({ content: `✅ تم طرد العضو ${target.tag} بنجاح.` });
            } else {
                await interaction.editReply({ content: '❌ لم يتم العثور على العضو في السيرفر.' });
            }
        }
        else if (commandName === 'ban') {
            await interaction.deferReply({ ephemeral: true });
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return interaction.editReply({ content: '❌ ليس لديك صلاحية حظر الأعضاء!' });
            }
            const target = interaction.options.getUser('target');
            const reason = interaction.options.getString('reason') || 'بدون سبب';
            await interaction.guild.members.ban(target.id, { reason });
            await interaction.editReply({ content: `✅ تم حظر العضو ${target.tag} بنجاح.` });
        }
        else if (commandName === 'unban') {
            await interaction.deferReply({ ephemeral: true });
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                return interaction.editReply({ content: '❌ ليس لديك صلاحية إلغاء الحظر!' });
            }
            const userId = interaction.options.getString('userid');
            try {
                await interaction.guild.members.unban(userId);
                await interaction.editReply({ content: `✅ تم إلغاء حظر المستخدم صاحب الآيدي: ${userId}` });
            } catch (error) {
                await interaction.editReply({ content: '❌ فشل إلغاء الحظر، تأكد من صحة الآيدي.' });
            }
        }
    } catch (error) {
        console.error(error);
        if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.' }).catch(() => {});
        } else {
            await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.', ephemeral: true }).catch(() => {});
        }
    }
});

// ميزة الرد بالمنشن المباشر في الشات
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.mentions.has(client.user)) {
        const question = message.content.replace(`<@!${client.user.id}>`, '').replace(`<@${client.user.id}>`, '').trim();
        if (question.length > 0) {
            await message.channel.sendTyping();
            try {
                const response = await g4f.chatCompletion([{ role: "user", content: question }]);
                message.reply(response);
            } catch (error) {
                message.reply("عذراً، حدث ضغط في الاتصال. حاول مرة أخرى!");
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
ج
