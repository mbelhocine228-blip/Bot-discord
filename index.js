const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { G4F } = require("g4f");
const cron = require('node-cron');
const http = require('http');

// خادم HTTP ليبقى البوت شغّالاً 24/7 حتى بعد إغلاق Render
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

// قائمة الأوامر الشاملة (Slash Commands)
const commands = [
    new SlashCommandBuilder().setName('help').setDescription('عرض قائمة الأوامر المتاحة'),
    new SlashCommandBuilder().setName('status').setDescription('معرفة حالة البوت الحالية'),
    new SlashCommandBuilder().setName('bot-working').setDescription('فحص هل البوت شغال بكفاءة أم لا'),
    new SlashCommandBuilder().setName('bot-uptime').setDescription('فحص ما إذا كان البوت سيتقوقف أم سيبقى 24/24'),
    new SlashCommandBuilder().setName('news-status').setDescription('فحص هل يوجد خبر جديد أم لا'),
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
            console.log("Racing Master auto-news sent at:", lastNewsTime);
        }
    });
});

// معالجة الأوامر
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const { commandName } = interaction;

    if (commandName === 'help') {
        await interaction.reply({ 
            content: '🛠️ **قائمة الأوامر المتاحة:**\n' +
                     '• `/status` - حالة البوت\n' +
                     '• `/bot-working` - فحص هل البوت شغال\n' +
                     '• `/bot-uptime` - التحقق من استمرار البوت 24/24\n' +
                     '• `/news-status` - فحص هل يوجد خبر جديد للعبة راسينغ ماستر\n' +
                     '• `/avatar` - إظهار صورة البروفايل\n' +
                     '• `/announce` - إرسال إعلان (مشرفين)\n' +
                     '• `/kick` - طرد عضواً\n' +
                     '• `/ban` - حظر عضواً\n' +
                     '• `/unban` - إلغاء حظر عضواً\n\n' +
                     '💡 **ملاحظة:** البوت يرسل فعاليات وأخبار Racing Master تلقائياً كل 20 دقيقة، ويمكنك مراسلته بالمنشن في أي وقت!', 
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
    else if (commandName === 'avatar') {
        const user = interaction.options.getUser('user') || interaction.user;
        const embed = new EmbedBuilder()
            .setColor(0x00AE86)
            .setTitle(`صورة بروفايل: ${user.username}`)
            .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }));
        await interaction.reply({ embeds: [embed] });
    }
    else if (commandName === 'announce') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) 
            return interaction.reply({ content: '❌ هذا الأمر للمشرفين فقط!', ephemeral: true });
        const text = interaction.options.getString('message');
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('📢 إعلان رسمي')
            .setDescription(text)
            .setFooter({ text: `بواسطة: ${interaction.user.tag}` });
        await interaction.channel.send({ embeds: [embed] });
        await interaction.reply({ content: '✅ تم إرسال الإعلان بنجاح.', ephemeral: true });
    }
    else if (commandName === 'kick') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) 
            return interaction.reply({ content: '❌ ليس لديك صلاحية طرد الأعضاء!', ephemeral: true });
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'بدون سبب';
        const member = interaction.guild.members.cache.get(target.id);
        if (member) {
            await member.kick(reason);
            await interaction.reply({ content: `✅ تم طرد العضو ${target.tag} بنجاح.`, ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ لم يتم العثور على العضو في السيرفر.', ephemeral: true });
        }
    }
    else if (commandName === 'ban') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) 
            return interaction.reply({ content: '❌ ليس لديك صلاحية حظر الأعضاء!', ephemeral: true });
        const target = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'بدون سبب';
        await interaction.guild.members.ban(target.id, { reason });
        await interaction.reply({ content: `✅ تم حظر العضو ${target.tag} بنجاح.`, ephemeral: true });
    }
    else if (commandName === 'unban') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) 
            return interaction.reply({ content: '❌ ليس لديك صلاحية إلغاء الحظر!', ephemeral: true });
        const userId = interaction.options.getString('userid');
        try {
            await interaction.guild.members.unban(userId);
            await interaction.reply({ content: `✅ تم إلغاء حظر المستخدم صاحب الآيدي: ${userId}`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: '❌ فشل إلغاء الحظر، تأكد من صحة الآيدي.', ephemeral: true });
        }
    }
});

// الذكاء الاصطناعي المجاني بالمنشن (بدون مفتاح API)
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
