require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;
const DEFAULT_CHANNEL_ID = '847099887090925578';
const CHANNEL_COMMAND_STRING = "!name-bot set-channel";

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
    // change or set the channel to send notifications to
    if (msg.content.includes(CHANNEL_COMMAND_STRING)) {
        let newValue = getNewChannelId(msg.content);
        let checkChannel = bot.channels.get(newValue);
        if (checkChannel){
            sendChannel = checkChannel;
            msg.channel.send("Successfully changed message channel to " + sendChannel.name);
        }
        else {
            msg.channel.send(newValue + " is not a valid channel id");
        }
    } 
    
});

// listen for changes to the member (non-username)
bot.on('guildMemberUpdate', (oldMember, newMember) => {
    let found = isBadName(newMember.nickname);

    // only do something if the nickname changed and it's a bad nickname
    if (oldMember.nickname !== newMember.nickname && found){
        trySend(memberIdStringify(oldMember) + " has become " + memberIdStringify(newMember) + " -- detected \"" + found + "\"");
        console.info("detected bad change of " + found);    
    }
    else {
        console.info("detected change");    
    }
});

// listen for changes to the user
bot.on('userUpdate', (oldMember, newMember) => {
    let found = isBadName(newMember.username);

    // only do something if the username changed and it's a bad username
    if (oldMember.username !== newMember.username && found){
        trySend(oldMember.username + " has become " + newMember.username + " -- detected \"" + found + "\"");
        console.info("detected bad user change of " + found);
    }
    else {
        console.info("detected user change");
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