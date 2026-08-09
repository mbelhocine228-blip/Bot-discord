require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cron = require('node-cron');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running 24/7!\n');
});
server.listen(process.env.PORT || 3000);

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent 
    ] 
});

const genAI = new GoogleGenerativeAI("AQ.Ab8RN6IsPcWQliXBObUFg46AAFaOXAWltu_qYrGfFK_5at9t0w");

let lastNewsTime = "لم يتم النشر بعد منذ تشغيل البوت";

const commands = [
    new SlashCommandBuilder().setName('help').setDescription('قائمة الأوامر المتاحة'),
    new SlashCommandBuilder().setName('status').setDescription('فحص حالة البوت'),
    new SlashCommandBuilder().setName('news-status').setDescription('مراقبة حالة النشر التلقائي للأخبار'),
    new SlashCommandBuilder()
        .setName('ai')
        .setDescription('اسأل الذكاء الاصطناعي عن أي شيء')
        .addStringOption(option => option.setName('question').setDescription('سؤالك').setRequired(true)),
    new SlashCommandBuilder()
        .setName('racing-master')
        .setDescription('استشارات لعبة Racing Master')
        .addStringOption(option => option.setName('query').setDescription('سؤالك عن اللعبة').setRequired(true)),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('مسح الرسائل')
        .addIntegerOption(option => option.setName('count').setDescription('العدد').setRequired(true)),
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('إرسال رسالة')
        .addStringOption(option => option.setName('message').setDescription('النص').setRequired(true)),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('طرد عضو')
        .addUserOption(option => option.setName('target').setDescription('العضو').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('حظر عضو')
        .addUserOption(option => option.setName('target').setDescription('العضو').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('السبب')),
    new SlashCommandBuilder()
        .setName('unban')
        .setDescription('فك الحظر')
        .addStringOption(option => option.setName('userid').setDescription('أيدي العضو').setRequired(true)),
    new SlashCommandBuilder().setName('announce-now').setDescription('نشر إعلان فوري')
].map(command => command.toJSON());

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    } catch (error) {
        console.error(error);
    }

    cron.schedule('*/20 * * * *', () => {
        const targetChannelId = '1534368094888398978'; 
        const channel = client.channels.cache.get(targetChannelId);
        if (channel) {
            const newsList = [
                "📢 **أخبار Racing Master:** ترقبوا أحدث الفعاليات وتحديثات السيارات القادمة في اللعبة!",
                "🏎️ **مفاجآت Racing Master:** هل أنت مستعد للسباق القادم؟ تجهّز لتحديات ومسابقات كبرى هذا الأسبوع!",
                "🔥 **تحديثات اللعبة:** تابع معنا أحدث أخبار وتكتيكات الاحتراف في اللعبة لتكون الأول دائماً!"
            ];
            const randomNews = newsList[Math.floor(Math.random() * newsList.length)];
            channel.send(randomNews);
            lastNewsTime = new Date().toLocaleTimeString();
        }
    });
});

async function askAI(promptText) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent([
            { text: "أنت مساعد ذكي ومحترف. أجب عن هذا السؤال بوضوح وباللغة العربية وبأسلوب الذكاء الاصطناعي: " + promptText }
        ]);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error(error);
        return "عذراً، حدث خطأ في الرد. حاول مرة أخرى.";
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'help') {
        await interaction.reply({ content: '🛠️ **الأوامر:** `/ai` للذكاء الاصطناعي، `/racing-master` للعبة، وباقي أوامر الإدارة.', ephemeral: true });
    } 
    else if (commandName === 'status') {
        await interaction.reply({ content: '🟢 البوت يعمل بكفاءة!', ephemeral: true });
    }
    else if (commandName === 'news-status') {
        await interaction.reply({ content: `📡 آخر نشر: ${lastNewsTime}`, ephemeral: true });
    }
    else if (commandName === 'ai' || commandName === 'racing-master') {
        await interaction.deferReply();
        const query = interaction.options.getString('question') || interaction.options.getString('query');
        const answer = await askAI(query);
        await interaction.editReply(answer);
    }
    else if (commandName === 'clear') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return interaction.reply({ content: '❌ ليس لديك صلاحية!', ephemeral: true });
        const count = interaction.options.getInteger('count');
        await interaction.channel.bulkDelete(count, true).catch(() => {});
        await interaction.reply({ content: `✅ تم مسح ${count} رسالة.`, ephemeral: true });
    }
    else if (commandName === 'say') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return.reply({ content: '❌ للمشرفين!', ephemeral: true });
        await interaction.channel.send(interaction.options.getString('message'));
        await interaction.reply({ content: '✅ تم الإرسال.', ephemeral: true });
    }
    else if (commandName === 'kick') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return;
        const target = interaction.options.getUser('target');
        await interaction.guild.members.kick(target.id);
        await interaction.reply(`👢 تم طرد ${target.tag}.`);
    }
    else if (commandName === 'ban') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
        const target = interaction.options.getUser('target');
        await interaction.guild.members.ban(target.id);
        await interaction.reply(`🔨 تم حظر ${target.tag}.`);
    }
    else if (commandName === 'unban') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
        await interaction.guild.members.unban(interaction.options.getString('userid'));
        await interaction.reply(`🔓 تم فك الحظر.`);
    }
    else if (commandName === 'announce-now') {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        await interaction.channel.send("🚨 **إعلان رسمي:** ترقبوا أقوى الفعاليات والمسابقات في السيرفر الآن!");
        await interaction.reply({ content: '✅ تم النشر.', ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.mentions.has(client.user)) {
        const cleanMessage = message.content.replace(`<@!${client.user.id}>`, '').replace(`<@${client.user.id}>`, '').trim();
        if (cleanMessage.length > 0) {
            await message.channel.sendTyping();
            const replyText = await askAI(cleanMessage);
            message.reply(replyText);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
