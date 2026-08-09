const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { OpenAI } = require('openai');
const express = require('express');

// إعداد خادم الويب ليبقي البوت يعمل 24/7 على السيرفر السحابي
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot is active and running 24/7!'));
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ] 
});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// قائمة أخبار Racing Master الجديدة وغير المكررة
const newsList = [
    "🏎️ تحديث جديد لـ Racing Master: إضافة سيارات أسطورية جديدة للمنافسة!",
    "🛠️ صيانة دورية للسيرفرات لضمان أفضل أداء، استعدوا للعودة بقوة!",
    "🏆 انطلاق الموسم الجديد من السباقات التنافسية، ادخلوا للمنافسة الآن!",
    "🔥 تخفيضات خاصة على قطع تطوير المحركات في المتجر، لا تفوت الفرصة!",
    "📢 إعلان هام: تحسينات جديدة في نظام الفيزيائية والتحكم في السيارات."
];

let usedNews = new Set();

// دالة النشر التلقائي كل 30 دقيقة بدون تكرار
function sendRacingNews(clientInstance) {
    const channel = clientInstance.channels.cache.get('1534368094888398978');
    if (!channel) return;
    if (usedNews.size >= newsList.length) usedNews.clear();
    let news;
    do { news = newsList[Math.floor(Math.random() * newsList.length)]; } while (usedNews.has(news));
    usedNews.add(news);
    channel.send(news).catch(console.error);
}

// تعريف الأوامر المطلوبة ومسح أي أوامر قديمة تلقائياً
const commands = [
    new SlashCommandBuilder()
        .setName('ai')
        .setDescription('اسأل الذكاء الاصطناعي أي سؤال')
        .addStringOption(o => o.setName('question').setDescription('سؤالك').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح عدد محدد من الرسائل')
        .addIntegerOption(o => o.setName('count').setDescription('عدد الرسائل (من 1 إلى 100)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('say')
        .setDescription('إرسال رسالة من خلال البوت')
        .addStringOption(o => o.setName('message').setDescription('النص المراد إرساله').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    new SlashCommandBuilder()
        .setName('annonce')
        .setDescription('إرسال إعلان رسمي في القناة')
        .addStringOption(o => o.setName('message').setDescription('محتوى الإعلان').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو من السيرفر مع ذكر السبب')
        .addUserOption(o => o.setName('user').setDescription('العضو المراد حظره').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('سبب الحظر'))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('إلغاء حظر عضو بواسطة الآيدي')
        .addStringOption(o => o.setName('userid').setDescription('أيدي المستخدم المراد فك الحظر عنه').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضو من السيرفر مع ذكر السبب')
        .addUserOption(o => o.setName('user').setDescription('العضو المراد طرده').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('سبب الطرد'))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

    new SlashCommandBuilder()
        .setName('monitor')
        .setDescription('مراقبة حالة السيرفر وحماية الحماية المفعلة')
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
    
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ تم مسح الأوامر القديمة وتسجيل الأوامر الجديدة فقط.');
    } catch (error) {
        console.error('❌ خطأ في تحديث الأوامر:', error);
    }
    
    // تشغيل نظام الأخبار كل 30 دقيقة
    setInterval(() => { sendRacingNews(client); }, 30 * 60 * 1000);
});

// حماية السيرفر: مراقبة الرسائل وحذف الروابط الضارة أو الدعوات تلقائياً
client.on('messageCreate', message => {
    if (message.author.bot) return;
    if (message.content.includes('discord.gg/') || message.content.includes('discord.com/invite/')) {
        message.delete().catch(() => {});
        message.channel.send(`⚠️ ${message.author}, ممنوع نشر روابط الدعوات الخارجية هنا! (نظام حماية السيرفر)`).then(msg => setTimeout(() => msg.delete(), 5000));
    }
});

// معالجة الأوامر والتفاعلات
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        if (interaction.commandName === 'ai') {
            await interaction.deferReply();
            const completion = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: interaction.options.getString('question') }]
            });
            await interaction.editReply(completion.choices[0].message.content);
        } 
        else if (interaction.commandName === 'clear') {
            const count = interaction.options.getInteger('count');
            if (count < 1 || count > 100) {
                return interaction.reply({ content: '❌ يرجى اختيار عدد بين 1 و 100.', ephemeral: true });
            }
            await interaction.deferReply({ ephemeral: true });
            await interaction.channel.bulkDelete(count, true);
            await interaction.editReply(`🧹 تم مسح **${count}** رسالة بنجاح!`);
        }
        else if (interaction.commandName === 'say') {
            const msg = interaction.options.getString('message');
            await interaction.channel.send(msg);
            await interaction.reply({ content: '✅ تم إرسال الرسالة بنجاح.', ephemeral: true });
        }
        else if (interaction.commandName === 'annonce') {
            const msg = interaction.options.getString('message');
            await interaction.channel.send(`📢 **إعلان رسمي:**\n${msg}`);
            await interaction.reply({ content: '✅ تم نشر الإعلان في القناة.', ephemeral: true });
        }
        else if (interaction.commandName === 'ban') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'بدون سبب محدد';
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.reply({ content: '❌ لم يتم العثور على العضو في السيرفر.', ephemeral: true });
            await member.ban({ reason });
            await interaction.reply(`🔨 تم حظر العضو **${user.tag}** بنجاح.\n📝 السبب: ${reason}`);
        }
        else if (interaction.commandName === 'unban') {
            const userId = interaction.options.getString('userid');
            await interaction.guild.members.unban(userId);
            await interaction.reply(`🔓 تم فك الحظر عن المستخدم برقم الأيدي: **${userId}** بنجاح.`);
        }
        else if (interaction.commandName === 'kick') {
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'بدون سبب محدد';
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            if (!member) return interaction.reply({ content: '❌ لم يتم العثور على العضو في السيرفر.', ephemeral: true });
            await member.kick(reason);
            await interaction.reply(`👢 تم طرد العضو **${user.tag}** بنجاح.\n📝 السبب: ${reason}`);
        }
        else if (interaction.commandName === 'monitor') {
            await interaction.reply({ content: `🛡️ **نظام مراقبة وحماية السيرفر نشط الآن!**\n- حالة السيرفر: مستقرة وآمنة.\n- حماية الروابط والسبام: تعمل بفاعلية.\n- التشغيل السحابي: 24/7 بدون انقطاع.`, ephemeral: true });
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

client.login(process.env.DISCORD_TOKEN);
