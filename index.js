"use strict";

const Alexa = require('alexa-sdk');

module.exports.handler = (event, context) => {
  const alexa = Alexa.handler(event, context);
  alexa.appId = APP_ID; // APP_ID is your skill id which can be found in the Amazon developer console where you create the skill.
  alexa.registerHandlers(handlers);
  alexa.execute();
};

const handlers = {
  'LaunchRequest': function (intent, session, response) {
    //todo: greet the user if an existing one
    this.response.speak('Hello Sir, what would you like to do?').listen();
    this.emit(':responseReady');
  },
  //where have I kept my {stuff}
  'FindItemIntent': function (intent, session, response) {
    
    const itemSlot = intent.slots.Item;
    let findItemName = "";
    
    if(itemSlot && itemSlot.value){
      findItemName = itemSlot.value.toLowerCase();
    }
    
    //call search function here that step by step searches for the item as we had decided at all cases
    let location = searchItem(findItemName)
    
    let speechOutput = {}, rePromptOutput = {};
    
    if (location) {
      speechOutput = {
        speech: findItemName + " is kept at " + location,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
      };
      response.tellWithCard(speechOutput, cardTitle, recipe);
    } else {
      let speech;
      if (findItemName) {
        speech = "I'm sorry, I currently do not know where" + findItemName + " is stored. What else can I help with?";
      } else {
        speech = "I'm sorry, I currently do not know its location. What else can I help with?";
      }
      speechOutput = {
        speech: speech,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
      };
      rePromptOutput = {
        speech: "What else can I help with?",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
      };
      response.ask(speechOutput, rePromptOutput);
    }
  },
  //I am storing my {stuff} in {location}
  'StoreItemIntent': function () {
  
    const itemSlot = intent.slots.Item;
    const locationSlot = intent.slots.Places;
    let storeItemName = "";
    let storeItemLocation = ""
  
    if(itemSlot && itemSlot.value && locationSlot && locationSlot.value){
      storeItemName = itemSlot.value.toLowerCase();
      storeItemLocation = locationSlot.value.toLowerCase();
      //call store function here that stores in ActiveList as well as MasterDb (we can implement concept of paging for updating masterDB)
      storeItem(storeItemName, storeItemLocation)
    }
    
    let speechOutput = {}, rePromptOutput = {};
  
    if (storeItemLocation && storeItemName) {
      
      //set speech according to what was not identified
      
      speechOutput = {
        speech: storeItemName + " has been stored at " + storeItemLocation,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
      };
      response.tellWithCard(speechOutput, cardTitle, recipe);
    } else {
      let speech;
      if (!findItemName) {
        speech = "I'm sorry, I currently do not know what to store" ;
      } else {
        speech = "I'm sorry, I currently do not know where to store. What else can I help with?";
      }
      speechOutput = {
        speech: speech,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
      };
      rePromptOutput = {
        speech: "What else can I help with?",
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
      };
      response.ask(speechOutput, rePromptOutput);
    }
  },
  //todo: to be decided
  'StoreEventItem': function () {
    this.response.speak('Hello World!');
    this.emit(':responseReady');
  },
  //todo: to be decided
  'ListEventItem': function () {
    this.response.speak('Hello World!');
    this.emit(':responseReady');
  }
};
