import discord
from discord.ext import commands, tasks
import os
from dotenv import load_dotenv
import openai
import random
import aiohttp
from datetime import datetime

load_dotenv()

# Initialize bot
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
bot = commands.Bot(command_prefix="/", intents=intents)

# Setup OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

# Racing Master news storage
last_news = None

# ============= NEWS TASK =============
@tasks.loop(minutes=20)
async def send_racing_news():
    global last_news
    channel_id = int(os.getenv("NEWS_CHANNEL_ID", "0"))
    if channel_id == 0:
        return
    
    channel = bot.get_channel(channel_id)
    if not channel:
        return
    
    try:
        # Fetch news from Racing Master Database
        async with aiohttp.ClientSession() as session:
            async with session.get("https://www.racingmasterdatabase.com/news") as resp:
                if resp.status == 200:
                    news_data = await resp.json()
                    if news_data and len(news_data) > 0:
                        news = news_data[0]
                        
                        # Translate to Arabic
                        title = news.get("title", "خبر جديد")
                        description = news.get("description", "")
                        
                        embed = discord.Embed(
                            title=f"🏎️ {title}",
                            description=description,
                            color=discord.Color.red(),
                            timestamp=datetime.now()
                        )
                        embed.set_footer(text="Racing Master News")
                        
                        await channel.send(embed=embed)
                        last_news = news
    except Exception as e:
        print(f"Error fetching news: {e}")

# ============= EVENTS =============
@bot.event
async def on_ready():
    print(f"✅ {bot.user} is online!")
    send_racing_news.start()

# ============= AI COMMAND =============
@bot.command(name="ai")
async def ai_command(ctx, *, question):
    """AI powered by OpenAI GPT"""
    async with ctx.typing():
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "أنت مساعد ذكي جداً. رد باللغة العربية إذا كان السؤال بالعربية."},
                    {"role": "user", "content": question}
                ],
                max_tokens=500
            )
            
            answer = response.choices[0].message.content
            
            # Split long messages
            if len(answer) > 2000:
                for i in range(0, len(answer), 2000):
                    await ctx.send(answer[i:i+2000])
            else:
                embed = discord.Embed(
                    title="🤖 AI Response",
                    description=answer,
                    color=discord.Color.blue()
                )
                await ctx.send(embed=embed)
        except Exception as e:
            await ctx.send(f"❌ خطأ: {str(e)}")

# ============= NEWS COMMAND =============
@bot.command(name="news")
async def news_command(ctx):
    """Get latest Racing Master news"""
    global last_news
    
    if last_news:
        embed = discord.Embed(
            title=f"🏎️ {last_news.get('title')}",
            description=last_news.get('description'),
            color=discord.Color.red(),
            timestamp=datetime.now()
        )
        await ctx.send(embed=embed)
    else:
        await ctx.send("❌ لا توجد أخبار حالياً")

# ============= GAMES COMMAND =============
class GameView(discord.ui.View):
    def __init__(self):
        super().__init__()
    
    @discord.ui.button(label="🎲 Dice", style=discord.ButtonStyle.primary)
    async def dice_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        result = random.randint(1, 6)
        await interaction.response.send_message(f"🎲 لقيت **{result}**!", ephemeral=True)
    
    @discord.ui.button(label="✂️ RPS", style=discord.ButtonStyle.primary)
    async def rps_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        choices = ["🪨 حجر", "📄 ورقة", "✂️ مقص"]
        bot_choice = random.choice(choices)
        await interaction.response.send_message(f"البوت اختار: {bot_choice}\nلعب الآن! `/rps`", ephemeral=True)
    
    @discord.ui.button(label="🃏 Flip", style=discord.ButtonStyle.primary)
    async def flip_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        result = random.choice(["رأس 🪙", "كتابة 🪙"])
        await interaction.response.send_message(f"النتيجة: **{result}**", ephemeral=True)
    
    @discord.ui.button(label="🎰 Slots", style=discord.ButtonStyle.primary)
    async def slots_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        emojis = ["🍎", "🍊", "🍋", "🍌", "🍇"]
        result = [random.choice(emojis) for _ in range(3)]
        await interaction.response.send_message(f"🎰 {' | '.join(result)}", ephemeral=True)
    
    @discord.ui.button(label="🎯 Guess", style=discord.ButtonStyle.primary)
    async def guess_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        number = random.randint(1, 100)
        await interaction.response.send_message(f"🎯 خمن رقم من 1 إلى 100!\n`/guess <رقمك>`", ephemeral=True)
    
    @discord.ui.button(label="⚔️ Fight", style=discord.ButtonStyle.danger)
    async def fight_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        power = random.randint(1, 100)
        result = "فزت! 🎉" if power > 50 else "خسرت! 😅"
        await interaction.response.send_message(f"⚔️ القوة: {power}\n{result}", ephemeral=True)
    
    @discord.ui.button(label="😂 Jokes", style=discord.ButtonStyle.success)
    async def jokes_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        jokes = [
            "ليش الدجاجة عبرت الشارع؟ عشان تصير دجاجة ✋",
            "وش أذكى حيوان؟ الحصان لأنه رباعي الأرجل! 🐴",
            "أنا ما ضحك بسهولة... بس هسا ضحكت 😂"
        ]
        await interaction.response.send_message(random.choice(jokes), ephemeral=True)

@bot.command(name="games")
async def games_command(ctx):
    """Play games!"""
    embed = discord.Embed(
        title="🎮 اختر لعبة",
        description="اضغط على الزر اللي تحب تلعب",
        color=discord.Color.purple()
    )
    await ctx.send(embed=embed, view=GameView())

# ============= MODERATION COMMANDS =============
@bot.command(name="clear")
@commands.has_permissions(manage_messages=True)
async def clear(ctx, amount: int):
    """Delete messages"""
    if amount > 100:
        await ctx.send("❌ الحد الأقصى 100 رسالة")
        return
    deleted = await ctx.channel.purge(limit=amount)
    await ctx.send(f"✅ تم حذف {len(deleted)} رسالة", delete_after=5)

@bot.command(name="ban")
@commands.has_permissions(ban_members=True)
async def ban(ctx, member: discord.Member, *, reason=None):
    """Ban a member"""
    await member.ban(reason=reason)
    await ctx.send(f"✅ تم حظر {member.mention}")

@bot.command(name="kick")
@commands.has_permissions(kick_members=True)
async def kick(ctx, member: discord.Member, *, reason=None):
    """Kick a member"""
    await member.kick(reason=reason)
    await ctx.send(f"✅ تم طرد {member.mention}")

@bot.command(name="mute")
@commands.has_permissions(moderate_members=True)
async def mute(ctx, member: discord.Member):
    """Mute a member"""
    from datetime import timedelta
    await member.timeout(timedelta(hours=1))
    await ctx.send(f"🔇 تم كتم {member.mention} لمدة ساعة")

@bot.command(name="unmute")
@commands.has_permissions(moderate_members=True)
async def unmute(ctx, member: discord.Member):
    """Unmute a member"""
    await member.timeout(None)
    await ctx.send(f"🔊 تم فك كتم {member.mention}")

# ============= INFO COMMANDS =============
@bot.command(name="ping")
async def ping(ctx):
    """Bot latency"""
    latency = bot.latency * 1000
    embed = discord.Embed(
        title="🏓 Ping",
        description=f"Latency: {latency:.0f}ms",
        color=discord.Color.green()
    )
    await ctx.send(embed=embed)

@bot.command(name="userinfo")
async def userinfo(ctx, member: discord.Member = None):
    """User information"""
    member = member or ctx.author
    embed = discord.Embed(
        title=f"👤 {member.name}",
        description=f"ID: {member.id}",
        color=member.color
    )
    embed.add_field(name="Joined", value=member.joined_at.strftime("%d/%m/%Y"))
    embed.set_thumbnail(url=member.avatar.url)
    await ctx.send(embed=embed)

@bot.command(name="serverinfo")
async def serverinfo(ctx):
    """Server information"""
    embed = discord.Embed(
        title=f"🏠 {ctx.guild.name}",
        description=f"ID: {ctx.guild.id}",
        color=discord.Color.blue()
    )
    embed.add_field(name="Members", value=ctx.guild.member_count)
    embed.add_field(name="Channels", value=len(ctx.guild.channels))
    embed.add_field(name="Roles", value=len(ctx.guild.roles))
    embed.set_thumbnail(url=ctx.guild.icon.url if ctx.guild.icon else None)
    await ctx.send(embed=embed)

@bot.command(name="avatar")
async def avatar(ctx, member: discord.Member = None):
    """Get avatar"""
    member = member or ctx.author
    embed = discord.Embed(
        title=f"🖼️ {member.name}'s Avatar",
        color=discord.Color.gold()
    )
    embed.set_image(url=member.avatar.url)
    await ctx.send(embed=embed)

# ============= HELP COMMAND =============
@bot.command(name="help")
async def help_command(ctx):
    """Show all commands"""
    embed = discord.Embed(
        title="📋 الأوامر",
        description="كل الأوامر المتاحة",
        color=discord.Color.gold()
    )
    
    embed.add_field(name="🤖 AI", value="`/ai <سؤالك>`", inline=False)
    embed.add_field(name="📰 News", value="`/news`", inline=False)
    embed.add_field(name="🎮 Games", value="`/games`", inline=False)
    
    embed.add_field(name="🛡️ Moderation", value=
        "`/clear <عدد>`\n"
        "`/ban <member>`\n"
        "`/kick <member>`\n"
        "`/mute <member>`\n"
        "`/unmute <member>`", inline=False)
    
    embed.add_field(name="ℹ️ Info", value=
        "`/ping`\n"
        "`/userinfo [member]`\n"
        "`/serverinfo`\n"
        "`/avatar [member]`", inline=False)
    
    await ctx.send(embed=embed)

# ============= RUN BOT =============
bot.run(os.getenv("DISCORD_TOKEN"))