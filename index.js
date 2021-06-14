require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
const DEFAULT_CHANNEL_ID = '847099887090925578';
const CHANNEL_COMMAND_STRING = "!name-bot set-channel";
const CHECK_COMMAND_STRING = "!name-bot check-names";
const HELP_COMMAND_STRING = "!name-bot help";
const UPDATE_COMMAND_STRING = "!name-bot update";

const readline = require('readline');
const fs = require('fs');
const NAUGHTY_LIST_FILE = "naughty.list";
const naughtyList = [];

let sendChannel;

bot.login(TOKEN);

// bot is ready
bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}!`);
    sendChannel = bot.channels.get(DEFAULT_CHANNEL_ID);
    loadNaughtyList();
});

// listen for incoming commands
bot.on('message', msg => {
    // make sure name-bot didn't send this message
    if (msg.member.user !== bot.user){
        // change or set the channel to send notifications to
        if (msg.content.includes(CHANNEL_COMMAND_STRING)) {
            attemptChannelChange(msg);
        } 
        // order a check of all usernames now
        if (msg.content.includes(CHECK_COMMAND_STRING)) {
            msg.channel.send("Running Naughty Check");
            runNaughtyCheck();
        } 
        // order a check of all usernames now
        if (msg.content.includes(HELP_COMMAND_STRING)) {
            printHelpMessage(msg);
        }
        // reload the list of phrases
        if (msg.content.includes(UPDATE_COMMAND_STRING)) {
            reloadNaughtyList(msg.channel);
        } 
    }
});

// listen for changes to the member (non-username)
bot.on('guildMemberUpdate', (oldMember, newMember) => {
    let found = isBadName(newMember.nickname);

    // only do something if the nickname changed and it's a bad nickname
    if (oldMember.nickname !== newMember.nickname && found){
        trySend(`ALERT! Nickname Change: **${memberIdStringify(oldMember)}** has become **${memberIdStringify(newMember)}** -- detected **\"${found}\"**`);
        console.info("detected bad change of " + found);    
    }
    else {
        console.info(`detected change: ${memberIdStringify(oldMember)} has become ${memberIdStringify(newMember)}`);    
    }
});

// listen for changes to the user
bot.on('userUpdate', (oldMember, newMember) => {
    let found = isBadName(newMember.username);

    // only do something if the username changed and it's a bad username
    if (oldMember.username !== newMember.username && found){
        trySend(`**ALERT!** Username Change: **${oldMember.username}** has become **${newMember.username}** -- detected **\"${found}\"**`);
        console.info("detected bad username change of " + found);
    }
    else {
        console.info(`detected username change:: ${oldMember.username} has become ${newMember.username}`);
    }
});

// make the username and nickname print pretty together
function memberIdStringify(memberId){
    return memberId.user.username + " (" + memberId.nickname + ")";
}

// get the channel id from the incoming message string
function getNewChannelId(string){
    return string.replace( /^\D+/g, '');
}

// try sending a notification; it will fail if the registered channel is invalid
function trySend(string){
    if (sendChannel){
        sendChannel.send(string);
    }
}

// check if a name contains anything in the censor list
function isBadName(name){
    if (!name) {
        return false;
    }
    for (let bad in naughtyList){
        if (name.toLowerCase().includes(naughtyList[bad])){
            return naughtyList[bad];
        }
    }
    return false;
}

// load the naughty list file
function loadNaughtyList(){
    let myInterface = readline.createInterface({
        input: fs.createReadStream(NAUGHTY_LIST_FILE)
    });

    myInterface.on('line', function (line) {
        naughtyList.push(line);
    });
}

function reloadNaughtyList(channel){
    let myInterface = readline.createInterface({
        input: fs.createReadStream(NAUGHTY_LIST_FILE)
    });

    let tempList = [];

    myInterface.on('line', function (line) {
        tempList.push(line);
    });

    myInterface.on('close', () => {
        naughtyList = tempList;
        channel.send("Updated Naughty List");
    });
}

// run a check to see if members have naughty names at startup
function runNaughtyCheck(){
    let naughtyCount = 0;
    bot.guilds.forEach((guild) => {
        guild.members.forEach((member) => {
            // check for bad member nicknames
            let found = isBadName(member.nickname);
            if (found){
                trySend(`**ALERT!** Bad Nickname **${member.nickname}** -- detected **\"${found}\"**`);
                naughtyCount++;
                console.info("detected bad nickname of " + found);
            }

            // check for bad usernames
            let user = member.user;
            found = isBadName(user.username);
            if (found){
                trySend(`**ALERT!** Bad Username **${user.username}** -- detected **\"${found}\"**`);
                naughtyCount++;
                console.info("detected bad username of " + found);
            }
        });
    });
    if (naughtyCount === 1){
        trySend("***1*** *naughty name found*");
    }
    else{
        trySend("***" + naughtyCount + "*** *naughty names found*");
    }
};

// try to change the send channel
function attemptChannelChange(msg){
    let newValue = getNewChannelId(msg.content);
        let checkChannel = bot.channels.get(newValue);
        if (checkChannel){
            sendChannel = checkChannel;
            msg.channel.send("*Successfully changed message channel to* ***" + sendChannel.name + "***");
        }
        else {
            if (newValue === ""){
                msg.channel.send("*New channel id must be a number*");
            }
            else{
                msg.channel.send("***" + newValue + "*** *is not a valid channel id*");
            }
        }
}

// print the list of commands
function printHelpMessage(msg){
    msg.channel.send(
        "**List of commands:**\n" +
        "`!name-bot set-channel <channel id>` -- ***tells name-bot what channel to post alerts on;*** *<channel id> should be a number that can be found in Discord's developer mode (can be turned on in Advanced settings) by right clicking on a channel name*\n" +
        "`!name-bot check-names` -- ***tells name-bot to run a check for naughty names RIGHT NOW***\n" +
        "`!name-bot help` -- ***what you typed to see this message***" +
        "`!name-bot update` -- ***reloads the list of phrases to watch out for***"
    );
}